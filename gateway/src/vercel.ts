import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { loadEnvConfig } from './config';
import { parseBoolean, parseCsv } from './config/config.utils';
import { gatewayDefaults, gatewayEnv } from './config/gateway.config';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

const logger = new Logger('Bootstrap');

const expressApp = express();
let appPromise: ReturnType<typeof createApp> | null = null;

async function createApp() {
  loadEnvConfig(logger);

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    },
  );

  const configService = app.get(ConfigService);

  const allowedOriginsRaw = configService.get<string>(
    gatewayEnv.allowedOrigins,
  );
  const parsedOrigins = parseCsv(allowedOriginsRaw);
  const allowedOrigins =
    parsedOrigins.length > 0
      ? parsedOrigins
      : gatewayDefaults.cors.allowedOrigins;
  const corsCredentials = parseBoolean(
    configService.get<string>(gatewayEnv.corsCredentials),
    gatewayDefaults.cors.credentials,
  );

  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: corsCredentials,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  await app.init();
  return app;
}

async function getHandler(): Promise<express.Express> {
  if (!appPromise) {
    appPromise = createApp();
  }
  await appPromise;
  return expressApp;
}

export default async function handler(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const app = await getHandler();
  app(req, res);
}
