import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { PayoutService } from '../services/payout.service';

@ApiTags('payouts')
@Controller({ path: 'payouts', version: '1' })
export class PayoutsController {
  private readonly logger = new Logger(PayoutsController.name);

  constructor(private readonly payoutService: PayoutService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payout history for authenticated host' })
  async getPayouts(
    @RequestUserId() hostId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    this.logger.log(`Get payouts for host ${hostId}`);
    const result = await this.payoutService.getPayouts(
      hostId,
      Number(page),
      Number(limit),
    );
    return {
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit },
    };
  }

  @Get('upcoming')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get next upcoming payout for authenticated host' })
  async getUpcomingPayout(@RequestUserId() hostId: string) {
    this.logger.log(`Get upcoming payout for host ${hostId}`);
    const upcoming = await this.payoutService.getUpcoming(hostId);
    return { data: upcoming };
  }
}
