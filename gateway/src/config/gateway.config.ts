export const gatewayConfig = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    gateway: {
      env: process.env.NODE_ENV ?? 'development',
      port: Number(process.env.PORT ?? 8000),
      httpTimeout: Number(process.env.HTTP_TIMEOUT ?? 5000),
      cors: {
        allowedOrigins: allowedOrigins?.length ? allowedOrigins : ['*'],
        credentials: process.env.CORS_CREDENTIALS !== 'false',
      },
    },
    jwt: {
      secret: process.env.JWT_SECRET ?? 'change-me',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    },
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT ?? 10000),
      maxRetriesPerRequest: Number(
        process.env.REDIS_MAX_RETRIES_PER_REQUEST ?? 3,
      ),
      retryDelay: Number(process.env.REDIS_RETRY_DELAY_MS ?? 200),
      retryMaxDelay: Number(process.env.REDIS_RETRY_MAX_DELAY_MS ?? 2000),
      maxRetries: Number(process.env.REDIS_MAX_RETRIES ?? 0),
      keepAlive: Number(process.env.REDIS_KEEP_ALIVE ?? 30000),
      startupTimeout: Number(process.env.REDIS_STARTUP_TIMEOUT ?? 15000),
      enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== 'false',
      lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
    },
  };
};
