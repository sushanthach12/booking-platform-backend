import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnvConfig } from './common/config/env.config';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  loadEnvConfig(logger);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Enable global validation pipe (align with gateway: reject extra props, transform types)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable shutdown hooks
  app.enableShutdownHooks();

  const PORT = process.env.PORT ?? 8000;

  await app.listen(PORT, () => {
    logger.debug(`Core service is running on port ${PORT}`);
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
