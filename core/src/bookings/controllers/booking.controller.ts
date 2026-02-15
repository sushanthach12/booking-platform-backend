import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import { PropertyService } from '../../properties/services/property.service';
import {
  BookingResponseDto,
  CreateBookingDto,
  CreatePriceAlertDto,
  GetBookingParamsDto,
  GetBookingsQueryDto,
  JoinWaitlistDto,
  PriceAlertResponseDto,
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

  private handleError(res: Response, error: any) {
    const errorMessage =
      error instanceof Error ? error.message : 'Something went wrong';
    const statusCode =
      error.response?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).json({ message: errorMessage });
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking created successfully',
    type: BookingResponseDto,
  })
  async createBooking(
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
    @Body() body: CreateBookingDto,
  ) {
    try {
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

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error creating booking:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user bookings' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async getBookings(
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
    @Query() query: GetBookingsQueryDto,
  ) {
    try {
      this.logger.log(`Get bookings request received from user ${user.id}`);

      const response = await this.bookingService.getBookings(
        user.id,
        query,
        false,
      );

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting bookings:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Get('host')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get host bookings' })
  @ApiResponse({
    status: 200,
    description: 'Host bookings retrieved successfully',
  })
  async getHostBookings(
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
    @Query() query: GetBookingsQueryDto,
  ) {
    try {
      this.logger.log(
        `Get host bookings request received from user ${user.id}`,
      );

      const response = await this.bookingService.getBookings(
        user.id,
        query,
        true,
      );

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting host bookings:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Get(':bookingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking retrieved successfully',
    type: BookingResponseDto,
  })
  async getBookingById(
    @Param() params: GetBookingParamsDto,
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
  ) {
    try {
      this.logger.log(
        `Get booking request received for booking: ${params.bookingId}`,
      );

      const response = await this.bookingService.getBookingById(
        params.bookingId,
      );

      const isGuestOrHost =
        response.guestId === user.id || response.hostId === user.id;
      if (!isGuestOrHost) {
        throw new ForbiddenException('You do not have access to this booking');
      }

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting booking:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Patch(':bookingId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled successfully',
    type: BookingResponseDto,
  })
  async cancelBooking(
    @Param() params: GetBookingParamsDto,
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
    @Body() body: { reason?: string },
  ) {
    try {
      this.logger.log(
        `Cancel booking request received for booking: ${params.bookingId}`,
      );

      const response = await this.bookingService.cancelBooking(
        params.bookingId,
        user.id,
        body.reason,
        false, // Guest cancellation
      );

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error cancelling booking:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Patch(':bookingId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a booking' })
  @ApiResponse({
    status: 200,
    description: 'Booking confirmed successfully',
    type: BookingResponseDto,
  })
  async confirmBooking(
    @Param() params: GetBookingParamsDto,
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
  ) {
    try {
      this.logger.log(
        `Confirm booking request received for booking: ${params.bookingId}`,
      );

      const booking = await this.bookingService.getBookingById(
        params.bookingId,
      );
      if (booking.hostId !== user.id) {
        throw new ForbiddenException(
          'Only the property host can confirm this booking',
        );
      }
      const response = await this.bookingService.confirmBooking(
        params.bookingId,
      );

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error confirming booking:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check property availability' })
  @ApiResponse({
    status: 200,
    description: 'Availability checked successfully',
  })
  async checkAvailability(
    @Res() res: Response,
    @Body()
    body: {
      propertyId: string;
      checkInDate: Date;
      checkOutDate: Date;
    },
  ) {
    try {
      this.logger.log(
        `Check availability request received for property: ${body.propertyId}`,
      );

      const response = await this.bookingService.checkAvailability(
        body.propertyId,
        body.checkInDate,
        body.checkOutDate,
      );

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error checking availability:`, error.message);
      return this.handleError(res, error);
    }
  }

  // Waitlist endpoints
  @Post('waitlist/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join waitlist for a property' })
  @ApiResponse({ status: 200, description: 'Joined waitlist successfully' })
  async joinWaitlist(
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
    @Body() body: JoinWaitlistDto,
  ) {
    try {
      this.logger.log(`Join waitlist request received from user ${user.id}`);

      // TODO: Implement waitlist service
      const response = await Promise.resolve({
        message: 'Waitlist functionality not yet implemented',
        body,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error joining waitlist:`, error.message);
      return this.handleError(res, error);
    }
  }

  // Price alert endpoints
  @Post('price-alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create price alert' })
  @ApiResponse({
    status: 200,
    description: 'Price alert created successfully',
    type: PriceAlertResponseDto,
  })
  async createPriceAlert(
    @Res() res: Response,
    @CurrentUser() user: RequestUser,
    @Body() body: CreatePriceAlertDto,
  ) {
    try {
      this.logger.log(
        `Create price alert request received from user ${user.id}`,
      );

      // TODO: Implement price alert service
      const response = await Promise.resolve({
        message: 'Price alert functionality not yet implemented',
        body,
      });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error creating price alert:`, error.message);
      return this.handleError(res, error);
    }
  }

  @Get('price-alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user price alerts' })
  @ApiResponse({
    status: 200,
    description: 'Price alerts retrieved successfully',
  })
  async getPriceAlerts(@Res() res: Response, @CurrentUser() user: RequestUser) {
    try {
      this.logger.log(`Get price alerts request received from user ${user.id}`);

      // TODO: Implement price alert service
      const response = await Promise.resolve({ alerts: [], total: 0 });

      return res.status(HttpStatus.OK).json({ data: response });
    } catch (error) {
      this.logger.error(`Error getting price alerts:`, error.message);
      return this.handleError(res, error);
    }
  }
}
