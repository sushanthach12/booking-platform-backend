import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from '../dto/auth.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Register user
   * POST /auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`Register request received for email`);

    const response = await this.authService.register({
      payload: {
        email: registerDto.email,
        password: registerDto.password,
        name: registerDto.name,
        userType: registerDto.userType,
      },
    });

    return { data: response };
  }

  /**
   * Login user
   * POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login request received for email`);

    const response = await this.authService.login(loginDto);

    return { data: response };
  }

  /**
   * Request password reset
   * POST /auth/forgot-password
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: { email: string }) {
    const response = await this.authService.forgotPassword(
      forgotPasswordDto.email,
    );

    return { data: response };
  }

  /**
   * Reset password with token
   * POST /auth/reset-password
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: { token: string; newPassword: string },
  ) {
    const response = await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return { data: response };
  }
}
