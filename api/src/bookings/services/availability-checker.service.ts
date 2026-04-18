import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { AvailabilityCache, IRedisService } from '../../common/redis';
import {
  AVAILABILITY_CALENDAR_REPOSITORY,
  REDIS_SERVICE,
} from '../../database';
import { IAvailabilityCalendarRepository } from '../../properties/repositories/interfaces/availability-calendar.repository.interface';
import type {
  IAvailabilityCheckParams,
  IAvailabilityChecker,
} from '../interfaces/booking-service.interface';

const AVAILABILITY_CACHE_TTL_MS = 300_000; // 5 minutes
const UNAVAILABLE_MESSAGE = 'Property is not available for the selected dates';

@Injectable()
export class AvailabilityCheckerService implements IAvailabilityChecker {
  constructor(
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisService,
    @Inject(AVAILABILITY_CALENDAR_REPOSITORY)
    private readonly availabilityCalendarRepository: IAvailabilityCalendarRepository,
  ) {}

  async checkAvailable(params: IAvailabilityCheckParams): Promise<void> {
    const { propertyId, roomId, checkInDate, checkOutDate } = params;
    const datesInRange = this.getDatesInRange(checkInDate, checkOutDate);

    const availabilityCacheKeys = datesInRange.map(
      (d) =>
        `property:${propertyId}:availability:${d.toISOString().split('T')[0]}`,
    );

    const cachedValues = await this.redisService.getMany(availabilityCacheKeys);

    for (let i = 0; i < cachedValues.length; i++) {
      const raw = cachedValues[i];
      if (raw) {
        const availability: AvailabilityCache = JSON.parse(raw);
        if (!availability.available) {
          throw new ConflictException(UNAVAILABLE_MESSAGE);
        }
      }
    }

    const calendarRows = await this.availabilityCalendarRepository.findByRange({
      propertyId,
      roomId,
      startDate: checkInDate,
      endDate: checkOutDate,
    });

    const calendarByDate = new Map<string, { available: boolean }>(
      calendarRows.map((r) => [
        r.date instanceof Date
          ? r.date.toISOString().split('T')[0]
          : String(r.date).split('T')[0],
        { available: r.available },
      ]),
    );

    for (const d of datesInRange) {
      const key = d.toISOString().split('T')[0];
      const row = calendarByDate.get(key);
      if (row && !row.available) {
        throw new ConflictException(UNAVAILABLE_MESSAGE);
      }
    }
  }

  async setAvailabilityCache(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
    available: boolean,
    price: number = 0,
  ): Promise<void> {
    const dates = this.getDatesInRange(checkInDate, checkOutDate);
    const value: AvailabilityCache = { available, price };
    const serialized = JSON.stringify(value);

    await Promise.all(
      dates.map((d) => {
        const key = `property:${propertyId}:availability:${d.toISOString().split('T')[0]}`;
        return this.redisService.set(
          key,
          serialized,
          AVAILABILITY_CACHE_TTL_MS,
        );
      }),
    );
  }

  async invalidateAvailabilityCache(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<void> {
    const dates = this.getDatesInRange(checkInDate, checkOutDate);
    const keys = dates.map(
      (d) =>
        `property:${propertyId}:availability:${d.toISOString().split('T')[0]}`,
    );
    await this.redisService.delMany(keys);
  }

  getDatesInRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }
}
