export const servicesConfig = () => ({
  services: {
    user: {
      baseUrl: 'http://localhost:8001',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    property: {
      baseUrl: 'http://localhost:8002',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 200,
      },
    },
    booking: {
      baseUrl: 'http://localhost:8003',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 10,
      },
    },
    payment: {
      baseUrl: 'http://localhost:8004',
      timeout: 10000,
      retries: 2,
      rateLimit: {
        ttl: 60,
        limit: 50,
      },
    },
    search: {
      baseUrl: 'http://localhost:8005',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 200,
      },
    },
    notification: {
      baseUrl: 'http://localhost:8006',
      timeout: 8000,
      retries: 2,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    content: {
      baseUrl: 'http://localhost:8007',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    pricing: {
      baseUrl: 'http://localhost:8008',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    admin: {
      baseUrl: 'http://localhost:8009',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 50,
      },
    },
  },
});
