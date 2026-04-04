import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

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

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method selected by the guest',
    example: PaymentMethod.ONLINE,
    default: PaymentMethod.ONLINE,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    type: String,
    description:
      'Signed quote token from POST /bookings/checkout/preview (10-min TTL). ' +
      'Providing this validates the expected price; if expired, returns 400.',
  })
  @IsString()
  @IsOptional()
  quoteToken?: string;
}

export class CheckBookingAvailabilityDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

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

  @ApiPropertyOptional({
    type: String,
    description: 'Room ID (optional for multi-room properties)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  roomId?: string;
}
