import { AvailabilityCalenderEntity } from '../../entities/availablity-calender.entity';

export interface IFindAvailabilityByRangeParams {
  propertyId: string;
  roomId?: string | null;
  startDate: Date;
  endDate: Date;
}

export interface IUpsertAvailabilityParams {
  propertyId: string;
  roomId: string | null;
  date: Date;
  available: boolean;
  price?: number | null;
  minNights?: number | null;
  maxNights?: number | null;
  note?: string | null;
  blockReason?: string | null;
}

export interface IAvailabilityCalendarRepository {
  findByRange(
    params: IFindAvailabilityByRangeParams,
  ): Promise<AvailabilityCalenderEntity[]>;

  upsertMany(
    rows: IUpsertAvailabilityParams[],
  ): Promise<AvailabilityCalenderEntity[]>;
}
