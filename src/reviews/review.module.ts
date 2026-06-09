import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingModule } from '../bookings/booking.module';
import { REVIEW_REPOSITORY, REVIEW_SERVICE } from '../database';
import { PropertyRatingEntity } from '../properties/entities/property-rating.entity';
import { HostReviewController } from './controllers/host-review.controller';
import { ReviewController } from './controllers/review.controller';
import { ReviewEntity } from './entities/review.entity';
import { ReviewRatingListener } from './listeners/review-rating.listener';
import { ReviewRepository } from './repositories/implementations/review.repository';
import { ReviewService } from './services/review.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewEntity, PropertyRatingEntity]),
    BookingModule,
  ],
  controllers: [HostReviewController, ReviewController],
  providers: [
    {
      provide: REVIEW_REPOSITORY,
      useClass: ReviewRepository,
    },
    {
      provide: REVIEW_SERVICE,
      useClass: ReviewService,
    },
    ReviewRatingListener,
  ],
  exports: [REVIEW_SERVICE],
})
export class ReviewModule {}
