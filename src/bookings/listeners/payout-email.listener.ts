import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../../common/email/email.service';
import {
  PAYOUT_FAILED,
  PAYOUT_PAID,
  PayoutFailedPayload,
  PayoutPaidPayload,
} from '../../common/events/payment.events';
import { USER_REPOSITORY } from '../../database/di/symbols';
import type { IUserRepository } from '../../users/repositories/interfaces/user.repository.interface';

/**
 * Emails the host when a payout settles or fails. Decoupled from the payout
 * reconciliation via the PAYOUT_PAID / PAYOUT_FAILED events.
 */
@Injectable()
export class PayoutEmailListener {
  private readonly logger = new Logger(PayoutEmailListener.name);

  constructor(
    private readonly emailService: EmailService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @OnEvent(PAYOUT_PAID)
  async handlePayoutPaid(payload: PayoutPaidPayload): Promise<void> {
    const host = await this.userRepository.findById(payload.hostId);
    if (!host?.email) return;
    this.logger.log(`Sending payout-paid email for payout ${payload.payoutId}`);
    await this.emailService.send({
      to: host.email,
      subject: 'Your payout is on its way',
      html: `
        <h2>Payout sent</h2>
        <p>We've sent <strong>${payload.currency} ${payload.amount}</strong> to your account.</p>
        ${payload.transferUtr ? `<p>Reference (UTR): ${payload.transferUtr}</p>` : ''}
        <p>It may take a little time to reflect in your bank account.</p>
      `,
    });
  }

  @OnEvent(PAYOUT_FAILED)
  async handlePayoutFailed(payload: PayoutFailedPayload): Promise<void> {
    const host = await this.userRepository.findById(payload.hostId);
    if (!host?.email) return;
    this.logger.log(
      `Sending payout-failed email for payout ${payload.payoutId}`,
    );
    await this.emailService.send({
      to: host.email,
      subject: 'There was a problem with your payout',
      html: `
        <h2>Payout could not be completed</h2>
        <p>Your payout of <strong>${payload.currency} ${payload.amount}</strong> could not be completed${payload.reason ? `: ${payload.reason}` : '.'}.</p>
        <p>The amount has been returned to your available balance. Please check your payout account details and try again.</p>
      `,
    });
  }
}
