import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CheckoutPreviewDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @ApiPropertyOptional({
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
    example: '2026-06-01',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  checkInDate: Date;

  @ApiProperty({
    type: Date,
    description: 'Check-out date',
    example: '2026-06-05',
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
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  guestCount: number;
}
