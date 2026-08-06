import { EntityManager } from 'typeorm';
import { AvailabilityCalenderEntity } from '../../entities/availability-calendar.entity';

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
  bookingId?: string | null;
  price?: number | null;
  minNights?: number | null;
  maxNights?: number | null;
  note?: string | null;
  blockReason?: string | null;
}

export interface IFindBlockedDatesParams {
  propertyId: string;
  /** Only dates on/after this are considered — keeps the array from growing unbounded. */
  from: Date;
}

export interface IAvailabilityCalendarRepository {
  findByRange(
    params: IFindAvailabilityByRangeParams,
  ): Promise<AvailabilityCalenderEntity[]>;

  upsertMany(
    rows: IUpsertAvailabilityParams[],
    manager?: EntityManager,
  ): Promise<AvailabilityCalenderEntity[]>;

  /** Dates the calendar explicitly marks unavailable — sparse/negative model, so a missing row means available. */
  findBlockedDates(params: IFindBlockedDatesParams): Promise<Date[]>;
}
