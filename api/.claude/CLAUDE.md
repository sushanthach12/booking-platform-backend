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

## Architecture

NestJS 11 monolith deployed to Vercel serverless. PostgreSQL via TypeORM, Redis via ioredis, async jobs via BullMQ.

**URL pattern:** `POST /api/v1/<resource>`
Global prefix: `api` | Versioning: URI (`/v1`, `/v2`) | Port: `8001`

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

Run these checks before writing or modifying any code to avoid wrong assumptions:

1. **Read the target file** — confirm current implementation before editing; never assume from the module map alone.
2. **Check DI tokens** — if adding a service or repository, verify the Symbol exists in `src/database/di/symbols.ts`. See → [`references/di-tokens.md`](references/di-tokens.md).
3. **Check env vars** — if the feature needs a new env var, confirm it is documented in [`references/env.md`](references/env.md) and added to `.env.local` + Vercel.
4. **Check for existing patterns** — search the codebase for similar implementations (e.g. existing repositories, gateways, processors) before creating new abstractions.
5. **Verify module exports** — if a service/repository is consumed cross-module, confirm it is exported from the providing module and imported in the consuming module.
6. **Check migration state** — if changing an entity shape, confirm whether a migration is needed (`POSTGRES_SYNCHRONIZE=false` in prod).
7. **After changes** — run `pnpm run lint` and `pnpm run build` to catch type errors before testing.

## Key Conventions

- **Repository pattern**: every entity has a repository class injected via Symbol token; never call `EntityManager` directly from services.
- **Validation**: DTOs use `class-validator` decorators; Zod is used for internal schema validation (`src/common/zod/`).
- **Logging**: use NestJS `Logger` (`new Logger(ClassName.name)`), never `console.log`.
- **Error propagation**: processors re-throw errors so BullMQ can retry; services throw NestJS HTTP exceptions.
- **Global filter**: `HttpExceptionFilter` (`src/common/filters/`) handles all HTTP exceptions uniformly.

## Directory Structure

```
src/
├── main.ts                          # Bootstrap entry point
├── vercel.ts                        # Vercel serverless adapter
├── app.module.ts                    # Root module
├── app/                             # Health check controller/service
├── auth/
│   ├── controllers/auth.controller.ts
│   ├── dto/auth.dto.ts
│   ├── interfaces/auth.interface.ts
│   └── services/auth.service.ts
├── bookings/
│   ├── booking-jobs/                # BullMQ async processors
│   │   ├── processors/
│   │   │   ├── booking-payment-timeout.processor.ts
│   │   │   ├── create-booking-details.processor.ts
│   │   │   └── payment-status-sync.processor.ts
│   │   └── constants.ts
│   ├── controllers/booking.controller.ts
│   ├── dto/                         # checkout, create-booking, waitlist, price-alert, etc.
│   ├── entities/                    # booking, slot-reservation, waitlist, price-alert, snapshot, invitation
│   ├── enums/                       # booking-status, payment-status, payment-method, waitlist-state
│   ├── interfaces/                  # IBookingService, booking domain interfaces
│   ├── repositories/
│   │   ├── implementations/booking.repository.ts
│   │   └── interfaces/booking.repository.interface.ts
│   └── services/
│       ├── booking.service.ts
│       ├── availability-checker.service.ts
│       ├── booking-price-calculator.service.ts
│       └── booking-snapshot.service.ts
├── payments/
│   ├── controllers/                 # payment.controller.ts, payouts.controller.ts
│   ├── entities/                    # payment-transaction, payout
│   ├── factories/payment-gateway.factory.ts
│   ├── gateways/cashfree.gateway.ts
│   ├── interfaces/                  # payment.interface.ts, payout.interface.ts
│   ├── repositories/
│   │   ├── implementations/payment-transaction.repository.ts
│   │   └── payout.repository.ts
│   └── services/                    # payment.service.ts, payment-transaction.service.ts, payout.service.ts
├── properties/
│   ├── controllers/                 # property, property-image, property-amenity, property-calendar, host-onboarding
│   ├── dto/                         # availability, block-dates, create-property, host-onboarding, listing, etc.
│   ├── entities/                    # property + all related (location, pricing, details, images, amenities, calendar, etc.)
│   ├── enums/                       # property.enum.ts, rooms.enum.ts
│   ├── interfaces/property.interface.ts
│   ├── repositories/
│   │   ├── implementations/         # property, property-image, property-amenity, availability-calendar
│   │   └── interfaces/
│   ├── services/                    # property.service.ts, property-image.service.ts, property-amenity.service.ts
│   └── validations/schema/          # Zod schemas for create-property
├── users/
│   ├── controllers/                 # user.controller.ts, users-me.controller.ts
│   ├── dto/update-profile.dto.ts
│   ├── entities/                    # user.entity.ts, wishlist.entity.ts
│   ├── enums/user.enum.ts
│   ├── interfaces/                  # user.interface.ts, wishlist.interface.ts
│   ├── repositories/
│   │   └── implementations/         # user.repository.impl.ts, wishlist.repository.ts
│   └── services/                    # user.service.ts, wishlist.service.ts
├── storage/
│   ├── controllers/storage.controller.ts
│   ├── dto/presign.dto.ts
│   ├── providers/s3-client.provider.ts
│   └── services/storage.service.ts
├── queues/
│   └── queues.module.ts             # BullMQ queue registrations (shared across modules)
├── common/
│   ├── config/                      # env.config.ts, core.config.ts, config.utils.ts
│   ├── decorators/request-user.decorator.ts
│   ├── enums/                       # config.enum.ts, currency.enum.ts
│   ├── events/payment.events.ts
│   ├── filters/http-exception.filter.ts
│   ├── helpers/                     # slug.helper.ts, time.helper.ts
│   ├── interfaces/pagination.interface.ts
│   ├── redis/                       # redis.module.ts, redis.service.ts, redis.conn.service.ts
│   ├── types/users.types.ts
│   └── zod/                         # shared Zod utilities
└── database/
    ├── config/typeorm.config.ts
    ├── di/symbols.ts                # All DI Symbol tokens
    └── migrations/                  # TypeORM migration files
```

## References

- [`references/di-tokens.md`](references/di-tokens.md) — all DI Symbol tokens
- [`references/env.md`](references/env.md) — environment variables
