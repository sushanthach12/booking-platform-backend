import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { GatewayRequest } from '../common/interfaces/gateway-request.interface';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GatewayRequest>();
    const route = request.gatewayRoute;

    if (!route?.rateLimit) {
      return true;
    }

    const key = this.getRateLimitKey(request, route.service);
    const { ttl, limit } = route.rateLimit;

    try {
      const client = this.redisService.getClient();
      const current = await client.incr(key);

      if (current === 1) {
        await client.expire(key, ttl);
      }

      if (current > limit) {
        throw new HttpException(
          'Too many requests',
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

  private getRateLimitKey(request: GatewayRequest, service: string): string {
    const userId = request.user?.id ?? 'anonymous';
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0];
    const ip = forwardedIp ?? request.ip ?? 'unknown';
    return `rate_limit:${service}:${userId}:${ip}`;
  }
}
