# PROJECT_CONTEXT — Backend

Authoritative reference for the NestJS booking platform backend. The repository root contains **`core/`** (domain API + workers), **`gateway/`** (edge proxy, auth, rate limits), and **`docs/`** (architecture and deployment notes). There is no single root `package.json`; each runnable app owns its own manifest.

---

## 1. Architecture Overview

### Layout

| Area | Path | Role |
|------|------|------|
| Core API | `core/src` | REST API, TypeORM, BullMQ workers, Redis locks/cache helpers, payment webhooks |
| Gateway | `gateway/src` | Reverse proxy to core; JWT verification; Redis-backed rate limiting; CORS |
| Shared docs | `docs/` | High-level system design, folder structure, Vercel notes (not runtime code) |

### Core application shape

- **`AppModule`** wires global `ConfigModule`, **BullMQ** (`BullModule.forRootAsync` from Redis URL or host/port), **`EventEmitterModule`**, **TypeORM**, **`RedisModule`** (custom `ioredis` wrapper), and feature modules: `AuthModule`, `PropertyModule`, `BookingModule`, `PaymentModule`, **`BookingJobsModule`** (queue processors).
- Global **`HttpExceptionFilter`** is registered via `APP_FILTER`.
- **`main.ts`**: global prefix `api/core`, URI versioning default `v1`, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), default port **8001**.

### Gateway application shape

- **`AppModule`**: `HttpModule` (Axios) for upstream calls, **`JwtModule`**, **`RedisClientModule`** (`@nestjs-modules/ioredis`), controllers `HealthController` + `GatewayController`, providers for proxy, routing, guards, logging, timeout, exception filter.
- **`main.ts`**: CORS from env, global `ValidationPipe`, global `HttpExceptionFilter`, global `LoggingInterceptor`, default port **8000** (via `gateway.config`).

### Request lifecycle (via gateway)

1. Client calls the gateway with the **same path** the core expects (e.g. `/api/core/v1/bookings`).
2. **`GatewayController`** (`@All('*')`) resolves a **`RoutingService`** rule for `method + path`.
3. If the path is not in **`excludeFromAuth`**, **`JwtAuthGuard`** validates the JWT and sets **`request.user`** (`id`, `role`).
4. **`RateLimitGuard`** increments a Redis key scoped by service, user id (or `anonymous`), and IP.
5. **`ProxyService`** forwards to **`CORE_BASE_URL` + original path**, copies query/body/headers, and injects a string **`user`** header (`JSON.stringify({ id, role })`) for core.
6. Core controllers read identity via **`CurrentUser`** / **`RequestUserId`** decorators parsing the **`user`** header (not via Nest guards in core).

### Request lifecycle (core direct)

Possible for local tools or webhooks. **Protected routes** expect the **`user`** header; **auth and public listing** endpoints omit it. Payment webhooks use gateway signatures on the body/headers, not the `user` header.

---

## 2. Tech Stack Details

### NestJS and TypeScript

| Item | Core (`core/package.json`) | Gateway (`gateway/package.json`) |
|------|-----------------------------|----------------------------------|
| **@nestjs/common / core** | ^11.1.14 | ^11.0.1 |
| **@nestjs/config** | ^4.0.2 | ^4.0.2 |
| **TypeScript** | ^5.7.3 | ^5.7.3 |

**Core `tsconfig.json`**: `module` / `moduleResolution` **NodeNext**, `strictNullChecks`, `noImplicitAny: false`, `strictBindCallApply: false`.

### PostgreSQL and TypeORM

- **ORM**: TypeORM **^0.3.28**, **`@nestjs/typeorm` ^11.0.0**, driver **`pg` ^8.17.2**.
- **Config**: `core/src/database/config/typeorm.config.ts` — `POSTGRES_*` env vars, entity glob, optional `synchronize` and `logging`, SSL with `POSTGRES_CA_CERTIFICATE` when `POSTGRES_SSL=true`.
- **Prisma**: not used.

