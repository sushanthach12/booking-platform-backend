import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../../common/email/email.service';
import {
  BOOKING_CANCELLED,
  BOOKING_CONFIRMED,
  BOOKING_PAYMENT_FAILED,
  BookingCancelledPayload,
  BookingConfirmedPayload,
  BookingPaymentFailedPayload,
} from '../../common/events/booking.events';

@Injectable()
export class BookingEmailListener {
  private readonly logger = new Logger(BookingEmailListener.name);

  constructor(private readonly emailService: EmailService) {}

  @OnEvent(BOOKING_CONFIRMED)
  async handleBookingConfirmed(payload: BookingConfirmedPayload) {
    this.logger.log(
      `Sending confirmation email for booking ${payload.bookingId}`,
    );

    await this.emailService.send({
      to: payload.guestEmail,
      subject: `Booking Confirmed — ${payload.propertyTitle}`,
      html: `
        <h2>Your booking is confirmed!</h2>
        <p>Hi ${payload.guestName},</p>
        <p>Great news! Your booking has been confirmed.</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px">
          <tr><td style="padding:8px;font-weight:bold">Property</td><td style="padding:8px">${payload.propertyTitle}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Check-in</td><td style="padding:8px">${payload.checkIn}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Check-out</td><td style="padding:8px">${payload.checkOut}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Total</td><td style="padding:8px">${payload.currency} ${payload.totalAmount}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Booking ID</td><td style="padding:8px">${payload.bookingId}</td></tr>
        </table>
        <p>Thank you for choosing Stayly!</p>
      `,
    });
  }

  @OnEvent(BOOKING_CANCELLED)
  async handleBookingCancelled(payload: BookingCancelledPayload) {
    this.logger.log(
      `Sending cancellation email for booking ${payload.bookingId}`,
    );

    await this.emailService.send({
      to: payload.guestEmail,
      subject: `Booking Cancelled — ${payload.propertyTitle}`,
      html: `
        <h2>Booking Cancellation Notice</h2>
        <p>Hi ${payload.guestName},</p>
        <p>Your booking has been cancelled${payload.reason ? `: ${payload.reason}` : '.'}</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px">
          <tr><td style="padding:8px;font-weight:bold">Property</td><td style="padding:8px">${payload.propertyTitle}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Check-in</td><td style="padding:8px">${payload.checkIn}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Check-out</td><td style="padding:8px">${payload.checkOut}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Booking ID</td><td style="padding:8px">${payload.bookingId}</td></tr>
        </table>
        <p>If you have any questions please contact our support team.</p>
      `,
    });
  }

  @OnEvent(BOOKING_PAYMENT_FAILED)
  async handleBookingPaymentFailed(payload: BookingPaymentFailedPayload) {
    this.logger.log(
      `Sending payment failed email for booking ${payload.bookingId}`,
    );

    await this.emailService.send({
      to: payload.guestEmail,
      subject: `Payment Failed — ${payload.propertyTitle}`,
      html: `
        <h2>Payment Failed</h2>
        <p>Hi ${payload.guestName},</p>
        <p>Unfortunately the payment for your booking at <strong>${payload.propertyTitle}</strong> could not be processed.</p>
        <p>Your booking (ID: <strong>${payload.bookingId}</strong>) has been cancelled.</p>
        <p>Please try booking again or contact our support team for assistance.</p>
      `,
    });
  }
}
