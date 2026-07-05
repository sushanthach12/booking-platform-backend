import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { IRedisService } from '../../common/redis';
import { REDIS_SERVICE } from '../../database/di/symbols';
import { EOtpContext } from '../enums/auth.enum';

const OTP_TTL_MS = 10 * 60 * 1000; // code lifetime: 10 minutes
const OTP_MAX_ATTEMPTS = 5; // wrong entries before the code is burned
const OTP_MAX_RESENDS = 3; // resends per pending verification
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // min gap between sends

interface IOtpRecord<TPayload> {
  /** HMAC-SHA256 of the code — the plaintext OTP is never stored. */
  hash: string;
  attempts: number;
  resends: number;
  expiresAt: number;
  /** Display name used when (re)sending the email. */
  name: string;
  /** Context payload returned to the caller on successful verification. */
  payload: TPayload;
}

/**
 * Issues, delivers and verifies short-lived 6-digit OTP codes.
 *
 * Codes live only in Redis (hashed), scoped per context+email, with attempt
 * caps, resend caps and a resend cooldown. Delivery goes through the external
 * notification service (`otp-verification` template).
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_SERVICE)
    private readonly redisService: IRedisService,
  ) {}

  /**
   * Generate an OTP for `email`, persist its hash and dispatch the email.
   * `payload` is held server-side and handed back by {@link verify}.
   */
  async issue<TPayload>(
    context: EOtpContext,
    email: string,
    name: string,
    payload: TPayload,
  ): Promise<void> {
    await this.assertCooldown(context, email);

    const code = this.generateCode();
    const record: IOtpRecord<TPayload> = {
      hash: this.hashCode(code),
      attempts: 0,
      resends: 0,
      expiresAt: Date.now() + OTP_TTL_MS,
      name,
      payload,
    };

    await this.redisService.set(
      this.recordKey(context, email),
      JSON.stringify(record),
      OTP_TTL_MS,
    );
    await this.dispatch(context, email, name, code);
    await this.setCooldown(context, email);
  }

  /**
   * Re-issue a fresh code for an existing pending verification, preserving
   * the original payload. Attempts reset; resend count is capped.
   */
  async resend(context: EOtpContext, email: string): Promise<void> {
    await this.assertCooldown(context, email);

    const record = await this.getRecord<unknown>(context, email);
    if (!record) {
      throw new BadRequestException(
        'No pending verification found. Please start again.',
      );
    }
    if (record.resends >= OTP_MAX_RESENDS) {
      await this.redisService.del(this.recordKey(context, email));
      throw new HttpException(
        'Too many resend requests. Please start again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.generateCode();
    const updated: IOtpRecord<unknown> = {
      ...record,
      hash: this.hashCode(code),
      attempts: 0,
      resends: record.resends + 1,
      expiresAt: Date.now() + OTP_TTL_MS,
    };

    await this.redisService.set(
      this.recordKey(context, email),
      JSON.stringify(updated),
      OTP_TTL_MS,
    );
    await this.dispatch(context, email, record.name, code);
    await this.setCooldown(context, email);
  }

  /**
   * Validate a submitted code. On success the pending record is consumed and
   * its payload returned; on failure attempts are counted and capped.
   */
  async verify<TPayload>(
    context: EOtpContext,
    email: string,
    code: string,
  ): Promise<TPayload> {
    const key = this.recordKey(context, email);
    const record = await this.getRecord<TPayload>(context, email);

    if (!record || record.expiresAt <= Date.now()) {
      if (record) await this.redisService.del(key);
      throw new BadRequestException(
        'Verification code is invalid or has expired. Please request a new one.',
      );
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.redisService.del(key);
      throw new BadRequestException(
        'Too many incorrect attempts. Please request a new code.',
      );
    }

    if (!this.matches(code, record.hash)) {
      record.attempts += 1;
      const ttlLeft = record.expiresAt - Date.now();
      if (record.attempts >= OTP_MAX_ATTEMPTS || ttlLeft <= 0) {
        await this.redisService.del(key);
        throw new BadRequestException(
          'Too many incorrect attempts. Please request a new code.',
        );
      }
      await this.redisService.set(key, JSON.stringify(record), ttlLeft);
      throw new BadRequestException('Invalid verification code');
    }

    // Consume: a code is single-use.
    await this.redisService.delMany([key, this.cooldownKey(context, email)]);
    return record.payload;
  }

  /** Uniform 6-digit code via CSPRNG — leading zeros preserved. */
  private generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private hashCode(code: string): string {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    return createHmac('sha256', secret).update(code).digest('hex');
  }

  private matches(code: string, storedHash: string): boolean {
    const submitted = Buffer.from(this.hashCode(code), 'hex');
    const stored = Buffer.from(storedHash, 'hex');
    return (
      submitted.length === stored.length && timingSafeEqual(submitted, stored)
    );
  }

  private async getRecord<TPayload>(
    context: EOtpContext,
    email: string,
  ): Promise<IOtpRecord<TPayload> | null> {
    const raw = await this.redisService.get(this.recordKey(context, email));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as IOtpRecord<TPayload>;
    } catch {
      return null;
    }
  }

  private async assertCooldown(
    context: EOtpContext,
    email: string,
  ): Promise<void> {
    const active = await this.redisService.exists(
      this.cooldownKey(context, email),
    );
    if (active) {
      throw new HttpException(
        'Please wait a moment before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async setCooldown(
    context: EOtpContext,
    email: string,
  ): Promise<void> {
    await this.redisService.set(
      this.cooldownKey(context, email),
      '1',
      OTP_RESEND_COOLDOWN_MS,
    );
  }

  private recordKey(context: EOtpContext, email: string): string {
    return `otp:${context}:${email.toLowerCase()}`;
  }

  private cooldownKey(context: EOtpContext, email: string): string {
    return `otp:cooldown:${context}:${email.toLowerCase()}`;
  }

  /** Deliver the code through the notification service. */
  private async dispatch(
    context: EOtpContext,
    email: string,
    name: string,
    code: string,
  ): Promise<void> {
    const baseUrl = this.configService.get<string>('NOTIFICATION_SERVICE_URL');
    const apiKey = this.configService.get<string>(
      'NOTIFICATION_SERVICE_API_KEY',
    );
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    if (!baseUrl || !apiKey) {
      if (isProduction) {
        this.logger.error('Notification service is not configured');
        throw new ServiceUnavailableException(
          'Could not send verification code. Please try again later.',
        );
      }
      // Local development without the notification service running.
      this.logger.warn(
        `Notification service not configured — OTP for ${email} (${context}): ${code}`,
      );
      return;
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          template: 'otp_verification',
          appName: this.configService.get<string>('APP_NAME') ?? 'Stayly',
          appUrl:
            this.configService.get<string>('FRONTEND_URL') ??
            'http://localhost:3000',
          to: { email, name },
          data: { name, otp: code },
        }),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`OTP dispatch failed for ${email}: ${msg}`);
      throw new ServiceUnavailableException(
        'Could not send verification code. Please try again later.',
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(
        `OTP dispatch rejected [${response.status}] for ${email}: ${body}`,
      );
      throw new ServiceUnavailableException(
        'Could not send verification code. Please try again later.',
      );
    }

    this.logger.log(`OTP dispatched to ${email} (${context})`);
  }
}
