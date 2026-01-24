import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  const allowedOrigins = configService.get<string[]>(
    'gateway.cors.allowedOrigins',
  ) ?? ['*'];
  const corsCredentials =
    configService.get<boolean>('gateway.cors.credentials') ?? true;

  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: corsCredentials,
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global request logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable shutdown hooks
  app.enableShutdownHooks();

  const PORT = configService.get<number>('gateway.port') ?? 8000;

  await app.listen(PORT, () => {
    logger.debug(`Gateway is running on port ${PORT}`);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.stack : String(reason),
  });

  // Log additional context if it's an Error
  if (reason instanceof Error) {
    logger.error(`Error name: ${reason.name}`);
    logger.error(`Error message: ${reason.message}`);
  }

  // In production, you might want to attempt graceful shutdown
  // For now, we'll exit to prevent the application from continuing in an undefined state
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error.stack || error.message);
  logger.error(`Error name: ${error.name}`);
  logger.error(`Error message: ${error.message}`);

  // Uncaught exceptions are more critical - exit immediately
  process.exit(1);
});

bootstrap().catch((error: Error) => {
  logger.error('Failed to start application', error.stack || error.message);

  // Log additional error context
  if (error instanceof Error) {
    logger.error(`Error name: ${error.name}`);
    logger.error(`Error message: ${error.message}`);

    // Check for common error types
    if (error.message.includes('EADDRINUSE')) {
      logger.error(
        `Port ${process.env.PORT ?? 8000} is already in use. Please use a different port.`,
      );
    } else if (error.message.includes('ECONNREFUSED')) {
      logger.error(
        'Database connection refused. Please check your database configuration.',
      );
    } else if (error.message.includes('MODULE_NOT_FOUND')) {
      logger.error(
        'Required module not found. Please check your dependencies.',
      );
    }
  }

  // Exit with error code
  process.exit(1);
});
