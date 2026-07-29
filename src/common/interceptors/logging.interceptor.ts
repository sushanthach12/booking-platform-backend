import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

const REDACTED = '[REDACTED]';

// Headers that carry credentials — never logged, regardless of environment.
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-webhook-signature',
  'x-refresh-token',
]);

// Body fields that carry credentials or secrets, matched case-insensitively.
const SENSITIVE_BODY_FIELDS =
  /^(password|confirmPassword|currentPassword|newPassword|otp|otpCode|token|accessToken|refreshToken|secret|clientSecret|apiKey|cardNumber|cvv|cvc|pin|accountNumber|ifsc)$/i;

function redactBody(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactBody);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        SENSITIVE_BODY_FIELDS.test(key) ? REDACTED : redactBody(val),
      ]),
    );
  }
  return value;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, headers, query, body } = request;
    const path = request.path ?? request.url?.split('?')[0] ?? '/';

    if (path === '/favicon.ico') {
      return next.handle();
    }

    const queryString = Object.entries(query || {})
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return value
            .map(
              (v) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`,
            )
            .join('&');
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
      })
      .join('&');
    const fullUrl = `${path}${queryString ? `?${queryString}` : ''}`;

    const excludedHeaders = [
      'host',
      'content-length',
      'connection',
      'transfer-encoding',
    ];
    const headerEntries = Object.entries(headers || {})
      .filter(([key]) => !excludedHeaders.includes(key.toLowerCase()))
      .map(([key, value]) => {
        if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
          return `-H '${key}: ${REDACTED}'`;
        }
        const headerValue = Array.isArray(value)
          ? value.join(', ')
          : String(value);
        const escapedValue = headerValue.replace(/'/g, "'\\''");
        return `-H '${key}: ${escapedValue}'`;
      })
      .join(' ');

    let bodyPart = '';
    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      const safeBody = redactBody(body);
      const bodyStr =
        typeof safeBody === 'string' ? safeBody : JSON.stringify(safeBody);
      const escapedBody = bodyStr.replace(/'/g, "'\\''");
      bodyPart = ` --data-raw '${escapedBody}'`;
    }

    const curlCommand =
      `curl -X ${method} '${fullUrl}' ${headerEntries}${bodyPart}`.trim();

    this.logger.debug(`curl command: ${curlCommand}`);

    return next.handle();
  }
}
