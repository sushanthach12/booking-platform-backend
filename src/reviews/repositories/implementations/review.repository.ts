import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewEntity } from '../../entities/review.entity';
import type {
  IHostReviewRow,
  IReviewRepository,
  IReviewSummaryAggregate,
} from '../interfaces/review.repository.interface';

@Injectable()
export class ReviewRepository implements IReviewRepository {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly repo: Repository<ReviewEntity>,
  ) {}

  async findByHost(
    hostId: string,
    page: number,
    limit: number,
  ): Promise<{ items: IHostReviewRow[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoin('users', 'guest', 'guest.id = r.guestId')
      .leftJoin('properties', 'property', 'property.id = r.propertyId')
      .select('r.id', 'id')
      .addSelect('guest.name', 'guestName')
      .addSelect('property.title', 'propertyName')
      .addSelect('r.rating', 'rating')
      .addSelect('r.comment', 'comment')
      .addSelect('r.createdAt', 'createdAt')
      .addSelect('r.responseText', 'responseText')
      .addSelect('r.respondedAt', 'respondedAt')
      .where('r.hostId = :hostId', { hostId })
      .orderBy('r.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const [rows, total] = await Promise.all([
      qb.getRawMany<{
        id: string;
        guestName: string | null;
        propertyName: string | null;
        rating: number;
        comment: string;
        createdAt: Date;
        responseText: string | null;
        respondedAt: Date | null;
      }>(),
      this.repo.count({ where: { hostId } }),
    ]);

    const items: IHostReviewRow[] = rows.map((row) => ({
      id: row.id,
      guestName: row.guestName ?? 'Guest',
      guestAvatar: null,
      propertyName: row.propertyName ?? 'Listing',
      rating: Number(row.rating),
      comment: row.comment,
      createdAt: row.createdAt,
      responseText: row.responseText,
      respondedAt: row.respondedAt,
    }));

    return { items, total };
  }

  async getSummary(hostId: string): Promise<IReviewSummaryAggregate> {
    const rows = await this.repo
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        'COUNT(*) FILTER (WHERE r.responseText IS NOT NULL)',
        'responded',
      )
      .where('r.hostId = :hostId', { hostId })
      .groupBy('r.rating')
      .getRawMany<{ rating: number; count: string; responded: string }>();

    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let totalReviews = 0;
    let ratingSum = 0;
    let respondedCount = 0;

    for (const row of rows) {
      const rating = Number(row.rating) as 1 | 2 | 3 | 4 | 5;
      const count = Number(row.count);
      breakdown[rating] = count;
      totalReviews += count;
      ratingSum += rating * count;
      respondedCount += Number(row.responded);
    }

    const averageRating =
      totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 100) / 100 : 0;

    return { averageRating, totalReviews, breakdown, respondedCount };
  }

  async findById(reviewId: string): Promise<ReviewEntity | null> {
    return this.repo.findOne({ where: { id: reviewId } });
  }

  async findByBooking(bookingId: string): Promise<ReviewEntity | null> {
    return this.repo.findOne({ where: { bookingId } });
  }

  async addResponse(reviewId: string, text: string): Promise<ReviewEntity> {
    await this.repo.update(reviewId, {
      responseText: text,
      respondedAt: new Date(),
    });
    const updated = await this.findById(reviewId);
    if (!updated) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }
    return updated;
  }

  async create(data: Partial<ReviewEntity>): Promise<ReviewEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }
}
