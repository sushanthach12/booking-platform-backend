import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePropertyAvailabilityQueryDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
  })
  @IsString()
  @IsNotEmpty()
  propertyId: string;
}

export class CreatePropertyAvailabilityDto {
  @ApiProperty({
    type: String,
    description: 'Room ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  roomId: string;

  @ApiProperty({
    type: String,
    description: 'Start date',
    example: '2026-01-01',
  })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    type: String,
    description: 'End date',
    example: '2026-01-02',
  })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    type: Boolean,
    description: 'Available',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  available: boolean;

  @ApiPropertyOptional({
    type: Number,
    description: 'Price',
    example: 100,
  })
  @IsNumber()
  @IsOptional()
  price: number;

  @ApiPropertyOptional({
    type: Number,
    description: 'Min nights',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  minNights: number;

  @ApiPropertyOptional({
    type: Number,
    description: 'Max nights',
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  maxNights: number;

  @ApiPropertyOptional({
    type: String,
    description: 'Block reason',
    example: 'Maintenance',
  })
  @IsString()
  @IsOptional()
  blockReason: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Note',
    example: 'Holiday pricing',
  })
  @IsString()
  @IsOptional()
  note: string;
}