### Redis usage

| Concern | Where | Mechanism |
|---------|--------|-----------|
| **BullMQ connection** | Core | `BullModule.forRootAsync` — `REDIS_URL` or `REDIS_HOST` + `REDIS_PORT` |
| **Locks / optional cache API** | Core | `RedisModule` + `RedisService` (`ioredis`) — `acquireLock` / `releaseLock`, `get`/`set`/`del`, TTL in ms for `set` |
| **Rate limiting** | Gateway | `RateLimitGuard` + `RedisService` wrapping ioredis client from `@nestjs-modules/ioredis` |

Same Redis infrastructure may back both BullMQ and gateway limits; they are logically separate (queue names vs `rate_limit:*` keys).

### BullMQ

- **`@nestjs/bullmq` ^11.0.4**, **`bullmq` ^5.25.0**.
- Queues registered in **`QueuesModule`**; processors live under **`BookingJobsModule`**.

### Other notable core libraries

- **Validation**: `class-validator`, `class-transformer`.
- **Auth tokens**: `@nestjs/jwt`, `jsonwebtoken`, `bcrypt`.
- **Docs decorators**: `@nestjs/swagger` (used on some DTOs/controllers); Swagger UI is **not** bootstrapped in `main.ts` at time of analysis.
- **Zod**: present under `common/zod` (e.g. property schemas); used alongside class-validator in places.
- **Events**: `@nestjs/event-emitter` registered globally; payment event constants exist in `common/events/payment.events.ts` with **no emitters/listeners wired** in the scanned codebase.

---

## 3. Module Breakdown

### Core (`core/src`)

#### `AppModule`

- Composes infrastructure and feature modules; registers global exception filter and root controllers (`AppController`).

#### `AuthModule` (`auth/`)

- **Responsibility**: Register, login, stub forgot/reset password; JWT issuance.
- **Controller**: `AuthController` — `auth/*`.
- **Service**: `AuthService` — bcrypt, `JwtService` (access + refresh).
- **DTOs**: `LoginDto`, `RegisterDto` (`auth/dto/auth.dto.ts`).
- **Entities**: uses `UserModule` / `UserEntity` (no local entity).

#### `UserModule` (`users/`)

- **Responsibility**: User persistence and profile.
- **Controller**: `UserController` — `GET users/profile` (requires **`RequestUserId`** / `user` header).
- **Service**: `UserService`.
- **Repository**: `UserRepositoryImpl` bound to `USER_REPOSITORY` symbol.
- **Entity**: `UserEntity`.

#### `PropertyModule` (`properties/`)

- **Responsibility**: Listings, CRUD, search, host dashboard, availability, images, amenities.
- **Controllers**: `PropertyController`, `PropertyImageController` (`properties/:propertyId/images`), `PropertyAmenityController` (`properties/:propertyId/amenities`).
- **Service**: `PropertyService`, `PropertyImageService`, `PropertyAmenityService`.
- **Repositories (symbols)**: `PROPERTY_REPOSITORY`, `PROPERTY_IMAGE_REPOSITORY`, `PROPERTY_AMENITY_REPOSITORY`, `AVAILABILITY_CALENDAR_REPOSITORY`.
- **DTOs**: `create-property.dto`, `listing.dto`, `property-crud.dto`, `availability.dto`, etc.
- **Entities**: `PropertyEntity` and related (location, pricing, details, policy, rating, rooms, images, house rules, availability calendar, amenities, property_amenities).
- **Validation**: Zod schemas under `validations/schema/` (e.g. create property).

#### `BookingModule` (`bookings/`)

