import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class PropertyListingDto {
  @ApiProperty({
    type: String,
    description: 'Property title',
    example: 'Property title',
    required: true,
  })
  @Transform(({ value }) => parseInt(value) || 1)
  @IsNumber()
  @IsNotEmpty()
  page: number;

  @ApiProperty({
    type: Number,
    description: 'Page size',
    example: 10,
    required: true,
  })
  @Transform(({ value }) => parseInt(value) || 10)
  @IsNumber()
  @IsNotEmpty()
  limit: number;
}
