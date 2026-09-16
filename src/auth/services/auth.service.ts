import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { EmailService } from '../../common/email/email.service';
import { IRedisService } from '../../common/redis';
import { REDIS_SERVICE } from '../../database/di/symbols';
import { EAuthProvider, EUserRole } from '../../users/enums/user.enum';
import { IUser } from '../../users/interfaces/user.interface';
import { UserService } from '../../users/services/user.service';
import { EOtpContext } from '../enums/auth.enum';
import {
  ILoginResponse,
  IOtpChallengeResponse,
  IPendingLogin,
  IPendingSignup,
  IRegisterRequest,
} from '../interfaces/auth.interface';
import { OtpService } from './otp.service';

const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 10;
  private googleClient?: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly otpService: OtpService,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<{
    userFound: boolean;
    user: IUser | null;
  }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return { userFound: false, user: null };
    }

    // Google-only accounts have no password — block password login with guidance.
    if (user.auth_provider === EAuthProvider.GOOGLE || !user.password) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please continue with Google.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { userFound: true, user: null };
    }

    return { userFound: true, user };
  }

  /**
   * Step 1 of signup: validate the request, then hold the (password-hashed)
   * payload in Redis behind an OTP. The account is only created once the
   * code is verified — see {@link verifyOtp}.
   */
  async register(data: IRegisterRequest): Promise<IOtpChallengeResponse> {
    const existing = await this.userService.findByEmail(data.payload.email);
    if (existing) {
      if (existing.auth_provider === EAuthProvider.GOOGLE) {
        throw new ConflictException(
          'An account with this email already exists. Please continue with Google.',
        );
      }
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(
      data.payload.password,
      this.BCRYPT_ROUNDS,
    );

    const pending: IPendingSignup = {
      email: data.payload.email,
      name: data.payload.name,
      hashedPassword,
      role: data.payload.userType ?? EUserRole.GUEST,
    };

    await this.otpService.issue(
      EOtpContext.SIGNUP,
      data.payload.email,
      data.payload.name,
      pending,
    );

    return {
      message: 'OTP sent successfully',
      otpRequired: true,
      email: data.payload.email,
    };
  }

  /**
   * Step 1 of login: validate credentials, then challenge with an OTP.
   * Tokens are only issued by {@link verifyOtp}.
   */
  async login(loginDto: {
    email: string;
    password: string;
  }): Promise<IOtpChallengeResponse> {
    const validated = await this.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!validated.userFound) {
      throw new UnauthorizedException(
        'Email does not exist. Please register first.',
      );
    }
    if (!validated.user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const pending: IPendingLogin = { userId: validated.user.id };
    this.otpService
      .issue(
        EOtpContext.LOGIN,
        validated.user.email,
        validated.user.name,
        pending,
      )
      .catch((error) => {
        this.logger.error(
          `Error issuing OTP for ${validated.user?.email} (${EOtpContext.LOGIN}): ${error}`,
        );
      });

    return {
      message: 'OTP sent successfully',
      otpRequired: true,
      email: validated.user.email,
    };
  }

  /**
   * Step 2 for both flows: verify the OTP and issue the session. For signup
   * this is also the moment the account is actually created.
   */
  async verifyOtp(
    context: EOtpContext,
    email: string,
    otp: string,
  ): Promise<ILoginResponse> {
    if (context === EOtpContext.SIGNUP) {
      const pending = await this.otpService.verify<IPendingSignup>(
        context,
        email,
        otp,
      );

      // Re-check: the email could have been claimed while the OTP was pending.
      const existing = await this.userService.findByEmail(pending.email);
      if (existing) {
        throw new ConflictException('Email already in use');
      }

      const newUser = await this.userService.create({
        email: pending.email,
        password: pending.hashedPassword,
        name: pending.name,
        role: pending.role,
      });
      this.logger.log(`User ${newUser.id} created after OTP verification`);

      return this.buildAuthResponse(newUser);
    }

    const pending = await this.otpService.verify<IPendingLogin>(
      context,
      email,
      otp,
    );
    const user = await this.userService.findById(pending.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.buildAuthResponse(user);
  }

  /** Re-send the OTP for a pending login/signup verification. */
  async resendOtp(
    context: EOtpContext,
    email: string,
  ): Promise<IOtpChallengeResponse> {
    await this.otpService.resend(context, email);
    return { message: 'OTP sent successfully', otpRequired: true, email };
  }

  private async buildAuthResponse(user: IUser): Promise<ILoginResponse> {
    const tokens = await this.generateTokens(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async googleLogin(idToken: string): Promise<ILoginResponse> {
    const profile = await this.verifyGoogleToken(idToken);

    const existing = await this.userService.findByEmail(profile.email);

    let user: IUser;
    if (existing) {
      // Email already registered with password — block, point them to that method.
      if (existing.auth_provider !== EAuthProvider.GOOGLE) {
        throw new ConflictException(
          'An account with this email already exists. Please sign in with your password.',
        );
      }
      user = existing;
    } else {
      user = await this.userService.create({
        email: profile.email,
        password: null,
        name: profile.name,
        role: EUserRole.GUEST,
        auth_provider: EAuthProvider.GOOGLE,
        google_id: profile.sub,
      });
      this.logger.log(`New Google user registered: ${user.id}`);
    }

    return this.buildAuthResponse(user);
  }

  async becomeHost(userId: string): Promise<ILoginResponse> {
    await this.userService.becomeHost(userId);

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Reissue tokens so the JWT carries the new host role (RolesGuard reads the
    // role from the token, not the database).
    return this.buildAuthResponse(user);
  }

  private async verifyGoogleToken(idToken: string): Promise<{
    email: string;
    name: string;
    sub: string;
  }> {
    const clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    if (!this.googleClient) {
      this.googleClient = new OAuth2Client(clientId);
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException(
        'Google account email is missing or unverified',
      );
    }

    return {
      email: payload.email,
      name: payload.name ?? payload.email,
      sub: payload.sub,
    };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string; role: string; jti?: string };
    try {
      payload = await this.jwtService.verifyAsync<{
        sub: string;
        role: string;
        jti?: string;
      }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check if the refresh token has been blacklisted (logged out)
    if (payload.jti) {
      const blacklisted = await this.redisService.exists(
        `blacklist:${payload.jti}`,
      );
      if (blacklisted) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }
    }

    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate: blacklist old refresh token JTI
    if (payload.jti) {
      const exp = (payload as { exp?: number }).exp;
      const ttlMs = exp ? exp * 1000 - Date.now() : 7 * 24 * 60 * 60 * 1000;
      await this.redisService.set(
        `blacklist:${payload.jti}`,
        '1',
        Math.max(ttlMs, 0),
      );
    }

    return this.generateTokens(user);
  }

  async logout(
    userId: string,
    accessToken?: string,
  ): Promise<{ message: string }> {
    if (accessToken) {
      try {
        const payload = await this.jwtService.verifyAsync<{
          sub: string;
          jti?: string;
          exp?: number;
        }>(accessToken, {
          secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        });
        if (payload.jti) {
          const ttlMs = payload.exp
            ? payload.exp * 1000 - Date.now()
            : 30 * 60 * 1000;
          await this.redisService.set(
            `blacklist:${payload.jti}`,
            '1',
            Math.max(ttlMs, 0),
          );
        }
      } catch {
        // Token already expired — nothing to blacklist
      }
    }

    this.logger.log(`User ${userId} logged out`);
    return { message: 'Logout successful' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);

    // Always return 200 to avoid email enumeration
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent' };
    }

    const token = randomUUID();
    await this.redisService.set(
      `pwd_reset:${token}`,
      user.id,
      PASSWORD_RESET_TTL_MS,
    );

    const resetUrl = `${this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'}/reset-password?token=${token}`;

    this.emailService
      .send({
        to: user.email,
        subject: 'Reset your Stayly password',
        html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
        <p><a href="${resetUrl}" style="background:#4F46E5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">Reset Password</a></p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      `,
      })
      .catch((error) => {
        this.logger.log('ERROR_SENDING_EMAIL', error.message);
      });

    this.logger.log(`Password reset email dispatched for user ${user.id}`);
    return { message: 'If that email exists, a reset link has been sent' };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const userId = await this.redisService.get(`pwd_reset:${token}`);
    if (!userId) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    await this.userService.updatePassword(userId, hashedPassword);

    // Invalidate the reset token
    await this.redisService.del(`pwd_reset:${token}`);

    this.logger.log(`Password reset for user ${userId}`);
    return { message: 'Password has been reset successfully' };
  }

  private async generateTokens(user: IUser): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const jti = randomUUID();
    const payload = {
      sub: user.id,
      role: user.role ?? EUserRole.GUEST,
      jti,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '30m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    return { accessToken, refreshToken, expiresIn: 30 * 60 };
  }
}
