import type { ReviewEntity } from '../../entities/review.entity';

/** A review joined with guest + property display fields. */
export interface IHostReviewRow {
  id: string;
  guestName: string;
  guestAvatar: string | null;
  propertyName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  responseText: string | null;
  respondedAt: Date | null;
}

export interface IReviewSummaryAggregate {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  respondedCount: number;
}

export interface IReviewRepository {
  findByHost(
    hostId: string,
    page: number,
    limit: number,
  ): Promise<{ items: IHostReviewRow[]; total: number }>;
  getSummary(hostId: string): Promise<IReviewSummaryAggregate>;
  findById(reviewId: string): Promise<ReviewEntity | null>;
  findByBooking(bookingId: string): Promise<ReviewEntity | null>;
  addResponse(reviewId: string, text: string): Promise<ReviewEntity>;
  create(data: Partial<ReviewEntity>): Promise<ReviewEntity>;
}
