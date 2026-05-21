import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum EBookingStatusUpdate {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
}

export class UpdateBookingStatusDto {
  @IsEnum(EBookingStatusUpdate)
  status: EBookingStatusUpdate;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
