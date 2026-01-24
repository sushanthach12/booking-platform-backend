export const servicesConfig = () => ({
  services: {
    user: {
      baseUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    property: {
      baseUrl: process.env.PROPERTY_SERVICE_URL || 'http://localhost:3002',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 200,
      },
    },
    booking: {
      baseUrl: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 10,
      },
    },
    payment: {
      baseUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
      timeout: 10000,
      retries: 2,
      rateLimit: {
        ttl: 60,
        limit: 50,
      },
    },
    search: {
      baseUrl: process.env.SEARCH_SERVICE_URL || 'http://localhost:3005',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 200,
      },
    },
    notification: {
      baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
      timeout: 3000,
      retries: 2,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    content: {
      baseUrl: process.env.CONTENT_SERVICE_URL || 'http://localhost:3007',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    pricing: {
      baseUrl: process.env.PRICING_SERVICE_URL || 'http://localhost:3008',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    admin: {
      baseUrl: process.env.ADMIN_SERVICE_URL || 'http://localhost:3009',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 50,
      },
    },
  },
});
