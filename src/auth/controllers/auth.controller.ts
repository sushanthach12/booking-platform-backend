import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequestUser } from '../../jwt/types/jwt.types';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login user
   * POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body()
    loginDto: {
      email: string;
      password: string;
    },
  ) {
    return this.authService.login(loginDto);
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body()
    refreshTokenDto: {
      refreshToken: string;
    },
  ) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.id);
  }

  /**
   * Request password reset
   * POST /auth/forgot-password
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body()
    forgotPasswordDto: {
      email: string;
    },
  ) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  /**
   * Reset password with token
   * POST /auth/reset-password
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body()
    resetPasswordDto: {
      token: string;
      newPassword: string;
    },
  ) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
}