- **Responsibility**: Create booking + payment handoff, list guest/host bookings, details, cancel/confirm, availability check; stubs for waitlist and price alerts.
- **Controller**: `BookingController`.
- **Services**: `BookingService` (token `BOOKING_SERVICE`), `BookingSnapshotService`, `AvailabilityCheckerService`, `DefaultBookingPriceCalculator`.
- **Repository**: `BookingRepository` → `BOOKING_REPOSITORY`.
- **DTOs**: `create-booking.dto`, `booking-query.dto`, `join-waitlist.dto`, `price-alert.dto`, `check-availability`, etc.
- **Entities**: `BookingEntity`, `BookingSnapshotEntity`, `BookingPriceItemEntity`, `WaitlistEntity`, `SlotReservationEntity`, `BookingInvitationEntity`, `PriceAlertEntity`.

#### `PaymentModule` (`payments/`)

- **Responsibility**: Payment creation (factory → gateway), transaction persistence, webhooks, enqueue sync jobs.
- **Controller**: `PaymentController` — provider webhooks only.
- **Services**: `PaymentService` (`IPaymentService`), `PaymentTransactionService`.
- **Factory**: `PaymentGatewayFactory` (Cashfree implemented as placeholder; Razorpay/Stripe throw).
- **Repository**: `PaymentTransactionRepository` → `PAYMENT_TRANSACTION_REPOSITORY`.
- **Entity**: `PaymentTransactionEntity`.

#### `QueuesModule` (`queues/`)

- **Responsibility**: Register BullMQ queue names (see §5).

#### `BookingJobsModule` (`bookings/booking-jobs/`)

- **Responsibility**: Worker hosts for booking/payment/async snapshot processing.
- **Processors**: `BookingPaymentTimeoutProcessor`, `PaymentStatusSyncProcessor`, `CreateBookingDetailsProcessor`.

#### `RedisModule` (`common/redis/`)

- **Responsibility**: Injectable Redis client abstraction (`IRedisService`).

#### `database/` (config + DI)

- **Symbols** (`database/di/symbols.ts`): repository and service injection tokens shared across modules.

### Gateway (`gateway/src`)

#### `AppModule`

- Wires HTTP client, JWT, Redis, and gateway-specific providers.

#### Controllers

- **`GatewayController`**: catch-all proxy (see §1).
- **`HealthController`**: `GET /health` — returns status JSON. **Note:** health is **not** covered by `RoutingService` patterns (only `/api/core/v1/...`); as implemented, the catch-all may still invoke routing and return **404** unless routing is extended or health is reached without the gateway proxy rules. Worth verifying in deployment.

#### Services

- **`RoutingService`**: path → upstream service (`core` only today) + auth exclusions + rate limit config.
- **`ProxyService`**: Axios forward, `user` header injection.

#### Guards / interceptors / filters

- **`JwtAuthGuard`**, **`RateLimitGuard`**, **`TimeoutInterceptor`** (on `GatewayController`), **`LoggingInterceptor`** (global in `main.ts`), **`HttpExceptionFilter`** (gateway variant, global in `main.ts`).
- **`TransformInterceptor`** exists under `interceptors/` but is **not** registered in `AppModule` / `main.ts` in the current tree.

---

## 4. Database Schema

TypeORM maps **camelCase** property names to **snake_case** columns where `@Column({ name: '...' })` is set; `users` uses snake_case column names explicitly on the entity.

### Users

- **`users` (`UserEntity`)**: `id` (uuid), `email`, `password`, `name`, `role`, `status`, `phone`, `email_verified`, `phone_verified`, `created_at`, `updated_at`, `last_login_at`.

### Properties (aggregate root `properties`)

