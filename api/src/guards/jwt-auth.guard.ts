import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ApiRequest } from '../common/interfaces/request.interface';
import { gatewayDefaults, gatewayEnv } from '../common/config/gateway.config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret =
        this.configService.get<string>(gatewayEnv.jwtSecret) ??
        gatewayDefaults.jwt.secret;

      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      const userId = payload.sub;
      const role = payload.role;
      if (!userId || !role) {
        throw new UnauthorizedException('Invalid token');
      }

      request.user = {
        id: userId,
        role: role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: ApiRequest): string | undefined {
    const authorization = request.headers?.authorization;
    const [type, token] = authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
