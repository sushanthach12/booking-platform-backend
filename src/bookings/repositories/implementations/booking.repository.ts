import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  BaseBookingOptions,
  FindBookingsOptions,
  PaginatedBookingsResult,
  PropertyBookingOptions,
} from '../../dto/booking-options.dto';
import {
  BookingEntity,
  BookingPriceItemEntity,
  BookingSnapshotEntity,
} from '../../entities';
import { BookingStatus } from '../../enums';
import { IBookingRepository } from '../interfaces/booking.repository.interface';

@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly repository: Repository<BookingEntity>,
    @InjectRepository(BookingSnapshotEntity)
    private readonly snapshotRepository: Repository<BookingSnapshotEntity>,
    @InjectRepository(BookingPriceItemEntity)
    private readonly priceItemRepository: Repository<BookingPriceItemEntity>,
  ) {}

  async create(booking: Partial<BookingEntity>): Promise<BookingEntity> {
    const newBooking = this.repository.create(booking);
    return await this.repository.save(newBooking);
  }

  async findById(id: string): Promise<BookingEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByIdWithLock(id: string): Promise<BookingEntity | null> {
    return await this.repository
      .createQueryBuilder('booking')
      .where('booking.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
  }

  async update(
    id: string,
    data: Partial<BookingEntity>,
  ): Promise<BookingEntity> {
    const { snapshot: _snapshot, ...updateData } = data;
    await this.repository.update(id, updateData);
    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findByGuestId(
    guestId: string,
    options?: BaseBookingOptions,
  ): Promise<BookingEntity[]> {
    const query = this.repository
      .createQueryBuilder('booking')
      .where('booking.guestId = :guestId', { guestId });

    if (options?.status) {
      query.andWhere('booking.status = :status', { status: options.status });
    }

    if (options?.paymentStatus) {
      query.andWhere('booking.paymentStatus = :paymentStatus', {
        paymentStatus: options.paymentStatus,
      });
    }

    query.orderBy('booking.createdAt', 'DESC');

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return await query.getMany();
  }

  async findByHostId(
    hostId: string,
    options?: BaseBookingOptions,
  ): Promise<BookingEntity[]> {
    const query = this.repository
      .createQueryBuilder('booking')
      .where('booking.hostId = :hostId', { hostId });

    if (options?.status) {
      query.andWhere('booking.status = :status', { status: options.status });
    }

    if (options?.paymentStatus) {
      query.andWhere('booking.paymentStatus = :paymentStatus', {
        paymentStatus: options.paymentStatus,
      });
    }

    query.orderBy('booking.createdAt', 'DESC');

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return await query.getMany();
  }

  async findByPropertyId(
    propertyId: string,
    options?: PropertyBookingOptions,
  ): Promise<BookingEntity[]> {
    const query = this.repository
      .createQueryBuilder('booking')
      .where('booking.propertyId = :propertyId', { propertyId });

    if (options?.status) {
      query.andWhere('booking.status = :status', { status: options.status });
    }

    if (options?.paymentStatus) {
      query.andWhere('booking.paymentStatus = :paymentStatus', {
        paymentStatus: options.paymentStatus,
      });
    }

    if (options?.startDate) {
      query.andWhere('booking.checkInDate >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      query.andWhere('booking.checkOutDate <= :endDate', {
        endDate: options.endDate,
      });
    }

    query.orderBy('booking.createdAt', 'DESC');

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return await query.getMany();
  }

  async findOverlappingBookings(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
    excludeBookingId?: string,
  ): Promise<BookingEntity[]> {
    const query = this.repository
      .createQueryBuilder('booking')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
      })
      .andWhere(
        '(booking.checkInDate < :checkOutDate AND booking.checkOutDate > :checkInDate)',
        { checkInDate, checkOutDate },
      );

    if (excludeBookingId) {
      query.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }

    return await query.getMany();
  }

  async findOverlappingBookingsWithLock(
    manager: EntityManager,
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<BookingEntity[]> {
    return await manager
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      .setLock('pessimistic_write')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
      })
      .andWhere(
        '(booking.checkInDate < :checkOutDate AND booking.checkOutDate > :checkInDate)',
        { checkInDate, checkOutDate },
      )
      .getMany();
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<BookingEntity | null> {
    return await this.repository.findOne({
      where: { idempotencyKey },
    });
  }

  async findByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<BookingEntity | null> {
    return await this.repository.findOne({
      where: { paymentIntentId },
    });
  }

  async findByPaymentTransactionId(
    paymentTransactionId: string,
  ): Promise<BookingEntity | null> {
    return await this.repository.findOne({
      where: { paymentTransactionId },
    });
  }

  async findBookingsInDateRange(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    status?: BookingStatus[],
  ): Promise<BookingEntity[]> {
    const query = this.repository
      .createQueryBuilder('booking')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere(
        '(booking.checkInDate <= :endDate AND booking.checkOutDate >= :startDate)',
        { startDate, endDate },
      );

    if (status && status.length > 0) {
      query.andWhere('booking.status IN (:...status)', { status });
    }

    return await query.getMany();
  }

  async countByGuestId(
    guestId: string,
    status?: BookingStatus,
  ): Promise<number> {
    const query = this.repository
      .createQueryBuilder('booking')
      .where('booking.guestId = :guestId', { guestId });

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    return await query.getCount();
  }

  async countByHostId(hostId: string, status?: BookingStatus): Promise<number> {
    const query = this.repository
      .createQueryBuilder('booking')
      .where('booking.hostId = :hostId', { hostId });

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    return await query.getCount();
  }

  async countByPropertyId(
    propertyId: string,
    status?: BookingStatus,
  ): Promise<number> {
    const query = this.repository
      .createQueryBuilder('booking')
      .where('booking.propertyId = :propertyId', { propertyId });

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    return await query.getCount();
  }

  async countBookingsCreatedInMonth(
    year: number,
    month: number,
  ): Promise<number> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return await this.repository
      .createQueryBuilder('booking')
      .where('booking.createdAt >= :start', { start })
      .andWhere('booking.createdAt < :end', { end })
      .getCount();
  }

  async findWithPagination(
    options: FindBookingsOptions,
  ): Promise<PaginatedBookingsResult> {
    const query = this.repository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.snapshot', 'snapshot');

    if (options.guestId) {
      query.andWhere('booking.guestId = :guestId', {
        guestId: options.guestId,
      });
    }

    if (options.hostId) {
      query.andWhere('booking.hostId = :hostId', { hostId: options.hostId });
    }

    if (options.propertyId) {
      query.andWhere('booking.propertyId = :propertyId', {
        propertyId: options.propertyId,
      });
    }

    if (options.statuses && options.statuses.length > 0) {
      query.andWhere('booking.status IN (:...statuses)', {
        statuses: options.statuses,
      });
    } else if (options.status) {
      query.andWhere('booking.status = :status', { status: options.status });
    }

    if (options.paymentStatus) {
      query.andWhere('booking.paymentStatus = :paymentStatus', {
        paymentStatus: options.paymentStatus,
      });
    }

    // Overlap semantics: return any stay active within [startDate, endDate],
    // including multi-day stays that cross the window edges.
    if (options.startDate) {
      query.andWhere('booking.checkOutDate >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options.endDate) {
      query.andWhere('booking.checkInDate <= :endDate', {
        endDate: options.endDate,
      });
    }

    // Set sorting
    const sortField = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    query.orderBy(
      `booking.${sortField}`,
      sortOrder.toUpperCase() as 'ASC' | 'DESC',
    );

    // Get total count
    const total = await query.getCount();

    // Apply pagination
    const offset = (options.page - 1) * options.limit;
    query.skip(offset).take(options.limit);

    const bookings = await query.getMany();

    return {
      bookings,
      total,
      page: options.page,
      limit: options.limit,
    };
  }

  async getGuestSummary(guestId: string): Promise<{
    upcomingCount: number;
    pastCount: number;
    totalSpent: number;
    currency: string;
    uniqueLocations: number;
  }> {
    const rows: Array<{
      status: string;
      spent: string;
      cnt: string;
      locs: string;
      currency: string;
    }> = await this.repository
      .createQueryBuilder('booking')
      .leftJoin('booking.snapshot', 'snapshot')
      .select('booking.status', 'status')
      .addSelect('SUM(booking.grand_total)', 'spent')
      .addSelect('COUNT(booking.id)', 'cnt')
      .addSelect('COUNT(DISTINCT snapshot.location_label)', 'locs')
      .addSelect('MAX(booking.currency)', 'currency')
      .where('booking.guestId = :guestId', { guestId })
      .groupBy('booking.status')
      .getRawMany();

    const UPCOMING = new Set(['pending', 'confirmed']);
    const PAST = new Set(['completed', 'cancelled']);
    const SPENT_IN = new Set(['confirmed', 'completed']);

    let upcomingCount = 0;
    let pastCount = 0;
    let totalSpent = 0;
    let uniqueLocations = 0;
    let currency = 'USD';

    for (const row of rows) {
      const cnt = Number(row.cnt);
      const spent = Number(row.spent ?? 0);
      const locs = Number(row.locs ?? 0);
      if (UPCOMING.has(row.status)) upcomingCount += cnt;
      if (PAST.has(row.status)) pastCount += cnt;
      if (SPENT_IN.has(row.status)) totalSpent += spent;
      if (locs > uniqueLocations) uniqueLocations = locs;
      if (row.currency) currency = row.currency;
    }

    return { upcomingCount, pastCount, totalSpent, currency, uniqueLocations };
  }

  async findSnapshotByBookingId(
    bookingId: string,
  ): Promise<BookingSnapshotEntity | null> {
    return await this.snapshotRepository.findOne({
      where: { bookingId },
    });
  }

  async findPriceItemsByBookingId(
    bookingId: string,
  ): Promise<BookingPriceItemEntity[]> {
    return await this.priceItemRepository.find({
      where: { bookingId },
      order: { type: 'ASC' },
    });
  }
}
