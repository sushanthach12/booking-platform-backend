import { RedisModuleOptions } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import { parseBoolean, parseNumber } from '../../config/config.utils';
import { gatewayDefaults, gatewayEnv } from '../../config/gateway.config';

export const redisConfig = (
  configService: ConfigService,
): RedisModuleOptions => {
  const redisUrl = configService.get<string>(gatewayEnv.redisUrl);
  const host =
    configService.get<string>(gatewayEnv.redisHost) ??
    gatewayDefaults.redis.host;
  const port = parseNumber(
    configService.get<string>(gatewayEnv.redisPort),
    gatewayDefaults.redis.port,
  );
  const connectTimeout = parseNumber(
    configService.get<string>(gatewayEnv.redisConnectTimeout),
    gatewayDefaults.redis.connectTimeout,
  );
  const maxRetriesPerRequest = parseNumber(
    configService.get<string>(gatewayEnv.redisMaxRetriesPerRequest),
    gatewayDefaults.redis.maxRetriesPerRequest,
  );
  const retryDelay = parseNumber(
    configService.get<string>(gatewayEnv.redisRetryDelayMs),
    gatewayDefaults.redis.retryDelayMs,
  );
  const retryMaxDelay = parseNumber(
    configService.get<string>(gatewayEnv.redisRetryMaxDelayMs),
    gatewayDefaults.redis.retryMaxDelayMs,
  );
  const maxRetries = parseNumber(
    configService.get<string>(gatewayEnv.redisMaxRetries),
    gatewayDefaults.redis.maxRetries,
  );
  const keepAlive = parseNumber(
    configService.get<string>(gatewayEnv.redisKeepAlive),
    gatewayDefaults.redis.keepAlive,
  );
  const enableReadyCheck = parseBoolean(
    configService.get<string>(gatewayEnv.redisEnableReadyCheck),
    gatewayDefaults.redis.enableReadyCheck,
  );
  const lazyConnect = parseBoolean(
    configService.get<string>(gatewayEnv.redisLazyConnect),
    gatewayDefaults.redis.lazyConnect,
  );
  const env =
    configService.get<string>(gatewayEnv.nodeEnv) ?? gatewayDefaults.env;

  const config: RedisModuleOptions = {
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

  return config;
};
