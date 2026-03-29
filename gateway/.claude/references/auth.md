# Auth & Rate Limiting

## JWT Authentication
`src/guards/jwt-auth.guard.ts`

- Applied globally via `APP_GUARD` provider in `AppModule`
- Validates `Authorization: Bearer <token>` on every request
- Decodes payload into `req.user` (see `GatewayRequest` interface)
- Skip auth on a route with `@Public()` decorator (`src/common/decorators/public.decorator.ts`)

### Making a Route Public
```ts
import { Public } from '../common/decorators/public.decorator';

@Public()
@Get('health')
health() { ... }
```

### JWT Config
- Secret: `JWT_SECRET` env var
- Expiry: `JWT_EXPIRY` env var (seconds, default `86400`)
- Configured in `AppModule` via `JwtModule.registerAsync`

---

## Rate Limiting
`src/guards/rate-limit.guard.ts`

- Applied globally after `JwtAuthGuard`
- Key: authenticated `userId` if present, otherwise client IP
- Backed by Redis (ioredis via `RedisModule`)
- Limits configurable in guard (currently hardcoded — extract to config if needed)

### Redis Module
`src/redis/redis.module.ts` — global module, exported `RedisService`
`src/redis/redis.service.ts` — wraps ioredis client
`src/redis/config/redis.config.ts` — reads `REDIS_URL` / `REDIS_HOST` / `REDIS_PORT`

---

## Request Interface
`src/common/interfaces/gateway-request.interface.ts`

Extends Express `Request` with:
```ts
interface GatewayRequest extends Request {
  user?: {
    sub: string;       // userId
    email: string;
    role: string;
    [key: string]: unknown;
  };
}
```

---

## Interceptors (global, in order)
| Interceptor | File | Purpose |
|---|---|---|
| `LoggingInterceptor` | `interceptors/logging.interceptor.ts` | Logs request as curl command |
| `TimeoutInterceptor` | `interceptors/timeout.interceptor.ts` | Kills slow requests |
| `TransformInterceptor` | `interceptors/transform.interceptor.ts` | Wraps response in standard shape |

## Global Exception Filter
`src/filters/http-exception.filter.ts` — normalises all errors to `{ statusCode, message, timestamp }`.
