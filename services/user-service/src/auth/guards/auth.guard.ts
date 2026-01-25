import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../../jwt/services/jwt.service';

/**
 * Authentication Guard
 * Manually validates JWT tokens from Authorization header
 *
 * Usage:
 * @UseGuards(AuthGuard)
 * async protectedRoute(@CurrentUser() user: RequestUser) { ... }
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      // Extract token from Authorization header
      const token = this.extractTokenFromHeader(request);

      if (!token) {
        this.logger.warn('No token provided in request');
        throw new UnauthorizedException('No token provided');
      }

      // Verify and decode token (defaults to access token)
      const payload = this.jwtService.verifyToken(token, 'access');

      // Attach user to request object
      (request as any).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        `JWT validation error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Extract JWT token from Authorization header
   * Supports: "Bearer <token>" format
   */
  private extractTokenFromHeader(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const parts = authorization.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}
