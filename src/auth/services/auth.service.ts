import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { EmailService } from '../../common/email/email.service';
import { IRedisService } from '../../common/redis';
import { REDIS_SERVICE } from '../../database/di/symbols';
import { EUserRole } from '../../users/enums/user.enum';
import { IUser } from '../../users/interfaces/user.interface';
import { UserService } from '../../users/services/user.service';
import {
  IRegisterRequest,
  IRegisterResponse,
} from '../interfaces/auth.interface';

const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 10;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
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

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { userFound: true, user: null };
    }

    return { userFound: true, user };
  }

  async register(data: IRegisterRequest): Promise<IRegisterResponse> {
    const existing = await this.userService.findByEmail(data.payload.email);
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(
      data.payload.password,
      this.BCRYPT_ROUNDS,
    );

    const newUser = await this.userService.create({
      email: data.payload.email,
      password: hashedPassword,
      name: data.payload.name,
      role: data.payload.userType ?? EUserRole.GUEST,
    });

    const tokens = await this.generateTokens(newUser);

    return {
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(loginDto: { email: string; password: string }): Promise<{
    user: { id: string; email: string; name: string; role: string };
    accessToken: string;
    refreshToken: string;
  }> {
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

    const tokens = await this.generateTokens(validated.user);

    return {
      user: {
        id: validated.user.id,
        email: validated.user.email,
        name: validated.user.name,
        role: validated.user.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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

    await this.emailService.send({
      to: user.email,
      subject: 'Reset your Stayly password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
        <p><a href="${resetUrl}" style="background:#4F46E5;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">Reset Password</a></p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      `,
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
