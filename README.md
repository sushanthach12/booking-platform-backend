# Booking Platform — Backend API

NestJS 11 REST API for the Stayly booking platform: property listings, host onboarding, booking lifecycle, payments and host payouts, reviews, and OpenSearch-backed property search.

## Stack

| Concern      | Technology                                  |
| ------------ | ------------------------------------------- |
| Framework    | NestJS 11 (Express platform), TypeScript 5.7 |
| Database     | PostgreSQL via TypeORM 0.3                  |
| Cache / jobs | Redis (ioredis) + BullMQ                    |
| Search       | OpenSearch                                  |
| Storage      | Cloudflare R2 (S3-compatible, presigned URLs) |
| Auth         | JWT (`@nestjs/jwt`) + Google ID token verification |
| Payments     | Cashfree (PG + Payouts)                     |
| Validation   | `class-validator` DTOs, Zod for internal schemas |
| Tests        | Jest + Supertest                            |

## Requirements

- Node.js 22
- pnpm
- PostgreSQL 14+
- Redis 6+
- An OpenSearch endpoint (the app fails to boot without `OPENSEARCH_NODE`/`OPENSEARCH_USER`/`OPENSEARCH_PASSWORD`)

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`. Values that block startup if unset or malformed:

- `JWT_SECRET`
- `PAYOUT_ENCRYPTION_KEY` — 64-char hex, generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `POSTGRES_*` connection variables
- `OPENSEARCH_NODE`, `OPENSEARCH_USER`, `OPENSEARCH_PASSWORD`

`.env.local` is loaded manually by `loadEnvConfig()` in [src/common/config/env.config.ts](src/common/config/env.config.ts) — it is not read by `ConfigModule`'s default `.env` lookup. In production, environment variables are injected by the runtime and no `.env` file is used.

Full variable reference: [.claude/references/env.md](.claude/references/env.md).

## Running

```bash
pnpm run dev          # watch mode (alias of start:dev)
pnpm run start        # single run, no watch
pnpm run build        # compile to dist/
pnpm run start:prod   # node dist/main (requires build first)
```

Default port is `8001` from `.env.example`; the code falls back to `8000` when `PORT` is unset.

## Scripts

| Script                | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `pnpm run dev`        | Watch-mode development server            |
| `pnpm run start:debug`| Watch mode with the Node inspector       |
| `pnpm run build`      | `nest build` → `dist/`                   |
| `pnpm run lint`       | ESLint with `--fix`                      |
| `pnpm run format`     | Prettier over `src/` and `test/`         |
| `pnpm run test`       | Unit tests (`*.spec.ts` under `src/`)    |
| `pnpm run test:watch` | Unit tests in watch mode                 |
| `pnpm run test:cov`   | Coverage report → `coverage/`            |
| `pnpm run test:e2e`   | E2E tests (`test/jest-e2e.json`)         |

Single test file:

```bash
pnpm run test -- --testPathPattern=booking.service
```

## API conventions

- **Base path:** `/api/v1/<resource>` — global prefix `api`, URI versioning with default version `1`.
- **Health check:** `GET /health` is excluded from the prefix and version-neutral, for uptime probes.
- **Response envelope:** controllers return `{ data }`, plus `{ meta }` on paginated lists. `POST /api/v1/storage/presign` is the one deliberate exception (un-enveloped).
- **Strict payloads:** a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` rejects undeclared keys in body *and* query DTOs with `400 property <key> should not exist`. This applies only to class DTOs — an inline `@Body() body: { reason?: string }` has no metatype and is skipped.
- **Identifier placement:** collection-level routes take identifiers as query params (`@Query() dto`); `:param` is reserved for genuine sub-resources (`/bookings/:bookingId/cancel`, `/properties/:propertyId/images`).
- **CORS:** driven by `CORS_ORIGIN` (comma-separated list, `*` by default).
- **Raw body preserved** at bootstrap so webhook HMAC signatures (Cashfree payouts) verify against the exact signed bytes.

Changing a route path, method, or DTO key is a breaking change for the `web/` client — update `web/.claude/refs/api.md` in the same change.

## Route map

| Route prefix                    | Module              | Responsibility                                     |
| ------------------------------- | ------------------- | -------------------------------------------------- |
| `/health`                       | root                | Liveness probe (no prefix, no version)              |
| `/api/v1/auth`                  | `AuthModule`        | Register, login, Google sign-in, OTP, token refresh |
| `/api/v1/users`, `/users/me`    | `UserModule`        | Profile, roles, wishlist                            |
| `/api/v1/properties`            | `PropertyModule`    | Listings, images, amenities, availability calendar   |
| `/api/v1/host`                  | `PropertyModule`    | Host onboarding steps                               |
| `/api/v1/home`                  | `HomeModule`        | Home-feed aggregation                               |
| `/api/v1/bookings`              | `BookingModule`     | Booking lifecycle, pricing, waitlist, slot reservation; host-side booking views |
| `/api/v1/payments`              | `PaymentModule`     | Checkout, gateway callbacks, transactions           |
| `/api/v1/payouts`               | `PaymentModule`     | Host wallets, payout accounts, payout dispatch      |
| `/api/v1/reviews`               | `ReviewModule`      | Guest reviews and host responses                    |
| `/api/v1/search/properties`     | `SearchModule`      | Public property search + reindex admin route        |
| `/api/v1/search/host/properties`| `SearchModule`      | Host-scoped property search                         |
| `/api/v1/storage`               | `StorageModule`     | R2 presigned upload URLs                            |
| `/api/v1/seed`                  | `SeedModule`        | Development data seeding                            |

