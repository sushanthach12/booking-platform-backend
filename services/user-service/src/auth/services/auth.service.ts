import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../users/enums/user.enum';
import { IUser } from '../../users/interfaces/user.interface';
import { UserService } from '../../users/services/user.service';
import {
  IRegisterRequest,
  IRegisterResponse,
} from '../interfaces/auth.interface';

@Injectable()
export class AuthService {
  private readonly BCRYPT_ROUNDS = 10;

  constructor(private readonly userService: UserService) {}

  async validateUser(email: string, password: string): Promise<IUser> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  /**
   * Register a new user
   * @param registerDto - User registration data
   * @returns User data with access and refresh tokens
   */
  async register(data: IRegisterRequest): Promise<IRegisterResponse> {
    // 1. Check if user already exists
    const user = await this.userService.findByEmail(data.payload.email);

    if (user) {
      throw new BadRequestException('Email already in use');
    }

    // Use optimized bcrypt rounds for better performance
    const hashedPassword = await bcrypt.hash(
      data.payload.password,
      this.BCRYPT_ROUNDS,
    );

    // 2. Create user in database
    const newUser = await this.userService.create({
      email: data.payload.email,
      password: hashedPassword,
      name: data.payload.name,
      role: UserRole.GUEST,
    });

    // 3. Generate JWT tokens
    const tokens = this.generateTokens(newUser.id);

    return {
      user: newUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Authenticate user and generate tokens
   * @param loginDto - User login credentials
   * @returns User data with access and refresh tokens
   */
  async login(loginDto: { email: string; password: string }): Promise<{
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      refreshToken: 'refresh-token',
      accessToken: 'access-token',
    };
  }

  generateTokens(userId: string): {
    accessToken: string;
    refreshToken: string;
  } {
    console.log(`Generating tokens for user with ID: ${userId}`);
    return {
      refreshToken: 'refresh-token',
      accessToken: 'access-token',
    };
  }

  /**
   * Logout user and invalidate tokens
   * @param userId - User ID
   * @returns Success message
   */
  async logout(userId: string): Promise<{ message: string }> {
    // TODO: Implement logout logic
    // 1. Invalidate refresh token (add to blacklist)
    // 2. Clear any session data
    // 3. Return success message

    console.log(`Logging out user with ID: ${userId}`);
    return Promise.resolve({ message: 'Logout successful' });
  }

  /**
   * Initiate password reset process
   * @param email - User email address
   * @returns Success message
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    // TODO: Implement forgot password logic
    // 1. Find user by email
    // 2. Generate reset token
    // 3. Send reset email
    // 4. Return success message

    console.log(`Sending password reset email to: ${email}`);
    return Promise.resolve({ message: 'Password reset email sent' });
  }

  /**
   * Reset password using reset token
   * @param token - Password reset token
   * @param newPassword - New password
   * @returns Success message
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // TODO: Implement password reset logic
    // 1. Verify reset token
    // 2. Find user by token
    // 3. Hash new password
    // 4. Update user password
    // 5. Invalidate reset token
    // 6. Return success message

    console.log(
      `Resetting password for token: ${token} with new password: ${newPassword}`,
    );
    return Promise.resolve({ message: 'Password has been reset successfully' });
  }
}
