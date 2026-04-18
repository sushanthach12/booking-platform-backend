import { IsEnum } from 'class-validator';

export enum EBookingStatusUpdate {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
}

export class UpdateBookingStatusDto {
  @IsEnum(EBookingStatusUpdate)
  status: EBookingStatusUpdate;
}
