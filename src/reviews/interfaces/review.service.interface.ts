import type { CreateReviewDto } from '../dto/create-review.dto';

export interface IReviewResponse {
  text: string;
  respondedAt: string;
}

export interface IHostReview {
  id: string;
  guestName: string;
  guestAvatar: string | null;
  propertyName: string;
  rating: number;
  comment: string;
  createdAt: string;
  response: IReviewResponse | null;
}

/** The review a guest left for a booking, with the host's optional reply. */
export interface IGuestReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  response: IReviewResponse | null;
}

export interface IReviewSummary {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  responseRate: number;
  respondedCount: number;
}

export interface IReviewService {
  getHostReviews(
    hostId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: IHostReview[];
    total: number;
    page: number;
    limit: number;
  }>;
  getHostSummary(hostId: string): Promise<IReviewSummary>;
  reply(
    reviewId: string,
    hostId: string,
    text: string,
  ): Promise<IReviewResponse>;
  createReview(guestId: string, dto: CreateReviewDto): Promise<IHostReview>;
  /** The review the guest left for a booking (with host reply), or null if none. */
  getBookingReview(
    guestId: string,
    bookingId: string,
  ): Promise<IGuestReview | null>;
}
