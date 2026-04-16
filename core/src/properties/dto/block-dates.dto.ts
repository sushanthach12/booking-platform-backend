import { IsDateString, IsOptional, IsString } from 'class-validator';

export class BlockDatesDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
