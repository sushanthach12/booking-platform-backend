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
    const user = JSON.parse(request.headers.user as string) as RequestUser;
    return user.id;
  },
);