## Architecture

### Dependency injection

Cross-module interfaces are provided and consumed through **Symbol tokens** in [src/database/di/symbols.ts](src/database/di/symbols.ts) — never by concrete class.

```typescript
// Providing
{ provide: BOOKING_SERVICE, useClass: BookingService }

// Consuming
@Inject(BOOKING_SERVICE) private readonly bookingService: IBookingService
```

Full token list: [.claude/references/di-tokens.md](.claude/references/di-tokens.md).

### Global providers

Registered in [src/app.module.ts](src/app.module.ts) and applied to every request:

- `HttpExceptionFilter` — uniform HTTP error shape
- `JwtAuthGuard`, `RolesGuard`, `RateLimitGuard`
- `LoggingInterceptor`, `TimeoutInterceptor`

### Queues (BullMQ)

Queue names are declared in [src/queues/queues.module.ts](src/queues/queues.module.ts). All processors run with `concurrency: 1`.

| Queue name                | Processor                        |
| ------------------------- | -------------------------------- |
| `booking-payment-timeout` | `BookingPaymentTimeoutProcessor` |
| `payment-status-sync`     | `PaymentStatusSyncProcessor`     |
| `booking-details`         | `CreateBookingDetailsProcessor`  |
| `booking-completion`      | `BookingCompletionProcessor`     |
| `balance-release`         | `BalanceReleaseProcessor`        |
| `payout-dispatch`         | `PayoutDispatchProcessor`        |
| `property-search-index`   | `PropertySearchProcessor` (registered inside `PropertySearchModule`) |

New processors extend `WorkerHost` and use `@Processor(QUEUE_NAME, { concurrency: 1 })`. Processors re-throw errors so BullMQ can retry.

### Database

TypeORM configuration: [src/database/config/typeorm.config.ts](src/database/config/typeorm.config.ts).

- Entities are discovered by the `**/entities/*.entity.{js,ts}` glob.
- `synchronize` follows `POSTGRES_SYNCHRONIZE` — keep it `false` outside local development.
- Migration files live in [src/database/migrations/](src/database/migrations/). There is no `typeorm` CLI script wired into `package.json` yet; run migrations with the TypeORM CLI against a data source of your own if you need them applied manually.
- Every entity is reached through a repository class injected by Symbol token — services never touch `EntityManager` directly.

### Payments and payouts

`PaymentGatewayFactory` ([src/payments/factories/](src/payments/factories/)) resolves the concrete gateway at runtime; Cashfree is the current implementation. Payouts are a separate Cashfree product with its own credentials (`CASHFREE_PAYOUT_*`). Payout account fields are encrypted at rest with AES-256-GCM using `PAYOUT_ENCRYPTION_KEY`.

Commission and payout behaviour is driven by `PLATFORM_COMMISSION_PERCENT`, `MIN_PAYOUT_THRESHOLD`, and `PAYOUT_RESERVE_AMOUNT`.

### Events

`EventEmitterModule` is global. Event definitions live in [src/common/events/](src/common/events/); listeners are co-located in the consuming module.

### Search

OpenSearch powers property search. `SearchCoreModule` is `@Global` and builds its client eagerly, so missing OpenSearch credentials fail the boot rather than degrading at query time. Reindexing is exposed at `POST /api/v1/search/properties/reindex`, guarded by the `x-search-admin-key` header matched against `SEARCH_REINDEX_KEY` (no ADMIN role exists yet). The route refuses to run when that variable is unset.

## Project layout

```
src/
├── main.ts              # Bootstrap: env load, CORS, prefix, versioning, validation
├── app.module.ts        # Root module, global filters/guards/interceptors
├── auth/                # JWT + Google auth
├── users/               # Profile, roles, wishlist
├── properties/          # Listings, images, amenities, calendar, host onboarding
├── bookings/            # Lifecycle, pricing, waitlist + booking-jobs/ processors
├── payments/            # Gateways, transactions, wallets, payouts, jobs/
├── reviews/             # Guest reviews, host responses
├── search/              # OpenSearch core + property search & indexing queue
├── home/                # Home-feed aggregation
├── storage/             # R2 presigned uploads
├── seed/                # Development seeding
├── queues/              # Shared BullMQ queue registrations
├── common/              # Config, filters, guards helpers, events, redis, email, zod
└── database/            # TypeORM config, DI symbols, migrations
```

Each feature module follows the same internal shape: `controllers/`, `services/`, `repositories/{implementations,interfaces}/`, `dto/`, `entities/`, `enums/`, `interfaces/`.

Detailed tree: [.claude/references/directory.md](.claude/references/directory.md).

## Conventions

- **Logging:** NestJS `Logger` (`new Logger(ClassName.name)`), never `console.log`.
- **Errors:** services throw NestJS HTTP exceptions; `HttpExceptionFilter` normalizes the response.
- **Validation:** `class-validator` on request DTOs; Zod ([src/common/zod/](src/common/zod/)) for internal schema validation.
- **Enums:** `E`-prefixed enum names with lowercase string values; no magic strings.
- **Before opening a PR:** `pnpm run lint && pnpm run build`.

## Deployment

Multi-stage [Dockerfile](Dockerfile) on `node:22-alpine`:

```bash
docker build -t booking-platform-api .
docker run --env-file .env.local -p 8000:8000 booking-platform-api
```

The image sets `NODE_ENV=production`, exposes `8000`, and starts `node dist/src/main`. Native modules (`bcrypt`, `msgpackr-extract`) are rebuilt in both stages. Supply every required environment variable at run time — no `.env` file is baked into the image.

## License

UNLICENSED — private project.
