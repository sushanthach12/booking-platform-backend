import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { gatewayDefaults, gatewayEnv } from '../common/config/gateway.config';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import type { ApiRequest } from '../common/interfaces/request.interface';
import { IRedisService } from '../common/redis';
import { REDIS_SERVICE } from '../database/di/symbols';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(REDIS_SERVICE) private readonly redisService: IRedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Still try to populate request.user so optional-auth endpoints can use it
      const request = context.switchToHttp().getRequest<ApiRequest>();
      const token = this.extractTokenFromHeader(request);
      if (token) {
        try {
          const secret =
            this.configService.get<string>(gatewayEnv.jwtSecret) ??
            gatewayDefaults.jwt.secret;
          const payload = await this.jwtService.verifyAsync<{
            sub: string;
            role: string;
            jti?: string;
          }>(token, { secret });
          if (payload.sub && payload.role) {
            request.user = { id: payload.sub, role: payload.role };
          }
        } catch {
          // Invalid token on public route — ignore, proceed unauthenticated
        }
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<ApiRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret =
        this.configService.get<string>(gatewayEnv.jwtSecret) ??
        gatewayDefaults.jwt.secret;

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        role: string;
        jti?: string;
      }>(token, { secret });

      const userId = payload.sub;
      const role = payload.role;
      if (!userId || !role) {
        throw new UnauthorizedException('Invalid token');
      }

      // Check blacklist (logout / token rotation)
      if (payload.jti) {
        const blacklisted = await this.redisService.exists(
          `blacklist:${payload.jti}`,
        );
        if (blacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      request.user = { id: userId, role };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: ApiRequest): string | undefined {
    const authorization = request.headers?.authorization;
    const [type, token] = authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
