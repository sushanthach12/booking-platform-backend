import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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
  async register(@Res() res: Response, @Body() registerDto: RegisterDto) {
    this.logger.log(`Register request received for email`);

    const response = await this.authService.register({
      payload: {
        email: registerDto.email,
        password: registerDto.password,
        name: registerDto.name,
      },
    });

    return res.status(HttpStatus.OK).json({ data: response });
  }

  /**
   * Login user
   * POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Res() res: Response, @Body() loginDto: LoginDto) {
    this.logger.log(`Login request received for email`);

    const response = await this.authService.login(loginDto);

    return res.status(HttpStatus.OK).json({ data: response });
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
    @Res() res: Response,
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
