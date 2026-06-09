import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingStatus } from '../../bookings/enums';
import type { IBookingRepository } from '../../bookings/repositories/interfaces/booking.repository.interface';
import {
  REVIEW_UPSERTED,
  ReviewUpsertedPayload,
} from '../../common/events/review.events';
import {
  BOOKING_REPOSITORY,
  REVIEW_REPOSITORY,
} from '../../database/di/symbols';
import { CreateReviewDto } from '../dto/create-review.dto';
import type {
  IHostReview,
  IReviewResponse,
  IReviewService,
  IReviewSummary,
} from '../interfaces/review.service.interface';
import type {
  IHostReviewRow,
  IReviewRepository,
} from '../repositories/interfaces/review.repository.interface';

@Injectable()
export class ReviewService implements IReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepository: IReviewRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getHostReviews(
    hostId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: IHostReview[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { items, total } = await this.reviewRepository.findByHost(
      hostId,
      page,
      limit,
    );
    return {
      items: items.map((r) => this.toHostReview(r)),
      total,
      page,
      limit,
    };
  }

  async getHostSummary(hostId: string): Promise<IReviewSummary> {
    const agg = await this.reviewRepository.getSummary(hostId);
    const responseRate =
      agg.totalReviews > 0
        ? Math.round((agg.respondedCount / agg.totalReviews) * 100)
        : 0;
    return {
      averageRating: agg.averageRating,
      totalReviews: agg.totalReviews,
      breakdown: agg.breakdown,
      responseRate,
      respondedCount: agg.respondedCount,
    };
  }

  async reply(
    reviewId: string,
    hostId: string,
    text: string,
  ): Promise<IReviewResponse> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }
    if (review.hostId !== hostId) {
      throw new ForbiddenException('You can only reply to your own reviews');
    }
    const updated = await this.reviewRepository.addResponse(reviewId, text);
    return {
      text: updated.responseText ?? text,
      respondedAt: (updated.respondedAt ?? new Date()).toISOString(),
    };
  }

  async createReview(
    guestId: string,
    dto: CreateReviewDto,
  ): Promise<IHostReview> {
    const booking = await this.bookingRepository.findById(dto.bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }
    if (booking.guestId !== guestId) {
      throw new ForbiddenException('You can only review your own bookings');
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ForbiddenException('Only completed bookings can be reviewed');
    }
    const existing = await this.reviewRepository.findByBooking(dto.bookingId);
    if (existing) {
      throw new ConflictException('This booking has already been reviewed');
    }

    const created = await this.reviewRepository.create({
      bookingId: dto.bookingId,
      propertyId: booking.propertyId,
      guestId,
      hostId: booking.hostId,
      rating: dto.rating,
      comment: dto.comment,
    });

    this.eventEmitter.emit(REVIEW_UPSERTED, {
      propertyId: created.propertyId,
    } satisfies ReviewUpsertedPayload);

    const rows = await this.reviewRepository.findByHost(booking.hostId, 1, 1);
    const row = rows.items.find((r) => r.id === created.id);
    return this.toHostReview(
      row ?? {
        id: created.id,
        guestName: 'Guest',
        guestAvatar: null,
        propertyName: 'Listing',
        rating: created.rating,
        comment: created.comment,
        createdAt: created.createdAt,
        responseText: null,
        respondedAt: null,
      },
    );
  }

  private toHostReview(row: IHostReviewRow): IHostReview {
    return {
      id: row.id,
      guestName: row.guestName,
      guestAvatar: row.guestAvatar,
      propertyName: row.propertyName,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
      response: row.responseText
        ? {
            text: row.responseText,
            respondedAt: (row.respondedAt ?? new Date()).toISOString(),
          }
        : null,
    };
  }
}
