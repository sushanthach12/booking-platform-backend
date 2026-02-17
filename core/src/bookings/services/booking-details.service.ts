import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ECurrency } from '../../common/enums/currency.enum';
import { BOOKING_REPOSITORY } from '../../database';
import { PropertyService } from '../../properties/services/property.service';
import { BookingDetailsEntity } from '../entities';
import { IBookingRepository } from '../repositories';

@Injectable()
export class BookingDetailsService {
  private readonly logger = new Logger(BookingDetailsService.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    @InjectRepository(BookingDetailsEntity)
    private readonly bookingDetailsRepository: Repository<BookingDetailsEntity>,
    private readonly propertyService: PropertyService,
  ) {}

  async createForBooking(bookingId: string): Promise<BookingDetailsEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const existing = await this.bookingDetailsRepository.findOne({
      where: { bookingId },
    });
    if (existing) {
      this.logger.debug(
        `Booking details already exist for booking ${bookingId}`,
      );
      return existing;
    }

    const propertyDetails = await this.propertyService.getPropertyDetails({
      params: {
        propertyId: booking.propertyId,
        includeRelations: true,
      },
    });

    const totalPrice = Number(booking.totalPrice);
    const basePrice = propertyDetails.pricing?.basePrice ?? totalPrice;
    const cleaningFee = propertyDetails.pricing?.cleaningFee ?? null;
    const serviceFee = propertyDetails.pricing?.serviceFeePercentage
      ? Number(
          (
            (basePrice * Number(propertyDetails.pricing.serviceFeePercentage)) /
            100
          ).toFixed(2),
        )
      : null;

    const propertyAddress: Record<string, unknown> = propertyDetails.location
      ? {
          addressLine1: propertyDetails.location.addressLine1,
          addressLine2: propertyDetails.location.addressLine2,
          city: propertyDetails.location.city,
          state: propertyDetails.location.state,
          country: propertyDetails.location.country,
          postalCode: propertyDetails.location.postalCode,
          latitude: propertyDetails.location.latitude,
          longitude: propertyDetails.location.longitude,
        }
      : {};

    const cancellationPolicy: Record<string, unknown> =
      propertyDetails.policies?.cancellationPolicy != null
        ? { type: propertyDetails.policies.cancellationPolicy }
        : {};

    const payload = {
      bookingId,
      propertyTitle: propertyDetails.title ?? 'Property',
      propertyDescription: propertyDetails.description ?? undefined,
      propertyAddress: propertyAddress as Record<string, any>,
      propertyImages:
        propertyDetails.images?.map((img) => img.url) ?? undefined,
      propertyAmenities: (propertyDetails.amenities ?? undefined) as
        | Record<string, any>[]
        | undefined,
      roomDetails:
        booking.roomId && propertyDetails.rooms?.length
          ? (propertyDetails.rooms.find((r) => r.id === booking.roomId) as
              | Record<string, any>
              | undefined)
          : undefined,
      basePrice,
      cleaningFee: cleaningFee != null ? Number(cleaningFee) : undefined,
      serviceFee: serviceFee ?? undefined,
      taxes: undefined,
      discountAmount: undefined,
      totalPrice,
      currency: booking.currency ?? ECurrency.INR,
      cancellationPolicy: cancellationPolicy as Record<string, any>,
      houseRules: undefined,
    } as DeepPartial<BookingDetailsEntity>;

    const details = this.bookingDetailsRepository.create(payload);
    const saved = await this.bookingDetailsRepository.save(details);

    return saved;
  }
}
