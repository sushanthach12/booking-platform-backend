import { RedisModuleOptions } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import { QueueOptions } from 'bullmq';
import { parseBoolean, parseNumber } from '../../config/config.utils';
import { coreDefaults, coreEnv } from '../../config/core.config';

export const redisConfig = (
  configService: ConfigService,
): RedisModuleOptions => {
  const redisUrl = configService.get<string>(coreEnv.redisUrl);
  const host =
    configService.get<string>(coreEnv.redisHost) ?? coreDefaults.redis.host;
  const port = parseNumber(
    configService.get<string>(coreEnv.redisPort),
    coreDefaults.redis.port,
  );
  const connectTimeout = parseNumber(
    configService.get<string>(coreEnv.redisConnectTimeout),
    coreDefaults.redis.connectTimeout,
  );
  const maxRetriesPerRequest = parseNumber(
    configService.get<string>(coreEnv.redisMaxRetriesPerRequest),
    coreDefaults.redis.maxRetriesPerRequest,
  );
  const retryDelay = parseNumber(
    configService.get<string>(coreEnv.redisRetryDelayMs),
    coreDefaults.redis.retryDelayMs,
  );
  const retryMaxDelay = parseNumber(
    configService.get<string>(coreEnv.redisRetryMaxDelayMs),
    coreDefaults.redis.retryMaxDelayMs,
  );
  const maxRetries = parseNumber(
    configService.get<string>(coreEnv.redisMaxRetries),
    coreDefaults.redis.maxRetries,
  );
  const keepAlive = parseNumber(
    configService.get<string>(coreEnv.redisKeepAlive),
    coreDefaults.redis.keepAlive,
  );
  const enableReadyCheck = parseBoolean(
    configService.get<string>(coreEnv.redisEnableReadyCheck),
    coreDefaults.redis.enableReadyCheck,
  );
  const lazyConnect = parseBoolean(
    configService.get<string>(coreEnv.redisLazyConnect),
    coreDefaults.redis.lazyConnect,
  );
  const env = configService.get<string>(coreEnv.nodeEnv) ?? coreDefaults.env;

  const config: RedisModuleOptions = {
    type: 'single',
    url: redisUrl ?? `redis://${host}:${port}`,
    options: {
      connectionName: `core-${env}`,
      connectTimeout,
      maxRetriesPerRequest,
      enableReadyCheck,
      lazyConnect,
      keepAlive,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
      tls: {
        rejectUnauthorized: false,
      },
      retryStrategy: (times) => {
        if (maxRetries > 0 && times > maxRetries) {
          return null;
        }
        const delay = retryDelay * 2 ** Math.max(times - 1, 0);
        return Math.min(delay, retryMaxDelay);
      },
      reconnectOnError: (error) => {
        const message = error?.message ?? '';
        return (
          message.includes('READONLY') ||
          message.includes('CLUSTERDOWN') ||
          message.includes('LOADING')
        );
      },
    },
  };

  return config;
};

export const getRedisConnectionOptions = (
  configService: ConfigService,
): QueueOptions => {
  const redisUrl = configService.getOrThrow<string>(coreEnv.redisUrl);

  return {
    connection: {
      url: redisUrl, // ← just pass the URL directly
      tls: { rejectUnauthorized: false },
    },
  };
};

import { Redis } from 'ioredis';

export const createRedisClient = (configService: ConfigService): Redis => {
  const redisUrl = configService.getOrThrow<string>(coreEnv.redisUrl);
  const isTls = redisUrl.startsWith('rediss://');

  const client = new Redis(redisUrl, {
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null,
  });

  return client;
};
