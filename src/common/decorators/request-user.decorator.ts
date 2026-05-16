import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from '../types/users.types';

// Extend the Request interface to include the 'user' property
declare module 'express' {
  interface Request {
    user?: any; // Adjust the type of 'user' as needed
  }
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.headers.user
      ? (JSON.parse(request.headers.user as string) as RequestUser)
      : (request.user ?? null);

    if (!user) {
      throw new UnauthorizedException('No user found');
    }
    return user;
  },
);

export const RequestUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    // JwtAuthGuard sets request.user after verifying the Bearer token
    if (request.user?.id) return request.user.id;
    // Fallback: gateway may forward user as a JSON header
    if (request.headers.user) {
      return (JSON.parse(request.headers.user as string) as RequestUser).id;
    }
    throw new UnauthorizedException('User not authenticated');
  },
);
