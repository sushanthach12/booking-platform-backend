import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../../jwt/types/jwt.types';

/**
 * Decorator to extract the current user from the request
 * Use with AuthGuard to get the authenticated user
 *
 * @example
 * @UseGuards(AuthGuard)
 * async getProfile(@CurrentUser() user: RequestUser) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | any => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;

    if (!user) {
      return null;
    }

    // If specific property requested, return that property
    if (data) {
      return user[data];
    }

    // Otherwise return entire user object
    return user;
  },
);
