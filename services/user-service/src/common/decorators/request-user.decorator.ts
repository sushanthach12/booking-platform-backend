import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// Extend the Request interface to include the 'user' property
declare module 'express' {
  interface Request {
    user?: any; // Adjust the type of 'user' as needed
  }
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

export const RequestUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user?.id;
  },
);
