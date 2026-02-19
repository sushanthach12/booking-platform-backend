import { RequestUser } from '../../common/types/users.types';
import { BookingPaymentStatus, BookingStatus } from '../enums';
import {
  BookingPriceItemCalculationMode,
  BookingPriceItemType,
} from '../enums/booking-price-item.enum';

export interface CreateBookingRequest {
  propertyId: string;
  roomId?: string;
  checkInDate: Date;
  checkOutDate: Date;
  guestCount: number;
  specialRequests?: string;
  idempotencyKey: string;
  /** Pass from controller/auth when available to avoid extra user lookup */
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
}

/** Response shape for POST /bookings (create) only */
export interface CreateBookingApiResponse {
  bookingId: string;
  bookingNumber: string;
  paymentLink: string;
  paymentSessionId: string;
}

export interface CheckBookingAvailabilityRequest {
  propertyId: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomId?: string;
}

export interface CheckBookingAvailabilityResponse {
  available: boolean;
  conflictingBookings: string[];
}

export interface BookingResponse {
  id: string;
  propertyId: string;
  guestId: string;
  hostId: string;
  roomId?: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  bookingNumber?: string;
  specialRequests?: string;
  guestCount: number;
  cancellationReason?: string;
  cancelledAt?: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  /** True when payment succeeded but host has not yet confirmed */
  requiresHostConfirmation: boolean;
}

export interface BookingQueryOptions {
  propertyId?: string;
  status?: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedBookings {
  bookings: BookingResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface AvailabilityResult {
  available: boolean;
  conflictingBookings: string[];
}

export interface CancelBookingOptions {
  reason?: string;
  isHost?: boolean;
}

export interface IGetBookingDetailsParams {
  query: {
    bookingId: string;
  };
  user: RequestUser;
}

export interface IConfirmBookingParams {
  query: {
    bookingId: string;
  };
  user: RequestUser;
}

/** Financial summary in get booking details response. */
export interface IBookingDetailsSummary {
  subtotal: number;
  totalFees: number;
  taxRate: number;
  taxAmount: number;
  totalDiscount: number;
  grandTotal: number;
  currency: string;
}

export interface IGetBookingDetailsResponse {
  booking: {
    id: string;
    bookingNumber?: string;
    checkInDate: Date;
    checkOutDate: Date;
    numberOfNights: number;
    currency: string;
    status: BookingStatus;
    paymentStatus: BookingPaymentStatus;
    specialRequests?: string;
    guestCount: number;
    cancellationReason?: string;
    cancelledAt?: Date;
    confirmedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    requiresHostConfirmation: boolean;
  };
  summary: IBookingDetailsSummary;
  property: {
    id: string;
    title: string;
    description: string | null;
    location?: {
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state?: string;
      country: string;
      postalCode?: string;
      latitude?: number;
      longitude?: number;
    };
    images?: Array<{
      url: string;
      displayOrder: number;
      isPrimary: boolean;
    }>;
    amenities?: Array<Record<string, any>>;
    room?: {
      name: string;
      description?: string;
      roomType: string;
      beds: number;
      bedType?: string;
      maxGuests: number;
      basePrice?: number;
      isPrivate: boolean;
      hasBathroom: boolean;
      hasBalcony: boolean;
      floorNumber?: number;
      squareMeters?: number;
    };
    cancellationPolicy?: Record<string, any>;
    houseRules?: Array<Record<string, any>>;
  };
  host: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  guest: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

/** Snapshot address at time of booking (e.g. for confirmations and check-in). */
export interface SnapshotAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

/** Booking snapshot result (property snapshot at time of booking). */
export interface IBookingSnapshot {
  id: string;
  bookingId: string;
  propertyTitle: string;
  propertyImage?: string;
  locationLabel: string;
  propertyAddress?: SnapshotAddress;
  roomName?: string;
  cancellationPolicy: Record<string, unknown>;
  houseRules?: Record<string, unknown>[];
  createdAt: Date;
  updatedAt: Date;
}

/** Booking price item result (line item in pricing breakdown). */
export interface IBookingPriceItem {
  id: string;
  bookingId: string;
  type: BookingPriceItemType;
  calculationMode: BookingPriceItemCalculationMode;
  value: number;
  amount: number;
}

/** Minimal booking shape used when building price items (no entity dependency). */
export interface IBookingFinancialSummary {
  id: string;
  subtotal?: number;
  totalPrice?: number;
  totalFees: number;
  taxAmount: number;
  totalDiscount: number;
  taxRate?: number;
  grandTotal?: number;
}
