import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { EUserRole } from '../../users/enums/user.enum';

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
