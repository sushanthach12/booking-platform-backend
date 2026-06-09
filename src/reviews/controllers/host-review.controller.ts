import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { REVIEW_SERVICE } from '../../database/di/symbols';
import { EUserRole } from '../../users/enums/user.enum';
import { ReplyReviewDto } from '../dto/reply-review.dto';
import type { IReviewService } from '../interfaces/review.service.interface';

@ApiTags('host-reviews')
@Roles(EUserRole.HOST)
@Controller({ path: 'reviews', version: '1' })
export class HostReviewController {
  private readonly logger = new Logger(HostReviewController.name);

  constructor(
    @Inject(REVIEW_SERVICE)
    private readonly reviewService: IReviewService,
  ) {}

  @Get('host')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List reviews across the host listings' })
  async getHostReviews(
    @RequestUserId() hostId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    this.logger.log(`Get host reviews for host ${hostId}`);
    const result = await this.reviewService.getHostReviews(
      hostId,
      Number(page),
      Number(limit),
    );
    return {
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit },
    };
  }

  @Get('host/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aggregate review stats for the host' })
  async getHostSummary(@RequestUserId() hostId: string) {
    this.logger.log(`Get host review summary for host ${hostId}`);
    const summary = await this.reviewService.getHostSummary(hostId);
    return { data: summary };
  }

  @Post(':reviewId/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reply to a guest review (owning host only)' })
  async reply(
    @RequestUserId() hostId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    this.logger.log(`Host ${hostId} replying to review ${reviewId}`);
    const response = await this.reviewService.reply(reviewId, hostId, dto.text);
    return { data: response };
  }
}
