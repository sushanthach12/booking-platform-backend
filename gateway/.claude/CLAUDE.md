# Gateway Service — CLAUDE.md

## What This Is

NestJS 11 API Gateway. Single entry point that authenticates, rate-limits, and proxies all requests to downstream microservices.

## Commands

```bash
pnpm dev          # start with hot-reload
pnpm build        # compile to dist/
pnpm lint         # eslint --fix
pnpm test         # jest unit tests
pnpm test:e2e     # end-to-end tests
```

## Architecture at a Glance

```
Request → JwtAuthGuard → RateLimitGuard → GatewayController(*) → ProxyService → Downstream
```

- **`RoutingService`** maps path prefix → target base URL + timeout
- **`ProxyService`** forwards request (method, headers, body) via Axios
- **`@Public()`** decorator bypasses JWT on a route (health check, auth endpoints)
- Redis backs rate limiting; ioredis client lives in `RedisModule`

## Key Files

| File                                    | Role                                |
| --------------------------------------- | ----------------------------------- |
| `src/controllers/gateway.controller.ts` | Catch-all `@All('*')` — entry point |
| `src/services/routing.service.ts`       | Path → service URL mapping          |
| `src/services/proxy.service.ts`         | HTTP forwarding logic               |
| `src/guards/jwt-auth.guard.ts`          | JWT validation                      |
| `src/guards/rate-limit.guard.ts`        | Redis-backed rate limiting          |
| `src/config/services.config.ts`         | Service URL configuration           |
| `src/vercel.ts`                         | Vercel serverless handler           |

## Adding a New Downstream Service

1. Add env vars `<SERVICE>_BASE_URL` and `<SERVICE>_TIMEOUT` (see [env vars reference](references/env-vars.md))
2. Register route prefix in `src/config/services.config.ts`
3. Add public routes (if any) in `src/guards/jwt-auth.guard.ts`

## Conventions

- Strict TypeScript — no untyped `any`
- No `console.log` — use NestJS `Logger`
- DTOs validated with `class-validator`
- Config loaded once at boot via `src/config/index.ts`; never read `process.env` directly elsewhere

## References

- [Environment Variables](references/env-vars.md)
- [Routing & Proxy Architecture](references/routing.md)
- [Auth & Rate Limiting](references/auth.md)
