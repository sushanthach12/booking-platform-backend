import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import type { ApiRequest } from '../../common/interfaces/request.interface';
import {
  GoogleAuthDto,
  LoginDto,
  RegisterDto,
  ResendOtpDto,
  VerifyOtpDto,
} from '../dto/auth.dto';
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
  @ApiOperation({
    summary: 'Start signup — sends an OTP, account not yet created',
  })
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
  @ApiOperation({
    summary: 'Start login — validates credentials and sends an OTP',
  })
  async login(@Body() loginDto: LoginDto) {
    this.logger.log('Login request received');
    const response = await this.authService.login(loginDto);
    return { data: response };
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify the OTP and issue tokens (creates the account for signup)',
  })
  async verifyOtp(@Body() body: VerifyOtpDto) {
    this.logger.log('OTP verification request received');
    const response = await this.authService.verifyOtp(
      body.context,
      body.email,
      body.otp,
    );
    return { data: response };
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-send the OTP for a pending login/signup' })
  async resendOtp(@Body() body: ResendOtpDto) {
    this.logger.log('OTP resend request received');
    const response = await this.authService.resendOtp(body.context, body.email);
    return { data: response };
  }

  @Public()
  @Post('social/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with a Google ID token' })
  async googleLogin(@Body() body: GoogleAuthDto) {
    this.logger.log('Google login request received');
    const response = await this.authService.googleLogin(body.idToken);
    return { data: response };
  }

  @Patch('become-host')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elevate current user to host and reissue tokens' })
  async becomeHost(@Request() req: ApiRequest) {
    const userId = req.user?.id ?? '';
    const response = await this.authService.becomeHost(userId);
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
