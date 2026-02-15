import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AvailabilityCalenderEntity } from '../../entities/availablity-calender.entity';
import {
  IAvailabilityCalendarRepository,
  IFindAvailabilityByRangeParams,
  IUpsertAvailabilityParams,
} from '../interfaces/availability-calendar.repository.interface';

@Injectable()
export class AvailabilityCalendarRepository implements IAvailabilityCalendarRepository {
  constructor(
    @InjectRepository(AvailabilityCalenderEntity)
    private readonly repository: Repository<AvailabilityCalenderEntity>,
  ) {}

  async findByRange(
    params: IFindAvailabilityByRangeParams,
  ): Promise<AvailabilityCalenderEntity[]> {
    const qb = this.repository
      .createQueryBuilder('a')
      .where('a.propertyId = :propertyId', { propertyId: params.propertyId })
      .andWhere('a.date >= :startDate', { startDate: params.startDate })
      .andWhere('a.date <= :endDate', { endDate: params.endDate })
      .orderBy('a.date', 'ASC');

    if (params.roomId !== undefined && params.roomId !== null) {
      qb.andWhere('a.roomId = :roomId', { roomId: params.roomId });
    } else {
      qb.andWhere('a.roomId IS NULL');
    }

    return qb.getMany();
  }

  async upsertMany(
    rows: IUpsertAvailabilityParams[],
  ): Promise<AvailabilityCalenderEntity[]> {
    if (rows.length === 0) return [];

    const saved: AvailabilityCalenderEntity[] = [];

    for (const row of rows) {
      const existing = await this.repository.findOne({
        where: {
          propertyId: row.propertyId,
          date: row.date,
          roomId: row.roomId === null ? IsNull() : row.roomId,
        },
      });

      const payload: Partial<AvailabilityCalenderEntity> = {
        propertyId: row.propertyId,
        roomId: row.roomId,
        date: row.date,
        available: row.available,
        price: row.price ?? null,
        minNights: row.minNights ?? null,
        maxNights: row.maxNights ?? null,
        note: row.note ?? null,
        blockReason: row.blockReason ?? null,
      };

      if (existing) {
        Object.assign(existing, payload);
        saved.push(await this.repository.save(existing));
      } else {
        const created = this.repository.create(payload);
        saved.push(await this.repository.save(created));
      }
    }

    return saved;
  }
}