- **`properties`**: `id`, `host_id`, `title`, `slug`, `description`, `property_type`, `status`, timestamps.
- **`property_locations`**: 1:1 with property — address fields, lat/long, optional PostGIS `location` text.
- **`property_pricing`**: 1:1 — `base_price`, `currency`, `cleaning_fee`, `service_fee_percentage`, etc.
- **`property_details`**: 1:1 — `max_guests`, `bedrooms`, `beds`, `bathrooms`.
- **`property_policies`**: 1:1 — `min_nights`, `max_nights`, check-in/out times, `cancellation_policy`, `instant_book`.
- **`property_ratings`**: 1:1 — `average_rating`, `total_reviews`.
- **`rooms`**: N:1 property — room metadata, `base_price`, `status`, relation to images and availability.
- **`property_images`**: N:1 property, optional N:1 room — URLs, ordering, dimensions, mime.
- **`house_rules`**: N:1 property — `rule_type`, `allowed`, `description` (unique per property + rule type).
- **`availablity_calender`**: N:1 property, optional N:1 room — `date`, `available`, `price`, min/max nights, notes, `block_reason`, optional `booking_id`.
- **`amenities`**: catalog — `name`, `category`, `icon`, `description`.
- **`property_amenities`**: join N:1 property, N:1 amenity — `notes`.

### Bookings

- **`bookings`**: `property_id`, `guest_id`, `host_id`, optional `room_id`, dates, `guest_count`, pricing columns (`subtotal`, fees, tax, `grand_total`, `currency`), `status`, `payment_status`, payment ids, `booking_number`, `idempotency_key`, cancellation/confirm timestamps, `version`, timestamps. Indexes on property+dates, `guest_id`, `host_id`, `status`.
- **`booking_snapshot`**: N:1 booking (CASCADE) — denormalized property/room/policy snapshot (`jsonb` for address, policies, rules).
- **`booking_price_items`**: N:1 booking (CASCADE) — line items (`type`, `calculation_mode`, `value`, `amount`).
- **`waitlist`**: `property_id`, `user_id`, dates, `priority`, `state`, optional `slot_reservation_id`, notification/expiry timestamps.
- **`slot_reservations`**: property + dates + `waitlist_entry_id`, `reserved_until`, `status`.
- **`booking_invitations`**: links waitlist + slot + property + user + booking window metadata + `status`.
- **`price_alerts`**: unique (`property_id`, `user_id`), `target_price`, `current_price`, `auto_book`, `status`.

### Payments

- **`payment_transactions`**: string `id` (PK), `amount`, `currency`, `status`, gateway fields, optional `bookingId` / `guestId` / `propertyId`, `metadata` / `webhookData` JSON, timestamps.

**ORM relationships**: Fully declared on `PropertyEntity` and some booking-related entities (`BookingSnapshotEntity`, `BookingPriceItemEntity`). `BookingEntity` and `PaymentTransactionEntity` use **scalar FKs** without TypeORM relations to users/properties.

---

## 5. Queue Architecture

### Queue names (`QueuesModule`)

| Constant | String name |
|----------|-------------|
| `QUEUE_BOOKING_PAYMENT_TIMEOUT` | `booking-payment-timeout` |
| `QUEUE_PAYMENT_STATUS_SYNC` | `payment-status-sync` |
| `QUEUE_BOOKING_DETAILS` | `booking-details` |

### Job names (`booking-jobs/constants.ts`)

| Job constant | Name | Default timing |
|--------------|------|----------------|
| `JOB_EXPIRE_UNPAID_BOOKING` | `expire-unpaid-booking` | Delay **15 minutes** (`PAYMENT_TIMEOUT_MS`) |
| `JOB_SYNC_PAYMENT_STATUS` | `sync-payment-status` | Immediate |
| `JOB_CREATE_BOOKING_DETAILS` | `create-booking-details` | Immediate (enqueue errors logged) |

### Producers

- **`BookingService`**: After a booking is created and a payment transaction is attached, enqueues **expire-unpaid** (delayed) and **create-booking-details**.
- **`PaymentService`**: After webhook processing updates a transaction, enqueues **sync-payment-status**.

### Consumers (processors)

