import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmailService, ISendEmailParams } from './email.interface';

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendApiKey: string;
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY') ?? '';
    this.defaultFrom =
      this.configService.get<string>('EMAIL_FROM') ?? 'noreply@stayly.app';
  }

  async send(params: ISendEmailParams): Promise<void> {
    const from = params.from ?? this.defaultFrom;

    if (!this.resendApiKey) {
      this.logger.warn(
        `RESEND_API_KEY not set — skipping email to ${params.to}: ${params.subject}`,
      );
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject: params.subject,
          html: params.html,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        this.logger.error(
          `Email send failed [${response.status}]: ${body.message ?? response.statusText}`,
        );
        return;
      }

      this.logger.log(`Email sent to ${params.to}: ${params.subject}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email send error: ${msg}`);
    }
  }
}
