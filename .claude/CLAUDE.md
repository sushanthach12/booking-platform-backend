# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm run dev          # Start in watch mode (development)
pnpm run start:prod   # Production start (requires pnpm run build first)
pnpm run build        # Compile TypeScript to dist/
pnpm run lint         # ESLint with auto-fix
pnpm run format       # Prettier format
pnpm run test         # Run unit tests
pnpm run test:watch   # Watch mode
pnpm run test:cov     # Coverage report
pnpm run test:e2e     # E2E tests
```

Single test file:

```bash
pnpm run test -- --testPathPattern=booking.service
```

## Tool Usage

Do not use web search, browser, or computer use tools.
Do not fetch URLs or browse the web unless explicitly asked.
Prefer reading local files over any external lookups.
Respond concisely — skip preamble, summaries of what you did, and unsolicited suggestions.

## Architecture

NestJS 11 monolith deployed to Vercel serverless. PostgreSQL via TypeORM, Redis via ioredis, async jobs via BullMQ.

**URL pattern:** `POST /api/v1/<resource>`
Global prefix: `api` | Versioning: URI (`/v1`, `/v2`) | Port: `8001`

### Request Contract Conventions

- **Strict payloads.** `main.ts` installs a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. Undeclared keys in a body **or query** DTO return `400 property <key> should not exist`. Note this applies only to class DTOs — an inline `@Body() body: { reason?: string }` has no metatype and is skipped entirely by the pipe.
- **Identifier placement.** Prefer query params (`@Query() dto`) over path params for resource identifiers on collection-level routes; keep `:param` only for genuine sub-resources (`/bookings/:bookingId/cancel`, `/properties/:propertyId/calendar`). Host onboarding steps carry `propertyId` in the body so each step is a self-contained payload.
- **Response envelope.** Controllers return `{ data }`, plus `{ meta }` for paginated lists. `POST /storage/presign` is the one deliberate exception (un-enveloped).
- Changing a route's path, method, or DTO keys is a **breaking change for `web/`** — update `web/.claude/refs/api.md` in the same change.

### Module Map

| Module              | Path                         | Responsibility                                         |
| ------------------- | ---------------------------- | ------------------------------------------------------ |
| `AuthModule`        | `src/auth/`                  | JWT sign/verify, login/register                        |
| `UserModule`        | `src/users/`                 | User CRUD, roles                                       |
| `PropertyModule`    | `src/properties/`            | Listings, images, amenities, availability calendar     |
| `BookingModule`     | `src/bookings/`              | Booking lifecycle, pricing, waitlist, slot reservation |
| `BookingJobsModule` | `src/bookings/booking-jobs/` | BullMQ processors for async booking operations         |
| `PaymentModule`     | `src/payments/`              | Payment gateway (factory pattern), transactions        |
| `QueuesModule`      | `src/queues/`                | BullMQ queue registrations (shared)                    |
| `RedisModule`       | `src/common/redis/`          | Global `IRedisService` singleton                       |
| `StorageModule`     | `src/storage/`               | Cloudflare R2 uploads, presigned URL generation        |

### Dependency Injection Pattern

All cross-module interfaces use **Symbol tokens** from `src/database/di/symbols.ts`.
See → [`references/di-tokens.md`](references/di-tokens.md) for full token list and usage.

```typescript
// Providing
{ provide: BOOKING_SERVICE, useClass: BookingService }

// Consuming
@Inject(BOOKING_SERVICE) private readonly bookingService: IBookingService
```

### Queue System (BullMQ)

Three queues registered in `src/queues/queues.module.ts`. All processors run with `concurrency: 1`.

| Queue constant                  | Queue name                | Processor                        |
| ------------------------------- | ------------------------- | -------------------------------- |
| `QUEUE_BOOKING_PAYMENT_TIMEOUT` | `booking-payment-timeout` | `BookingPaymentTimeoutProcessor` |
| `QUEUE_PAYMENT_STATUS_SYNC`     | `payment-status-sync`     | `PaymentStatusSyncProcessor`     |
| `QUEUE_BOOKING_DETAILS`         | `booking-details`         | `CreateBookingDetailsProcessor`  |

New processors must extend `WorkerHost` and use `@Processor(QUEUE_NAME, { concurrency: 1 })`.

### Database

TypeORM with PostgreSQL. Config: `src/database/config/typeorm.config.ts`.

- Entities pattern: `**/entities/*.entity.{js,ts}`
- Synchronize: controlled by `POSTGRES_SYNCHRONIZE` env var (never `true` in production)
- Migrations: `src/database/migrations/`

### Payment Gateway

`PaymentGatewayFactory` (`src/payments/factories/`) selects the concrete gateway at runtime. Add new gateways by implementing the gateway interface and registering in the factory.

### Event System

`EventEmitterModule` is active globally. Events are defined in `src/common/events/`. Listeners are co-located in the consuming module (e.g. `src/bookings/`).

## Environment

See → [`references/env.md`](references/env.md) for all variables and their defaults.
Development: uses `.env.local` (loaded manually by `loadEnvConfig()` in `src/common/config/env.config.ts`).
Production (Vercel): env vars injected at runtime — no `.env` file used.

## Before Making Changes

Read target file → check DI tokens (references/di-tokens.md) → check env vars (references/env.md) → verify module exports → check migration state → run `pnpm run lint && pnpm run build` after.

## Key Conventions

- **Repository pattern**: every entity has a repository class injected via Symbol token; never call `EntityManager` directly from services.
- **Validation**: DTOs use `class-validator` decorators; Zod is used for internal schema validation (`src/common/zod/`).
- **Logging**: use NestJS `Logger` (`new Logger(ClassName.name)`), never `console.log`.
- **Error propagation**: processors re-throw errors so BullMQ can retry; services throw NestJS HTTP exceptions.
- **Global filter**: `HttpExceptionFilter` (`src/common/filters/`) handles all HTTP exceptions uniformly.

## References

- [`references/di-tokens.md`](references/di-tokens.md) — all DI Symbol tokens
- [`references/env.md`](references/env.md) — environment variables
- [`references/directory.md`](references/directory.md) — directory structure
