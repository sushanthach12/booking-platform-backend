import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { EUserRole } from '../../users/enums/user.enum';
import { EOtpContext } from '../enums/auth.enum';

export class LoginDto {
  @ApiProperty({
    type: String,
    description: 'User email',
    example: 'test@example.com',
    required: true,
  })
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    type: String,
    description: 'User password',
    example: 'password',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    type: String,
    description: 'User type',
    example: 'host',
    required: true,
  })
  @IsString()
  @IsEnum(EUserRole)
  @IsOptional()
  userType: EUserRole;
}

export class RegisterDto extends LoginDto {
  @ApiProperty({
    type: String,
    description: 'User name',
    example: 'John Doe',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class ResendOtpDto {
  @ApiProperty({
    type: String,
    description: 'Email the pending OTP verification belongs to',
    example: 'test@example.com',
    required: true,
  })
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    enum: EOtpContext,
    description: 'Which flow the OTP belongs to',
    example: EOtpContext.LOGIN,
    required: true,
  })
  @IsEnum(EOtpContext)
  context: EOtpContext;
}

export class VerifyOtpDto extends ResendOtpDto {
  @ApiProperty({
    type: String,
    description: '6-digit verification code from the email',
    example: '482913',
    required: true,
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit code' })
  otp: string;
}

export class GoogleAuthDto {
  @ApiProperty({
    type: String,
    description:
      'Google ID token (credential) returned by the Google Sign-In button',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
