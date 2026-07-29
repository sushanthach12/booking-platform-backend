export const gatewayEnv = {
  jwtSecret: 'JWT_SECRET',
  jwtExpiresIn: 'JWT_EXPIRY',
} as const;

// No secret default here on purpose — a missing JWT_SECRET must fail
// startup, not silently sign/verify tokens with a value that's public in
// git history.
export const gatewayDefaults = {
  jwt: {
    expiresIn: '1h',
  },
} as const;
