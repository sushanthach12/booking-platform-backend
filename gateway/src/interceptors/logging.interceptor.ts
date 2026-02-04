import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

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

    // Build full URL with protocol, host, path, and query parameters
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
    const fullUrl = `{{ApiGateway}}${path}${queryString ? `?${queryString}` : ''}`;

    // Build headers, excluding ones that curl handles automatically
    const excludedHeaders = [
      'host',
      'content-length',
      'connection',
      'transfer-encoding',
    ];
    const headerEntries = Object.entries(headers || {})
      .filter(([key]) => !excludedHeaders.includes(key.toLowerCase()))
      .map(([key, value]) => {
        const headerValue = Array.isArray(value)
          ? value.join(', ')
          : String(value);
        // Escape single quotes in header values
        const escapedValue = headerValue.replace(/'/g, "'\\''");
        return `-H '${key}: ${escapedValue}'`;
      })
      .join(' ');

    // Build body part
    let bodyPart = '';
    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      // Escape single quotes in body
      const escapedBody = bodyStr.replace(/'/g, "'\\''");
      bodyPart = ` --data-raw '${escapedBody}'`;
    }

    const curlCommand =
      `curl -X ${method} '${fullUrl}' ${headerEntries}${bodyPart}`.trim();

    this.logger.debug(`curl command: ${curlCommand}`);

    return next.handle();
  }
}