| Processor | Queue | Payload | Behavior |
|-----------|-------|---------|----------|
| `BookingPaymentTimeoutProcessor` | `booking-payment-timeout` | `{ bookingId, paymentTransactionId }` | Calls `bookingService.expireUnpaidBookingIfStillPending` |
| `PaymentStatusSyncProcessor` | `payment-status-sync` | `{ transactionId, status }` | Calls `bookingService.syncPaymentStatusFromTransaction` |
| `CreateBookingDetailsProcessor` | `booking-details` | `{ bookingId }` | Calls `bookingSnapshotService.createForBooking` |

All processors use **`concurrency: 1`** and ignore jobs whose **`job.name`** does not match the expected constant.

---

## 6. API Contracts

Base URL for core routes: **`/api/core/v1`** (prefix + default URI version). Below, **Auth (gateway)** means JWT required on the gateway unless the path matches an exclusion. **Auth (core)** means the handler uses **`CurrentUser`** / **`RequestUserId`** and expects the **`user`** header (typically set by the gateway).

### Auth (`/api/core/v1/auth`)

| Method | Path | Gateway auth | Core `user` header | Request body | Response shape |
|--------|------|--------------|--------------------|--------------|----------------|
| POST | `/auth/register` | Public (excluded) | No | `RegisterDto`: `email`, `password`, `name`, optional `userType` | `{ data: { user, accessToken, refreshToken } }` |
| POST | `/auth/login` | Public (excluded) | No | `LoginDto`: `email`, `password`, optional `userType` | `{ data: { user: { id, email, name, role }, accessToken, refreshToken } }` |
| POST | `/auth/forgot-password` | **JWT required** (not in exclude list) | N/A | `{ email }` | `{ data: { message } }` |
| POST | `/auth/reset-password` | **JWT required** (not in exclude list) | N/A | `{ token, newPassword }` | `{ data: { message } }` |

### Users (`/api/core/v1/users`)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/users/profile` | Yes (`user` header) | `{ data: ... }` from `UserService.getProfile` |

### Properties (`/api/core/v1/properties`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/properties/listing` | Gateway: public (excluded). Core: no `user` | Body: `PropertyListingDto` → `{ data }` |
| POST | `/properties` | Yes | `CreatePropertyDto` → `{ data }` |
| GET | `/properties/details` | Gateway: public. Core: no `user` | Query: `GetPropertyDetailsQueryDto` |
| PATCH | `/properties/details` | Yes | Query `PropertyQueryDto` + `UpdatePropertyDto` |
| DELETE | `/properties` | Yes | Query `PropertyQueryDto` → `{ data: { message } }` |
| PATCH | `/properties/status` | Yes | `UpdatePropertyStatusDto` |
| POST | `/properties/search` | Gateway: public | `SearchPropertiesDto` |
| GET | `/properties/nearby` | Gateway: public | `NearbyPropertiesDto` |
| GET | `/properties/host/me` | Yes | `GetHostPropertiesDto` |
| GET | `/properties/analytics` | Yes | `GetPropertyAnalyticsQueryDto` |
| GET | `/properties/availability` | Yes | `GetPropertyAvailabilityQueryDto` |
| PATCH | `/properties/availability/bulk` | Yes | `BulkUpdateAvailabilityDto` + query |
| PATCH | `/properties/availability/range` | Yes | `UpdatePropertyAvailabilityDto` + query |

### Property images (`/api/core/v1/properties/:propertyId/images`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/` | Yes |
| GET | `/` | Yes |
| PATCH | `/:imageId` | Yes |
| DELETE | `/:imageId` | Yes |
| POST | `/reorder` | Yes |

### Property amenities (`/api/core/v1/properties/:propertyId/amenities`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Yes |
| GET | `/all` | Yes |
| POST | `/` | Yes |
| DELETE | `/:amenityId` | Yes |

### Bookings (`/api/core/v1/bookings`)

