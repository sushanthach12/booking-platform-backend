import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { REVIEW_SERVICE } from '../../database/di/symbols';
import { EUserRole } from '../../users/enums/user.enum';
import { CreateReviewDto } from '../dto/create-review.dto';
import type { IReviewService } from '../interfaces/review.service.interface';

@ApiTags('reviews')
@Roles(EUserRole.GUEST)
@Controller({ path: 'reviews', version: '1' })
export class ReviewController {
  private readonly logger = new Logger(ReviewController.name);

  constructor(
    @Inject(REVIEW_SERVICE)
    private readonly reviewService: IReviewService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a review for a completed booking' })
  async create(@RequestUserId() guestId: string, @Body() dto: CreateReviewDto) {
    this.logger.log(
      `Guest ${guestId} creating review for booking ${dto.bookingId}`,
    );
    const review = await this.reviewService.createReview(guestId, dto);
    return { data: review };
  }
}
