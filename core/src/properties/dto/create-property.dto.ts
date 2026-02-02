import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePropertyDto {
  @ApiProperty({
    type: String,
    description: 'Property title',
    example: 'Property title',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  title: string;
}
