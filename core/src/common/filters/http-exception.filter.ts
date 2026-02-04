import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errors: { field: string; message: string }[] = [];
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();

      // 🔹 class-validator
      if (typeof res === 'object' && Array.isArray((res as any).message)) {
        errors = (res as any).message.map((msg: string) => ({
          field: extractField(msg),
          message: normalizeMessage(msg),
        }));
      }

      // 🔹 Zod / custom validation
      else if (typeof res === 'object' && Array.isArray((res as any).errors)) {
        errors = (res as any).errors;
      }

      // 🔹 simple string
      else if (typeof res === 'string') {
        message = res;
      }

      // 🔹 fallback object
      else if (typeof res === 'object' && (res as any).message) {
        message = (res as any).message;
      }
    }

    // ✅ Build joined message if validation errors exist
    if (errors.length > 0) {
      message = errors.map((e) => e.message).join(', ');
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
    );

    response.status(status).json({
      status_code: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(errors.length ? { errors } : {}),
    });
  }
}

/**
 * address.latitude should not be empty
 * -> address.latitude
 */
function extractField(message: string): string {
  return message.split(' ')[0];
}

/**
 * Remove noisy validator wording
 */
function normalizeMessage(message: string): string {
  return message.replace(
    'must be a number conforming to the specified constraints',
    'must be a number',
  );
}
