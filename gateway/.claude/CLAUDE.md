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
Request → JwtAuthGuard → RateLimitGuard → GatewayController(@All('*'))
        → RoutingService → ProxyService → Downstream Service
```

Global interceptors (in order): `LoggingInterceptor` → `TimeoutInterceptor` → `TransformInterceptor`  
Global filter: `HttpExceptionFilter` normalises all errors to `{ statusCode, message, timestamp }`.

## Directory Structure

```
src/
├── app.module.ts                          # Root module, wires all providers + guards
├── main.ts                                # Bootstrap, CORS, global pipes
├── vercel.ts                              # Serverless handler for Vercel deployment
│
├── common/
│   ├── decorators/
│   │   └── public.decorator.ts            # @Public() — bypasses JwtAuthGuard
│   ├── enums/
│   │   └── config.enum.ts                 # Enum keys for config access
│   └── interfaces/
│       └── gateway-request.interface.ts   # Extends Express Request with req.user
│
├── config/
│   ├── index.ts                           # Single boot-time env load (loadEnvConfig)
│   ├── config.utils.ts                    # parseNumber / parseBoolean / parseCsv helpers
│   ├── gateway.config.ts                  # Server / CORS / auth config shape
│   └── services.config.ts                 # Route prefix → baseUrl + timeout map
│
├── controllers/
│   ├── gateway.controller.ts              # @All('*') catch-all — proxies every request
│   └── health.controller.ts               # GET /health — public, no auth
│
├── filters/
│   └── http-exception.filter.ts           # Global error normalisation
│
├── guards/
│   ├── jwt-auth.guard.ts                  # JWT validation + public-routes list
│   └── rate-limit.guard.ts                # Redis-backed rate limiting per user/IP
│
├── interceptors/
│   ├── logging.interceptor.ts             # Logs request as curl command
│   ├── timeout.interceptor.ts             # Kills requests exceeding per-service timeout
│   └── transform.interceptor.ts           # Wraps response in standard envelope
│
├── redis/
│   ├── redis.module.ts                    # Global module, exports RedisService
│   ├── redis.service.ts                   # ioredis client wrapper
│   └── config/
│       └── redis.config.ts                # REDIS_URL / REDIS_HOST / REDIS_PORT loader
│
└── services/
    ├── routing.service.ts                 # Path prefix → { baseUrl, timeout }
    └── proxy.service.ts                   # Axios HTTP forwarding logic
```

## Adding a New Downstream Service

1. Add env vars `<SERVICE>_BASE_URL` and optionally `<SERVICE>_TIMEOUT` — see [env vars reference](references/env-vars.md)
2. Register route prefix in `src/config/services.config.ts`
3. Add public routes (if any) in `src/guards/jwt-auth.guard.ts`
4. Document the prefix in [routing reference](references/routing.md)

## Conventions

- Strict TypeScript — no untyped `any`
- No `console.log` — use NestJS `Logger`
- DTOs validated with `class-validator`
- Config loaded once at boot via `src/config/index.ts`; never read `process.env` directly elsewhere

## Pre-Change Quality Protocol

Before making any change, run through this checklist and self-verify each item:

```
[ ] 1. Read the target file(s) — understand current behaviour before touching anything
[ ] 2. Check type safety — will the change break strict TypeScript? Run: pnpm build
[ ] 3. Check lint — does it violate ESLint rules? Run: pnpm lint
[ ] 4. Check tests — do existing tests still pass? Run: pnpm test
[ ] 5. Check contracts — does the change affect the proxy request/response shape?
        If yes → verify downstream services handle it
[ ] 6. Check public-routes list — does the change add/remove routes that need auth exemption?
[ ] 7. Self-review the diff — would a reviewer flag anything? (naming, error handling, logging)
```

**Self-feedback loop:** After writing code, re-read the changed file and ask:
- Does the change do exactly what was requested — nothing more, nothing less?
- Is there anything a future dev would find confusing without a comment?
- Could this break any other layer (guard → interceptor → filter → proxy)?

Fix before reporting done. Do not mark a task complete if `pnpm build` or `pnpm lint` fails.

## References

- [Environment Variables](references/env-vars.md)
- [Routing & Proxy Architecture](references/routing.md)
- [Auth, Rate Limiting & Interceptors](references/auth.md)
