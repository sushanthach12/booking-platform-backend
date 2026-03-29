# Routing & Proxy Architecture

## Request Flow
```
Client
  └─ GatewayController @All('*')
       └─ RoutingService.resolve(path) → { baseUrl, timeout }
            └─ ProxyService.forward(req, baseUrl, timeout)
                 └─ Axios → Downstream Service
                      └─ Response piped back to client
```

## RoutingService
`src/services/routing.service.ts`

- Matches incoming path prefix against registered service routes
- Returns `{ baseUrl, timeout }` or throws `404` if no match
- Supports wildcard sub-paths (e.g., `/api/core/v1/auth/login` → core service)

## ProxyService
`src/services/proxy.service.ts`

- Forwards: method, path, query params, headers, body
- Strips gateway-internal headers before forwarding
- Propagates downstream status codes and error bodies back to client
- Per-service timeout from `RoutingService` result

## Service Configuration
`src/config/services.config.ts`

Defines route prefix → service mapping. Example structure:
```ts
{
  prefix: '/api/core',
  baseUrl: process.env.CORE_BASE_URL,
  timeout: 5000,
}
```

## Adding a Route
1. Add entry in `services.config.ts` with `prefix`, `baseUrl`, `timeout`
2. If the route is public, add its path to the public-routes list in `jwt-auth.guard.ts`
3. Add corresponding env var in `.env.local` and document in `env-vars.md`

## Currently Registered Services
| Prefix | Env Var | Notes |
|---|---|---|
| `/api/core` | `CORE_BASE_URL` | Auth, properties, bookings |

> Planned: property, booking, payment, search, notification, content, pricing, admin services.

## Public (Unauthenticated) Routes on Core Service
- `POST /api/core/v1/auth/login`
- `POST /api/core/v1/auth/register`
- `POST /api/core/v1/auth/refresh`
- `POST /api/core/v1/auth/verify`
- `GET  /api/core/v1/properties` (listing/search)
- `GET  /api/core/v1/properties/:id`
- `GET  /api/core/v1/bookings/check-availability`
- `GET  /health`
