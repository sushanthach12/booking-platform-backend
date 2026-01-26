import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { GatewayRequest } from '../common/interfaces/gateway-request.interface';
import { gatewayDefaults, gatewayEnv } from '../config/gateway.config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GatewayRequest>();
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
      if (!userId) {
        throw new UnauthorizedException('Invalid token');
      }

      // TODO: validate the user

      request.headers['x-user-id'] = userId;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: GatewayRequest): string | undefined {
    const authorization = request.headers?.authorization;
    const [type, token] = authorization?.split(' ') ?? [];
    return type === 'JWT' ? token : undefined;
  }
}
