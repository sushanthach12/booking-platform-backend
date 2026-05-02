import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import type { ApiRequest } from '../../common/interfaces/request.interface';
import { LoginDto, RegisterDto } from '../dto/auth.dto';
import { AuthService } from '../services/auth.service';

class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log('Register request received');
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

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a new user (alias)' })
  async signup(@Body() registerDto: RegisterDto) {
    return this.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() loginDto: LoginDto) {
    this.logger.log('Login request received');
    const response = await this.authService.login(loginDto);
    return { data: response };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate access token' })
  async logout(@Request() req: ApiRequest) {
    const userId = req.user?.id ?? '';
    const authHeader = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    const response = await this.authService.logout(userId, token);
    return { data: response };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() body: RefreshTokenDto) {
    const response = await this.authService.refreshToken(body.refreshToken);
    return { data: response };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const response = await this.authService.forgotPassword(body.email);
    return { data: response };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    const response = await this.authService.resetPassword(
      body.token,
      body.newPassword,
    );
    return { data: response };
  }
}
