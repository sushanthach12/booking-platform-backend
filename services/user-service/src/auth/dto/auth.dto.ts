import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

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
