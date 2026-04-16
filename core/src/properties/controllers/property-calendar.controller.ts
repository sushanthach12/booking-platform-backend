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
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import { AVAILABILITY_CALENDAR_REPOSITORY } from '../../database';
import { BlockDatesDto } from '../dto/block-dates.dto';
import { PropertyService } from '../services/property.service';
import type { IAvailabilityCalendarRepository } from '../repositories/interfaces/availability-calendar.repository.interface';

@ApiTags('properties')
@Controller('properties')
export class PropertyCalendarController {
  private readonly logger = new Logger(PropertyCalendarController.name);

  constructor(
    private readonly propertyService: PropertyService,
    @Inject(AVAILABILITY_CALENDAR_REPOSITORY)
    private readonly availabilityCalendarRepository: IAvailabilityCalendarRepository,
  ) {}

  @Get(':propertyId/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get property stats (host only)' })
  async getPropertyStats(
    @Param('propertyId') propertyId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(`Get stats for property ${propertyId} by user ${user.id}`);
    const stats = await this.propertyService.getPropertyStats(propertyId, user.id);
    return { data: stats };
  }

  @Get(':propertyId/calendar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get availability calendar for a property' })
  async getCalendar(
    @Param('propertyId') propertyId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    this.logger.log(`Get calendar for property ${propertyId}`);
    const startDate = new Date(from ?? new Date().toISOString().substring(0, 10));
    const endDate = new Date(to ?? new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10));
    const entries = await this.availabilityCalendarRepository.findByRange({
      propertyId,
      startDate,
      endDate,
    });
    return { data: entries };
  }

  @Post(':propertyId/calendar/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block dates on a property calendar' })
  async blockDates(
    @Param('propertyId') propertyId: string,
    @Body() dto: BlockDatesDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(`Block dates for property ${propertyId} by host ${user.id}`);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const rows: Parameters<IAvailabilityCalendarRepository['upsertMany']>[0] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      rows.push({
        propertyId,
        roomId: null,
        date: new Date(d),
        available: false,
        blockReason: dto.reason ?? 'host_block',
      });
    }

    const result = await this.availabilityCalendarRepository.upsertMany(rows);
    return { data: result };
  }

  @Delete(':propertyId/calendar/:blockId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a date by restoring availability' })
  async unblockDate(
    @Param('propertyId') propertyId: string,
    @Param('blockId') blockId: string,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(`Unblock date ${blockId} for property ${propertyId} by host ${user.id}`);
    // Re-upsert as available using the blockId as the date string
    const result = await this.availabilityCalendarRepository.upsertMany([
      {
        propertyId,
        roomId: null,
        date: new Date(blockId),
        available: true,
        blockReason: null,
      },
    ]);
    return { data: result };
  }
}
