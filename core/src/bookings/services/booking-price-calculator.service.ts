import { Injectable } from '@nestjs/common';
import { PropertyService } from '../../properties/services/property.service';
import type {
  BookingSummary,
  IBookingPriceCalculator,
} from '../interfaces/booking-service.interface';

const TAX_RATE_PERCENT = 18;

@Injectable()
export class DefaultBookingPriceCalculator implements IBookingPriceCalculator {
  constructor(private readonly propertyService: PropertyService) {}

  async calculate(
    propertyId: string,
    roomId: string | undefined,
    numberOfNights: number,
  ): Promise<BookingSummary> {
    const propertyDetails = await this.propertyService.getPropertyDetails({
      params: { propertyId, includeRelations: true },
    });

    let basePricePerNight: number;
    if (roomId && propertyDetails.rooms?.length) {
      const room = propertyDetails.rooms.find((r) => r.id === roomId);
      basePricePerNight =
        room?.basePrice ?? Number(propertyDetails.pricing?.basePrice ?? 0);
    } else {
      basePricePerNight = Number(propertyDetails.pricing?.basePrice ?? 0);
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const subtotal = round2(basePricePerNight * numberOfNights);
    const totalFees = 0;
    const totalDiscount = 0;
    const amountAfterDiscount = round2(subtotal - totalDiscount);
    const taxAmount = round2(amountAfterDiscount * (TAX_RATE_PERCENT / 100));
    const grandTotal = round2(amountAfterDiscount + taxAmount);

    return {
      subtotal,
      totalFees,
      totalDiscount,
      taxRate: TAX_RATE_PERCENT,
      taxAmount,
      grandTotal,
    };
  }
}
