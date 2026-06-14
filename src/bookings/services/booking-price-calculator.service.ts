import { Inject, Injectable } from '@nestjs/common';
import { PLATFORM_COMMISSION } from '../../database/di/symbols';
import type { IPlatformCommission } from '../../payments/interfaces/platform-commission.interface';
import { PropertyService } from '../../properties/services/property.service';
import type {
  BookingSummary,
  BookingSummaryLineItem,
  IBookingPriceCalculator,
} from '../interfaces/booking-service.interface';

const TAX_RATE_PERCENT = 18;

@Injectable()
export class DefaultBookingPriceCalculator implements IBookingPriceCalculator {
  constructor(
    private readonly propertyService: PropertyService,
    @Inject(PLATFORM_COMMISSION)
    private readonly commission: IPlatformCommission,
  ) {}

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
    const cleaningFee = round2(
      Number(propertyDetails.pricing?.cleaningFee ?? 0),
    );
    const serviceFeePercentage = Number(
      propertyDetails.pricing?.serviceFeePercentage ?? 0,
    );
    const subtotal = round2(basePricePerNight * numberOfNights);
    const serviceFee = round2(subtotal * (serviceFeePercentage / 100));
    const totalFees = round2(cleaningFee + serviceFee);
    const totalDiscount = 0;
    const amountAfterDiscount = round2(subtotal + totalFees - totalDiscount);
    const taxAmount = round2(amountAfterDiscount * (TAX_RATE_PERCENT / 100));
    const grandTotal = round2(amountAfterDiscount + taxAmount);

    // Host-side platform commission. Deducted from the host's earnings, not
    // added to the guest's total — so grandTotal is unaffected. Single source
    // of truth lives behind the PLATFORM_COMMISSION token (rate defaults to 0).
    const { platformFee, hostNet } = this.commission.split(grandTotal);

    const lineItems: BookingSummaryLineItem[] = [
      {
        type: 'base',
        label: `${numberOfNights} night${numberOfNights !== 1 ? 's' : ''} x ₹${basePricePerNight.toLocaleString('en-IN')}`,
        amount: subtotal,
      },
    ];
    if (cleaningFee > 0) {
      lineItems.push({
        type: 'cleaning_fee',
        label: 'Cleaning fee',
        amount: cleaningFee,
      });
    }
    if (serviceFee > 0) {
      lineItems.push({
        type: 'service_fee',
        label: 'Service fee',
        amount: serviceFee,
      });
    }
    if (totalDiscount > 0) {
      lineItems.push({
        type: 'discount',
        label: 'Discount',
        amount: -totalDiscount,
      });
    }
    lineItems.push({
      type: 'tax',
      label: `Taxes (${TAX_RATE_PERCENT}%)`,
      amount: taxAmount,
    });

    const policies = propertyDetails.policies;

    return {
      basePricePerNight,
      subtotal,
      cleaningFee,
      serviceFee,
      totalFees,
      totalDiscount,
      taxRate: TAX_RATE_PERCENT,
      taxAmount,
      grandTotal,
      platformFee,
      hostNet,
      lineItems,
      propertyMeta: policies
        ? {
            cancellationPolicy: policies.cancellationPolicy,
            checkInTime: policies.checkInTime,
            checkOutTime: policies.checkOutTime,
            maxGuests: policies.maxGuests,
          }
        : undefined,
    };
  }
}
