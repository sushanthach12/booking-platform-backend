import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({
    type: String,
    description: 'Room ID (optional for multi-room properties)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  roomId?: string;

  @ApiProperty({
    type: Date,
    description: 'Check-in date',
    example: '2026-02-01',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  checkInDate: Date;

  @ApiProperty({
    type: Date,
    description: 'Check-out date',
    example: '2026-02-03',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  checkOutDate: Date;

  @ApiProperty({
    type: Number,
    description: 'Number of guests',
    example: 2,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  guestCount: number;

  @ApiPropertyOptional({
    type: String,
    description: 'Special requests',
    example: 'Early check-in requested',
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  specialRequests?: string;

  @ApiProperty({
    type: String,
    description: 'Idempotency key to prevent duplicate bookings',
    example: 'unique-booking-key-123',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Expected total price (for validation)',
    example: 200.00,
  })
  @IsNumber()
  @IsOptional()
  expectedTotalPrice?: number;

  @ApiPropertyOptional({
    type: String,
    description: 'Guest email for payment (from auth when available)',
  })
  @IsString()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Guest name for payment (from auth when available)',
  })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Guest phone for payment (from auth when available)',
  })
  @IsString()
  @IsOptional()
  customerPhone?: string;
}
