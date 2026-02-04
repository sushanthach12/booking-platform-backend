import { ConfigService } from '@nestjs/config';
import { parseNumber } from './config.utils';

export type ServiceName = 'core';
// | 'property'
// | 'booking'
// | 'payment'
// | 'search'
// | 'notification'
// | 'content'
// | 'pricing'
// | 'admin';

export type ServiceConfig = {
  baseUrl: string;
  timeout: number;
  retries: number;
  rateLimit: {
    ttl: number;
    limit: number;
  };
};

export const servicesEnv = {
  core: {
    timeout: 'USER_SERVICE_TIMEOUT',
    retries: 'USER_SERVICE_RETRIES',
    rateLimitTtl: 'USER_SERVICE_RATE_LIMIT_TTL',
    rateLimitLimit: 'USER_SERVICE_RATE_LIMIT_LIMIT',
  },
  property: {
    timeout: 'PROPERTY_SERVICE_TIMEOUT',
    retries: 'PROPERTY_SERVICE_RETRIES',
    rateLimitTtl: 'PROPERTY_SERVICE_RATE_LIMIT_TTL',
    rateLimitLimit: 'PROPERTY_SERVICE_RATE_LIMIT_LIMIT',
  },
  booking: {
    timeout: 'BOOKING_SERVICE_TIMEOUT',
    retries: 'BOOKING_SERVICE_RETRIES',
    rateLimitTtl: 'BOOKING_SERVICE_RATE_LIMIT_TTL',
    rateLimitLimit: 'BOOKING_SERVICE_RATE_LIMIT_LIMIT',
  },
  payment: {
    timeout: 'PAYMENT_SERVICE_TIMEOUT',
    retries: 'PAYMENT_SERVICE_RETRIES',
    rateLimitTtl: 'PAYMENT_SERVICE_RATE_LIMIT_TTL',
    rateLimitLimit: 'PAYMENT_SERVICE_RATE_LIMIT_LIMIT',
  },
  search: {
    timeout: 'SEARCH_SERVICE_TIMEOUT',
    retries: 'SEARCH_SERVICE_RETRIES',
    rateLimitTtl: 'SEARCH_SERVICE_RATE_LIMIT_TTL',
    rateLimitLimit: 'SEARCH_SERVICE_RATE_LIMIT_LIMIT',
  },
  notification: {
    timeout: 'NOTIFICATION_SERVICE_TIMEOUT',
    retries: 'NOTIFICATION_SERVICE_RETRIES',
    rateLimitTtl: 'NOTIFICATION_SERVICE_RATE_LIMIT_TTL',
    rateLimitLimit: 'NOTIFICATION_SERVICE_RATE_LIMIT_LIMIT',
  },
  content: {
    timeout: 'CONTENT_SERVICE_TIMEOUT',
    retries: 'CONTENT_SERVICE_RETRIES',
    rateLimitTtl: 'CONTENT_SERVICE_RATE_LIMIT_TTL',
    rateLimitLimit: 'CONTENT_SERVICE_RATE_LIMIT_LIMIT',
  },
  pricing: {
    timeout: 'PRICING_SERVICE_TIMEOUT',
    retries: 'PRICING_SERVICE_RETRIES',
    rateLimitTtl: 'PRICING_SERVICE_RATE_LIMIT_TTL',
    rateLimitLimit: 'PRICING_SERVICE_RATE_LIMIT_LIMIT',
  },
  admin: {
    timeout: 'ADMIN_SERVICE_TIMEOUT',
    retries: 'ADMIN_SERVICE_RETRIES',
    rateLimitTtl: 'ADMIN_SERVICE_RATE_LIMIT_TTL',
    rateLimitLimit: 'ADMIN_SERVICE_RATE_LIMIT_LIMIT',
  },
} as const;

export const servicesDefaults: Record<ServiceName, ServiceConfig> = {
  core: {
    baseUrl: 'http://localhost:8001',
    timeout: 5000,
    retries: 3,
    rateLimit: {
      ttl: 60,
      limit: 100,
    },
  },
  // property: {
  //   baseUrl: 'http://localhost:8002',
  //   timeout: 5000,
  //   retries: 3,
  //   rateLimit: {
  //     ttl: 60,
  //     limit: 200,
  //   },
  // },
  // booking: {
  //   baseUrl: 'http://localhost:8003',
  //   timeout: 5000,
  //   retries: 3,
  //   rateLimit: {
  //     ttl: 60,
  //     limit: 10,
  //   },
  // },
  // payment: {
  //   baseUrl: 'http://localhost:8004',
  //   timeout: 10000,
  //   retries: 2,
  //   rateLimit: {
  //     ttl: 60,
  //     limit: 50,
  //   },
  // },
  // search: {
  //   baseUrl: 'http://localhost:8005',
  //   timeout: 5000,
  //   retries: 3,
  //   rateLimit: {
  //     ttl: 60,
  //     limit: 200,
  //   },
  // },
  // notification: {
  //   baseUrl: 'http://localhost:8006',
  //   timeout: 8000,
  //   retries: 2,
  //   rateLimit: {
  //     ttl: 60,
  //     limit: 100,
  //   },
  // },
  // content: {
  //   baseUrl: 'http://localhost:8007',
  //   timeout: 5000,
  //   retries: 3,
  //   rateLimit: {
  //     ttl: 60,
  //     limit: 100,
  //   },
  // },
  // pricing: {
  //   baseUrl: 'http://localhost:8008',
  //   timeout: 5000,
  //   retries: 3,
  //   rateLimit: {
  //     ttl: 60,
  //     limit: 100,
  //   },
  // },
  // admin: {
  //   baseUrl: 'http://localhost:8009',
  //   timeout: 5000,
  //   retries: 3,
  //   rateLimit: {
  //     ttl: 60,
  //     limit: 50,
  //   },
  // },
};

export const getServiceConfig = (
  configService: ConfigService,
  service: ServiceName,
): ServiceConfig => {
  const defaults = servicesDefaults[service];
  const env = servicesEnv[service];

  return {
    baseUrl: defaults.baseUrl,
    timeout: parseNumber(
      configService.get<string>(env.timeout),
      defaults.timeout,
    ),
    retries: parseNumber(
      configService.get<string>(env.retries),
      defaults.retries,
    ),
    rateLimit: {
      ttl: parseNumber(
        configService.get<string>(env.rateLimitTtl),
        defaults.rateLimit.ttl,
      ),
      limit: parseNumber(
        configService.get<string>(env.rateLimitLimit),
        defaults.rateLimit.limit,
      ),
    },
  };
};
