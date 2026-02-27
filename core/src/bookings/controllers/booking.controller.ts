import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import { PropertyService } from '../../properties/services/property.service';
import {
  CheckBookingAvailabilityDto,
  CreateBookingDto,
  CreatePriceAlertDto,
  GetBookingQueryDto,
  GetBookingsQueryDto,
  JoinWaitlistDto,
} from '../dto';
import { BookingService } from '../services/booking.service';

@ApiTags('bookings')
@Controller('bookings')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly propertyService: PropertyService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({
    status: 200,
    description:
      'Booking created successfully. Returns bookingId, bookingNumber, paymentLink, paymentSessionId.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' },
            bookingNumber: { type: 'string', example: 'BK202602-0001' },
            paymentLink: { type: 'string' },
            paymentSessionId: { type: 'string' },
          },
          required: [
            'bookingId',
            'bookingNumber',
            'paymentLink',
            'paymentSessionId',
          ],
        },
      },
    },
  })
  async createBooking(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateBookingDto,
  ) {
    this.logger.log(`Create booking request received from user ${user.id}`);

    const hostId = await this.propertyService.getHostIdByPropertyId(
      body.propertyId,
    );
    if (!hostId) {
      throw new NotFoundException('Property not found');
    }

    const response = await this.bookingService.createBooking(
      body,
      user.id,
      hostId,
    );

    return { data: response };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user bookings' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async getBookings(
    @CurrentUser() user: RequestUser,
    @Query() query: GetBookingsQueryDto,
  ) {
    this.logger.log(`Get bookings request received from user ${user.id}`);

    const response = await this.bookingService.getBookings(
      user.id,
      query,
      false,
    );

    return { data: response };
  }

  @Get('host')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get host bookings' })
  @ApiResponse({
    status: 200,
    description: 'Host bookings retrieved successfully',
  })
  async getHostBookings(
    @CurrentUser() user: RequestUser,
    @Query() query: GetBookingsQueryDto,
  ) {
    this.logger.log(`Get host bookings request received from user ${user.id}`);

    const response = await this.bookingService.getBookings(
      user.id,
      query,
      true,
    );

    return { data: response };
  }

  @Get('details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({
    status: 200,
    description:
      'Booking retrieved successfully. Returns booking details with property and host information.',
  })
  async getBookingDetails(
    @Query() query: GetBookingQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(`Get booking request received for booking`);

    const response = await this.bookingService.getBookingDetails({
      query,
      user,
    });

    return { data: response };
  }

  @Patch(':bookingId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled successfully.',
  })
  async cancelBooking(
    @Param() params: GetBookingQueryDto,
    @CurrentUser() user: RequestUser,
    @Body() body: { reason?: string },
  ) {
    this.logger.log(
      `Cancel booking request received for booking: ${params.bookingId}`,
    );

    const response = await this.bookingService.cancelBooking(
      params.bookingId,
      user.id,
      body.reason,
      false,
    );

    return { data: response };
  }

  @Patch(':bookingId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking confirmed successfully.',
  })
  async confirmBooking(
    @Param() params: GetBookingQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    this.logger.log(
      `Confirm booking request received for booking: ${params.bookingId}`,
    );

    const response = await this.bookingService.confirmBooking({
      query: params,
      user,
    });

    return { data: response };
  }

  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check property availability' })
  @ApiResponse({
    status: 200,
    description: 'Availability checked successfully',
  })
  async checkAvailability(@Body() body: CheckBookingAvailabilityDto) {
    this.logger.log(`Check availability request received for property`);

    const response = await this.bookingService.checkAvailability(body);

    return { data: response };
  }

  @Post('waitlist/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join waitlist for a property' })
  @ApiResponse({ status: 200, description: 'Joined waitlist successfully' })
  async joinWaitlist(
    @CurrentUser() user: RequestUser,
    @Body() body: JoinWaitlistDto,
  ) {
    this.logger.log(`Join waitlist request received from user ${user.id}`);

    const response = await Promise.resolve({
      message: 'Waitlist functionality not yet implemented',
      body,
    });

    return { data: response };
  }

  @Post('price-alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create price alert' })
  @ApiResponse({
    status: 200,
    description: 'Price alert created successfully',
  })
  async createPriceAlert(
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePriceAlertDto,
  ) {
    this.logger.log(`Create price alert request received from user ${user.id}`);

    const response = await Promise.resolve({
      message: 'Price alert functionality not yet implemented',
      body,
    });

    return { data: response };
  }

  @Get('price-alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user price alerts' })
  @ApiResponse({
    status: 200,
    description: 'Price alerts retrieved successfully',
  })
  async getPriceAlerts(@CurrentUser() user: RequestUser) {
    this.logger.log(`Get price alerts request received from user ${user.id}`);

    const response = await Promise.resolve({ alerts: [], total: 0 });

    return { data: response };
  }
}
