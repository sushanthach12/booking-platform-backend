import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  BookingPaymentStatus,
  BookingStatus,
} from '../enums/booking-status.enum';

export class GetBookingsQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Property ID filter',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Tab shortcut: "upcoming" maps to pending/confirmed, "past" maps to completed/cancelled',
    enum: ['upcoming', 'past'],
    example: 'upcoming',
  })
  @IsString()
  @IsOptional()
  tab?: 'upcoming' | 'past';

  @ApiPropertyOptional({
    type: String,
    description: 'Booking status filter',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    type: String,
    description: 'Payment status filter',
    enum: BookingPaymentStatus,
    example: BookingPaymentStatus.SUCCEEDED,
  })
  @IsString()
  @IsEnum(BookingPaymentStatus)
  @IsOptional()
  paymentStatus?: BookingPaymentStatus;

  @ApiPropertyOptional({
    type: String,
    description: 'Start date filter (YYYY-MM-DD)',
    example: '2026-02-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'End date filter (YYYY-MM-DD)',
    example: '2026-02-28',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    type: Number,
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    type: String,
    description: 'Sort field',
    example: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    type: String,
    description: 'Sort order',
    example: 'desc',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class GetBookingQueryDto {
  @ApiProperty({
    type: String,
    description: 'Booking ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;
}
