import { RedisModuleOptions } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';

export const redisConfig = (
  configService: ConfigService,
): RedisModuleOptions => {
  const redisUrl = configService.get<string>('redis.url');
  const host = configService.get<string>('redis.host') ?? 'localhost';
  const port = configService.get<number>('redis.port') ?? 6379;
  const connectTimeout =
    configService.get<number>('redis.connectTimeout') ?? 10000;
  const maxRetriesPerRequest =
    configService.get<number>('redis.maxRetriesPerRequest') ?? 3;
  const retryDelay = configService.get<number>('redis.retryDelay') ?? 200;
  const retryMaxDelay =
    configService.get<number>('redis.retryMaxDelay') ?? 2000;
  const maxRetries = configService.get<number>('redis.maxRetries') ?? 0;
  const keepAlive = configService.get<number>('redis.keepAlive') ?? 30000;
  const enableReadyCheck =
    configService.get<boolean>('redis.enableReadyCheck') ?? true;
  const lazyConnect = configService.get<boolean>('redis.lazyConnect') ?? false;
  const env = configService.get<string>('gateway.env') ?? 'development';

  return {
    type: 'single',
    url: redisUrl ?? `redis://${host}:${port}`,
    options: {
      connectionName: `gateway-${env}`,
      connectTimeout,
      maxRetriesPerRequest,
      enableReadyCheck,
      lazyConnect,
      keepAlive,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
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
};