| Method | Path | Gateway auth | Core `user` | Body / query |
|--------|------|--------------|-------------|--------------|
| POST | `/bookings` | JWT | Yes | `CreateBookingDto` → `{ data: { bookingId, bookingNumber, paymentLink, paymentSessionId } }` |
| GET | `/bookings` | JWT | Yes | `GetBookingsQueryDto` |
| GET | `/bookings/host` | JWT | Yes | `GetBookingsQueryDto` |
| GET | `/bookings/details` | JWT | Yes | Query `GetBookingQueryDto` (`bookingId`) |
| PATCH | `/bookings/:bookingId/cancel` | JWT | Yes | Optional `{ reason }`; param `bookingId` |
| PATCH | `/bookings/:bookingId/confirm` | JWT | Yes | Param `bookingId` |
| POST | `/bookings/check-availability` | **Public** (excluded) | No | `CheckBookingAvailabilityDto` |
| POST | `/bookings/waitlist/join` | JWT | Yes | `JoinWaitlistDto` (stub response) |
| POST | `/bookings/price-alerts` | JWT | Yes | `CreatePriceAlertDto` (stub) |
| GET | `/bookings/price-alerts` | JWT | Yes | Stub `{ alerts: [], total: 0 }` |

### Payments (`/api/core/v1/payments`)

| Method | Path | Gateway | Core auth |
|--------|------|---------|-----------|
| POST | `/payments/webhook/cashfree` | **Not registered in `RoutingService`** — call core directly or extend gateway | No `user` header; uses `x-cashfree-signature` |
| POST | `/payments/webhook/razorpay` | Same | `x-razorpay-signature` |
| POST | `/payments/webhook/stripe` | Same | `stripe-signature` |

Webhook success responses: `{ success, message?, transactionId? }` or `{ success: false, error }`.

### Root (`/api/core/v1`)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` (empty controller path under global prefix/version) | `AppController.getHello()` returns plain string |

### Gateway-only

| Method | Path | Response |
|--------|------|----------|
| GET | `/health` | `{ status, timestamp, uptime }` (see routing caveat in §3) |

---

## 7. Auth Strategy

### Gateway

- **JWT** validated with `@nestjs/jwt` (`JwtAuthGuard`).
- Token extracted from header **`Authorization: JWT <token>`** (type must be **`JWT`**, not `Bearer`).
- Payload must include **`sub`** (user id) and **`role`**.
- **Secret / expiry**: `JWT_SECRET`, `JWT_EXPIRY` (see §8); defaults in `gatewayDefaults` for dev only.

### Core

- **No `AuthGuard` classes** in the scanned codebase.
- Protected handlers depend on **`CurrentUser`** / **`RequestUserId`**, which read **`request.headers.user`** as JSON **`{ id, role }`**.
- **Login/register** issue JWTs via **`AuthService`** with **`JwtModule`** (`JWT_SECRET`, access `expiresIn` **15m** in module config; **`generateTokens`** uses **30m** access and **7d** refresh — values should be aligned intentionally).
- **Trust model**: When core is exposed, anything that can set `user` can impersonate; **the gateway is the intended trust boundary**.

---

## 8. Environment Variables

### Core — required for Postgres

| Variable | Description |
|----------|-------------|
| `POSTGRES_HOST` | Database host |
| `POSTGRES_PORT` | Database port |
| `POSTGRES_USERNAME` | DB user |
| `POSTGRES_PASSWORD` | DB password |
| `POSTGRES_DATABASE` | Database name |
| `POSTGRES_CA_CERTIFICATE` | CA PEM (required when `POSTGRES_SSL=true`) |

### Core — optional / feature

