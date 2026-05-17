import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import { BOOKING_SERVICE } from '../../database';
import { EUserRole } from '../../users/enums/user.enum';
import { GetBookingQueryDto, GetBookingsQueryDto } from '../dto';
import {
  EBookingStatusUpdate,
  UpdateBookingStatusDto,
} from '../dto/update-booking-status.dto';
import { BookingStatus } from '../enums';
import type { IBookingService } from '../interfaces/booking-service.interface';

@ApiTags('host-bookings')
@Roles(EUserRole.HOST)
@Controller({ path: 'bookings', version: '1' })
export class HostBookingController {
  private readonly logger = new Logger(HostBookingController.name);

  constructor(
    @Inject(BOOKING_SERVICE)
    private readonly bookingService: IBookingService,
  ) {}

  @Get('host')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get host bookings / reservations' })
  @ApiResponse({
    status: 200,
    description: 'Host bookings retrieved successfully',
  })
  async getHostBookings(
    @CurrentUser() user: RequestUser,
    @Query() query: GetBookingsQueryDto,
  ) {
    this.logger.log(`Get host bookings for host ${user.id}`);
    const response = await this.bookingService.getBookings(
      user.id,
      query,
      true,
    );
    return { data: response };
  }

  @Patch(':bookingId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or decline a booking (host only)' })
  @ApiResponse({
    status: 200,
    description: 'Booking status updated successfully',
  })
  async updateBookingStatus(
    @Param() params: GetBookingQueryDto,
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateBookingStatusDto,
  ) {
    this.logger.log(
      `Host ${user.id} updating booking ${params.bookingId} status to ${body.status}`,
    );

    if (body.status === EBookingStatusUpdate.ACCEPTED) {
      const response = await this.bookingService.confirmBooking({
        query: params,
        user,
      });
      return { data: response };
    }

    const response = await this.bookingService.cancelBooking(
      params.bookingId,
      user.id,
      body.status === EBookingStatusUpdate.DECLINED
        ? 'host_declined'
        : undefined,
      true,
    );
    return {
      data: {
        ...response,
        status:
          body.status === EBookingStatusUpdate.DECLINED
            ? BookingStatus.CANCELLED
            : response.status,
      },
    };
  }

  @Patch(':bookingId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a booking (host only)' })
  @ApiResponse({ status: 200, description: 'Booking confirmed successfully' })
  async confirmBooking(
    @Param() params: GetBookingQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(`Host ${user.id} confirming booking ${params.bookingId}`);
    const response = await this.bookingService.confirmBooking({
      query: params,
      user,
    });
    return { data: response };
  }
}
