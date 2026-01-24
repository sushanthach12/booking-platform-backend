export const gatewayConfig = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    gateway: {
      env: process.env.NODE_ENV ?? 'development',
      port: Number(process.env.PORT ?? 3000),
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
    },
  };
};
