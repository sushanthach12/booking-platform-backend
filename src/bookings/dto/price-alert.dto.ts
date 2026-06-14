import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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
    example: 150.0,
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
