import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { loadEnvConfig } from './common/config/env.config';

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

  app.setGlobalPrefix('api/core');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.init();
  return app;
}

async function getHandler() {
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
