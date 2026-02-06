import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreatePriceAlertDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({
    type: Number,
    description: 'Target price for alert',
    example: 150.00,
  })
  @IsNumber()
  @IsNotEmpty()
  targetPrice: number;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Enable auto-booking when price drops',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  autoBook?: boolean;
}

export class PriceAlertResponseDto {
  @ApiProperty({
    type: String,
    description: 'Price alert ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  propertyId: string;

  @ApiProperty({
    type: String,
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    type: Number,
    description: 'Target price',
    example: 150.00,
  })
  targetPrice: number;

  @ApiPropertyOptional({
    type: Number,
    description: 'Current price when alert was created',
    example: 200.00,
  })
  currentPrice?: number;

  @ApiProperty({
    type: Boolean,
    description: 'Auto-booking enabled',
    example: false,
  })
  autoBook: boolean;

  @ApiPropertyOptional({
    type: Date,
    description: 'When the alert was triggered',
    example: '2026-01-15T10:30:00.000Z',
  })
  notifiedAt?: Date;

  @ApiProperty({
    type: String,
    description: 'Alert status',
    example: 'active',
  })
  status: string;

  @ApiProperty({
    type: Date,
    description: 'Creation date',
    example: '2026-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: Date,
    description: 'Last update date',
    example: '2026-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}
