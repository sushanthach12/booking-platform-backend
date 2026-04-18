export const gatewayEnv = {
  jwtSecret: 'JWT_SECRET',
  jwtExpiresIn: 'JWT_EXPIRY',
} as const;

export const gatewayDefaults = {
  jwt: {
    secret: 'change-me',
    expiresIn: '1h',
  },
} as const;
