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
import { Public } from '../../common/decorators/public.decorator';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Register user
   * POST /auth/register
   */
  @Public()
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
   * Register user alias (signup)
   * POST /auth/signup
   */
  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.OK)
  async signup(@Body() registerDto: RegisterDto) {
    return this.register(registerDto);
  }

  /**
   * Login user
   * POST /auth/login
   */
  @Public()
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
  @Public()
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
  @Public()
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
