import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../enums/booking-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export class BookingResponseDto {
  @ApiProperty({
    type: String,
    description: 'Booking ID',
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
    description: 'Guest ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  guestId: string;

  @ApiProperty({
    type: String,
    description: 'Host ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  hostId: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Room ID (for multi-room properties)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  roomId?: string;

  @ApiProperty({
    type: Date,
    description: 'Check-in date',
    example: '2026-02-01T00:00:00.000Z',
  })
  checkInDate: Date;

  @ApiProperty({
    type: Date,
    description: 'Check-out date',
    example: '2026-02-03T00:00:00.000Z',
  })
  checkOutDate: Date;

  @ApiProperty({
    type: Number,
    description: 'Number of nights',
    example: 2,
  })
  numberOfNights: number;

  @ApiProperty({
    type: Number,
    description: 'Total price',
    example: 200.00,
  })
  totalPrice: number;

  @ApiProperty({
    type: String,
    description: 'Currency',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    type: String,
    description: 'Booking status',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @ApiProperty({
    type: String,
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCEEDED,
  })
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({
    type: String,
    description: 'Payment intent ID',
    example: 'pi_1234567890',
  })
  paymentIntentId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Special requests',
    example: 'Early check-in requested',
  })
  specialRequests?: string;

  @ApiProperty({
    type: Number,
    description: 'Number of guests',
    example: 2,
  })
  guestCount: number;

  @ApiPropertyOptional({
    type: String,
    description: 'Cancellation reason',
    example: 'Guest cancelled due to emergency',
  })
  cancellationReason?: string;

  @ApiPropertyOptional({
    type: Date,
    description: 'Cancellation date',
    example: '2026-01-15T10:30:00.000Z',
  })
  cancelledAt?: Date;

  @ApiPropertyOptional({
    type: Date,
    description: 'Confirmation date',
    example: '2026-01-15T10:30:00.000Z',
  })
  confirmedAt?: Date;

  @ApiPropertyOptional({
    type: Date,
    description: 'Completion date',
    example: '2026-02-03T10:00:00.000Z',
  })
  completedAt?: Date;

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
