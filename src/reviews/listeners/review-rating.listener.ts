import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  REVIEW_UPSERTED,
  ReviewUpsertedPayload,
} from '../../common/events/review.events';
import { PropertyRatingEntity } from '../../properties/entities/property-rating.entity';
import { ReviewEntity } from '../entities/review.entity';

/**
 * Recomputes the {@link PropertyRatingEntity} aggregate whenever a review is
 * created/updated, keeping the write path decoupled from PropertyModule.
 */
@Injectable()
export class ReviewRatingListener {
  private readonly logger = new Logger(ReviewRatingListener.name);

  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
    @InjectRepository(PropertyRatingEntity)
    private readonly ratingRepo: Repository<PropertyRatingEntity>,
  ) {}

  @OnEvent(REVIEW_UPSERTED)
  async recompute(payload: ReviewUpsertedPayload): Promise<void> {
    const { propertyId } = payload;
    try {
      const agg = await this.reviewRepo
        .createQueryBuilder('r')
        .select('COALESCE(AVG(r.rating), 0)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .where('r.propertyId = :propertyId', { propertyId })
        .getRawOne<{ avg: string; count: string }>();

      const averageRating = Math.round(Number(agg?.avg ?? 0) * 100) / 100;
      const totalReviews = Number(agg?.count ?? 0);

      const existing = await this.ratingRepo.findOne({
        where: { propertyId },
      });
      if (existing) {
        existing.averageRating = averageRating;
        existing.totalReviews = totalReviews;
        await this.ratingRepo.save(existing);
      } else {
        await this.ratingRepo.save(
          this.ratingRepo.create({ propertyId, averageRating, totalReviews }),
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to recompute rating for property ${propertyId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
