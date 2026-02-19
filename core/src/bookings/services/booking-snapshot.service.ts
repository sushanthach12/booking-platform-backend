import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BOOKING_REPOSITORY } from '../../database';
import { PropertyService } from '../../properties/services/property.service';
import {
  IBookingFinancialSummary,
  IBookingPriceItem,
  IBookingSnapshot,
  SnapshotAddress,
} from '../interfaces/booking.interface';
import { BookingPriceItemEntity, BookingSnapshotEntity } from '../entities';
import {
  BookingPriceItemCalculationMode,
  BookingPriceItemType,
} from '../enums/booking-price-item.enum';
import { IBookingRepository } from '../repositories';

@Injectable()
export class BookingSnapshotService {
  private readonly logger = new Logger(BookingSnapshotService.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    @InjectRepository(BookingSnapshotEntity)
    private readonly snapshotRepository: Repository<BookingSnapshotEntity>,
    @InjectRepository(BookingPriceItemEntity)
    private readonly priceItemRepository: Repository<BookingPriceItemEntity>,
    private readonly propertyService: PropertyService,
  ) {}

  async createForBooking(bookingId: string): Promise<{
    snapshot: IBookingSnapshot;
    priceItems: IBookingPriceItem[];
  }> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const existingSnapshot =
      await this.bookingRepository.findSnapshotByBookingId(bookingId);
    if (existingSnapshot) {
      this.logger.debug(
        `Snapshot already exists for booking ${bookingId}, skipping`,
      );
      const priceItems =
        await this.bookingRepository.findPriceItemsByBookingId(bookingId);
      return {
        snapshot: this.toSnapshotResult(existingSnapshot),
        priceItems: priceItems.map((i) => this.toPriceItemResult(i)),
      };
    }

    const propertyDetails = await this.propertyService.getPropertyDetails({
      params: {
        propertyId: booking.propertyId,
        includeRelations: true,
      },
    });

    const locationLabel = this.buildLocationLabel(propertyDetails.location);
    const propertyAddress = this.toSnapshotAddress(propertyDetails.location);
    const heroImage = propertyDetails.images?.[0]?.url;
    const roomName =
      booking.roomId && propertyDetails.rooms?.length
        ? propertyDetails.rooms.find((r) => r.id === booking.roomId)?.name
        : undefined;
    const cancellationPolicy: Record<string, unknown> =
      propertyDetails.policies?.cancellationPolicy != null
        ? { type: propertyDetails.policies.cancellationPolicy }
        : {};

    const snapshot = this.snapshotRepository.create({
      bookingId,
      propertyTitle: propertyDetails.title ?? 'Property',
      propertyImage: heroImage ?? undefined,
      locationLabel: locationLabel || '—',
      propertyAddress: propertyAddress ?? undefined,
      roomName,
      cancellationPolicy,
      houseRules: undefined,
    });
    const savedSnapshot = await this.snapshotRepository.save(snapshot);

    const priceItems = this.createPriceItemsForBooking(booking);
    await this.priceItemRepository.save(priceItems);

    return {
      snapshot: this.toSnapshotResult(savedSnapshot),
      priceItems: priceItems.map((i) => this.toPriceItemResult(i)),
    };
  }

  private toSnapshotResult(entity: BookingSnapshotEntity): IBookingSnapshot {
    return {
      id: entity.id,
      bookingId: entity.bookingId,
      propertyTitle: entity.propertyTitle,
      propertyImage: entity.propertyImage,
      locationLabel: entity.locationLabel,
      propertyAddress: entity.propertyAddress,
      roomName: entity.roomName,
      cancellationPolicy: entity.cancellationPolicy,
      houseRules: entity.houseRules,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toPriceItemResult(entity: BookingPriceItemEntity): IBookingPriceItem {
    return {
      id: entity.id,
      bookingId: entity.bookingId,
      type: entity.type,
      calculationMode: entity.calculationMode,
      value: Number(entity.value),
      amount: Number(entity.amount),
    };
  }

  private buildLocationLabel(location?: {
    city?: string;
    state?: string;
    country?: string;
  }): string {
    if (!location) return '';
    const parts = [location.city, location.state, location.country].filter(
      Boolean,
    );
    return parts.join(', ');
  }

  private toSnapshotAddress(location?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  }): SnapshotAddress | undefined {
    if (!location?.addressLine1 || !location.city || !location.country) {
      return undefined;
    }
    return {
      addressLine1: location.addressLine1,
      addressLine2: location.addressLine2,
      city: location.city,
      state: location.state,
      country: location.country,
      postalCode: location.postalCode,
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }

  private createPriceItemsForBooking(
    booking: IBookingFinancialSummary,
  ): BookingPriceItemEntity[] {
    const items: BookingPriceItemEntity[] = [];
    const bookingId = booking.id;

    const subtotal = Number(booking.subtotal ?? 0);
    const totalFees = Number(booking.totalFees ?? 0);
    const taxAmount = Number(booking.taxAmount ?? 0);
    const totalDiscount = Number(booking.totalDiscount ?? 0);

    if (subtotal > 0) {
      items.push(
        this.priceItemRepository.create({
          bookingId,
          type: BookingPriceItemType.BASE_PRICE,
          calculationMode: BookingPriceItemCalculationMode.FIXED,
          value: subtotal,
          amount: subtotal,
        }),
      );
    }

    if (totalFees > 0) {
      items.push(
        this.priceItemRepository.create({
          bookingId,
          type: BookingPriceItemType.SERVICE_FEE,
          calculationMode: BookingPriceItemCalculationMode.FIXED,
          value: totalFees,
          amount: totalFees,
        }),
      );
    }

    if (taxAmount > 0) {
      const rate = Number(booking.taxRate ?? 0);
      items.push(
        this.priceItemRepository.create({
          bookingId,
          type: BookingPriceItemType.TAX,
          calculationMode:
            rate > 0
              ? BookingPriceItemCalculationMode.PERCENTAGE
              : BookingPriceItemCalculationMode.FIXED,
          value: rate > 0 ? rate : taxAmount,
          amount: taxAmount,
        }),
      );
    }

    if (totalDiscount > 0) {
      items.push(
        this.priceItemRepository.create({
          bookingId,
          type: BookingPriceItemType.DISCOUNT,
          calculationMode: BookingPriceItemCalculationMode.FIXED,
          value: totalDiscount,
          amount: -totalDiscount,
        }),
      );
    }

    if (items.length === 0 && Number(booking.grandTotal ?? 0) > 0) {
      const total = Number(booking.grandTotal ?? 0);
      items.push(
        this.priceItemRepository.create({
          bookingId,
          type: BookingPriceItemType.BASE_PRICE,
          calculationMode: BookingPriceItemCalculationMode.FIXED,
          value: total,
          amount: total,
        }),
      );
    }

    return items;
  }
}
