import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { ApiRequest } from '../common/interfaces/request.interface';
import { RedisConnectionService } from '../common/redis/redis.conn.service';

interface RouteLimit {
  pattern: RegExp;
  methods?: string[];
  limit: number;
  ttl: number; // seconds
}

const ROUTE_LIMITS: RouteLimit[] = [
  // Auth sensitive endpoints — 5 req/min
  {
    pattern: /\/auth\/(login|register|signup|forgot-password)/,
    limit: 5,
    ttl: 60,
  },
  // Property search — 30 req/min
  {
    pattern: /\/properties\/(search|availability)/,
    limit: 30,
    ttl: 60,
  },
  // Booking creation — 10 req/min
  {
    pattern: /\/bookings/,
    methods: ['POST'],
    limit: 10,
    ttl: 60,
  },
];

const DEFAULT_LIMIT = 100;
const DEFAULT_TTL = 60;

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private redisService: RedisConnectionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiRequest>();

    const { limit, ttl } = this.getRouteConfig(request);
    const key = this.getRateLimitKey(request, limit, ttl);

    try {
      const client = this.redisService.getClient();
      const current = await client.incr(key);

      if (current === 1) {
        await client.expire(key, ttl);
      }

      if (current > limit) {
        throw new HttpException(
          { message: 'Too many requests', retryAfter: ttl },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.warn(
        `Rate limit check failed for ${request.method} ${request.path}`,
      );
    }

    return true;
  }

  private getRouteConfig(request: ApiRequest): { limit: number; ttl: number } {
    const path = request.path ?? '';
    const method = (request.method ?? 'GET').toUpperCase();

    for (const route of ROUTE_LIMITS) {
      if (!route.pattern.test(path)) continue;
      if (route.methods && !route.methods.includes(method)) continue;
      return { limit: route.limit, ttl: route.ttl };
    }

    return { limit: DEFAULT_LIMIT, ttl: DEFAULT_TTL };
  }

  private getRateLimitKey(
    request: ApiRequest,
    limit: number,
    ttl: number,
  ): string {
    const userId = request.user?.id ?? 'anon';
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0];
    const ip = forwardedIp ?? request.ip ?? 'unknown';
    // Bucket key encodes the limit/ttl so different routes get isolated counters
    return `rate:${limit}:${ttl}:${userId}:${ip}:${request.path}`;
  }
}