| Variable | Description |
|----------|-------------|
| `POSTGRES_SYNCHRONIZE` | If `true`, TypeORM `synchronize` (avoid in production) |
| `POSTGRES_LOGGING` | If `true`, TypeORM query logging |
| `POSTGRES_SSL` | Enable SSL with CA verification when `true` |
| `JWT_SECRET` | Secret for `AuthModule` / token signing |
| `REDIS_URL` | Single URL for Redis (preferred for Bull + `RedisService`) |
| `REDIS_HOST` / `REDIS_PORT` | Fallback if `REDIS_URL` unset |
| `DEFAULT_PAYMENT_GATEWAY` | Defaults to Cashfree |
| `CASHFREE_API_KEY` / `CASHFREE_API_SECRET` / `CASHFREE_API_URL` | Cashfree integration (gateway partially stubbed) |
| `PORT` | Core HTTP port (default **8001** in `main.ts`) |
| `NODE_ENV` | Drives `loadEnvConfig`: in development, loads **`.env.local`** from cwd |

### Gateway

| Variable | Description |
|----------|-------------|
| `PORT` | Gateway port (default **8000**) |
| `HTTP_TIMEOUT` | Axios / proxy timeout ms |
| `ALLOWED_ORIGINS` | CSV CORS origins (`*` possible) |
| `CORS_CREDENTIALS` | Boolean string for `credentials` |
| `JWT_SECRET` | Must match token issuer expected by clients |
| `JWT_EXPIRY` | Passed to `JwtModule` `signOptions.expiresIn` |
| `REDIS_URL` or `REDIS_HOST` + `REDIS_PORT` | Rate limit backend |
| `REDIS_CONNECT_TIMEOUT`, `REDIS_MAX_RETRIES_PER_REQUEST`, `REDIS_RETRY_DELAY_MS`, `REDIS_RETRY_MAX_DELAY_MS`, `REDIS_MAX_RETRIES`, `REDIS_KEEP_ALIVE`, `REDIS_STARTUP_TIMEOUT`, `REDIS_ENABLE_READY_CHECK`, `REDIS_LAZY_CONNECT` | Fine-tuning ioredis (see `gateway.config.ts`) |
| `CORE_BASE_URL` | Upstream core base (default `http://localhost:8001`) |
| `USER_SERVICE_TIMEOUT` | Core HTTP timeout (misnamed env; used for `core` service) |
| `USER_SERVICE_RETRIES` | Retry count default for config parser |
| `USER_SERVICE_RATE_LIMIT_TTL` / `USER_SERVICE_RATE_LIMIT_LIMIT` | Per-route rate limit bucket |

---

## 9. Conventions

### Naming and structure

- **Feature folders** under `core/src`: `auth`, `users`, `properties`, `bookings`, `payments`, plus `common`, `database`, `queues`, `app`.
- **Files**: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.entity.ts`, `*.dto.ts`, repository `*.repository.ts` / `*.impl.ts`.
- **Injection tokens**: `database/di/symbols.ts` uses **`Symbol('I...')`** for interfaces.
- **Table naming**: snake_case (`users`, `properties`, `booking_snapshot`, etc.). Note typo **`availablity_calender`** in entity metadata.

### Validation and DTOs

- Global **`ValidationPipe`**: strip unknown properties, reject non-whitelisted, auto-transform types.
- **class-validator** on DTOs; some domains also use **Zod** schemas.

### HTTP responses and errors

- **Success**: many controllers wrap payloads in **`{ data: ... }`**; webhooks use **`success` / `error`** fields.
- **Core `HttpExceptionFilter`**: JSON `{ status_code, timestamp, path, message, errors? }` with structured **`errors`** for validation (class-validator arrays or Zod-style `{ field, message }[]`).
- **Gateway `HttpExceptionFilter`**: `{ status_code, timestamp, path, message, error }`.

### API documentation

- **`@ApiTags` / `@ApiOperation`** appear on booking endpoints; Swagger document bootstrap is **not** present in `main.ts` at analysis time.

### Cross-cutting notes

- **Idempotency**: bookings use **`idempotencyKey`** on create.
- **Distributed locks**: `RedisService.acquireLock` / `releaseLock` used in booking flow (see `BookingService`).
- **Event module**: registered for future **`payment.status.updated`** style integration.

---

*Generated from repository analysis. Update this file when modules, routes, or env contracts change.*
