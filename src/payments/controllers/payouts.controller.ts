import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BALANCE_SERVICE } from '../../database/di/symbols';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { EUserRole } from '../../users/enums/user.enum';
import { CreatePayoutAccountDto } from '../dto/create-payout-account.dto';
import type { IBalanceService } from '../interfaces/balance.service.interface';
import { PayoutAccountService } from '../services/payout-account.service';
import { PayoutService } from '../services/payout.service';

@ApiTags('payouts')
@Roles(EUserRole.HOST)
@Controller({ path: 'payouts', version: '1' })
export class PayoutsController {
  private readonly logger = new Logger(PayoutsController.name);

  constructor(
    private readonly payoutService: PayoutService,
    private readonly payoutAccountService: PayoutAccountService,
    @Inject(BALANCE_SERVICE)
    private readonly balanceService: IBalanceService,
  ) {}

  @Get('balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Host earnings balance for the Payout screen' })
  async getBalance(@RequestUserId() hostId: string) {
    this.logger.log(`Get balance for host ${hostId}`);
    const balance = await this.balanceService.getBalance(hostId);
    return { data: balance };
  }

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a payout of the full payable balance' })
  async requestPayout(@RequestUserId() hostId: string) {
    this.logger.log(`Payout requested by host ${hostId}`);
    const result = await this.payoutService.requestPayout(hostId);
    return { data: result };
  }

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

  @Get('accounts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List linked payout (bank) accounts' })
  async getAccounts(@RequestUserId() hostId: string) {
    this.logger.log(`Get payout accounts for host ${hostId}`);
    const accounts = await this.payoutAccountService.getAccounts(hostId);
    return { data: accounts };
  }

  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a bank account for payouts' })
  async addAccount(
    @RequestUserId() hostId: string,
    @Body() dto: CreatePayoutAccountDto,
  ) {
    this.logger.log(`Add payout account for host ${hostId}`);
    const account = await this.payoutAccountService.addAccount(hostId, dto);
    return { data: account };
  }

  @Patch('accounts/:id/primary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a payout account as the primary destination' })
  async setPrimaryAccount(
    @RequestUserId() hostId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.logger.log(`Set primary payout account ${id} for host ${hostId}`);
    const account = await this.payoutAccountService.setPrimary(hostId, id);
    return { data: account };
  }

  @Delete('accounts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a linked payout account' })
  async removeAccount(
    @RequestUserId() hostId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    this.logger.log(`Remove payout account ${id} for host ${hostId}`);
    await this.payoutAccountService.removeAccount(hostId, id);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payout summary (totals, this month) for host' })
  async getSummary(@RequestUserId() hostId: string) {
    this.logger.log(`Get payout summary for host ${hostId}`);
    const summary = await this.payoutService.getSummary(hostId);
    return { data: summary };
  }

  @Get('earnings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Monthly earnings chart data for host' })
  async getEarnings(
    @RequestUserId() hostId: string,
    @Query('months') months = '7',
  ) {
    this.logger.log(`Get payout earnings for host ${hostId}`);
    const earnings = await this.payoutService.getEarnings(
      hostId,
      Number(months),
    );
    return { data: earnings };
  }
}
