# Environment Variables Reference

Development: create `.env.local` in project root (loaded by `src/common/config/env.config.ts`).
Production: set directly in Vercel dashboard or CI secrets.

## Application

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `8001` | Server port |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s) |

## PostgreSQL

| Variable | Required | Notes |
|---|---|---|
| `POSTGRES_HOST` | ✅ | DB hostname |
| `POSTGRES_PORT` | ✅ | DB port (usually `5432`) |
| `POSTGRES_USERNAME` | ✅ | DB user |
| `POSTGRES_PASSWORD` | ✅ | DB password |
| `POSTGRES_DATABASE` | ✅ | Database name |
| `POSTGRES_SYNCHRONIZE` | — | `true` only in local dev; **never production** |
| `POSTGRES_LOGGING` | — | `true` to log SQL queries |
| `POSTGRES_SSL` | — | `true` to enable SSL |
| `POSTGRES_CA_CERTIFICATE` | — | CA cert string when SSL is enabled |

## Redis

| Variable | Notes |
|---|---|
| `REDIS_URL` | Full URL (e.g. `rediss://...`). Takes precedence over host/port. |
| `REDIS_HOST` | Fallback if `REDIS_URL` not set. Default: `localhost` |
| `REDIS_PORT` | Fallback if `REDIS_URL` not set. Default: `6379` |

## Authentication

| Variable | Required | Notes |
|---|---|---|
| `JWT_SECRET` | ✅ | Secret for signing JWT access tokens |
| `JWT_EXPIRY` | — | Access token expiry (code defaults to `15m`) |
| `SESSION_SECRET` | — | Session encryption secret |
| `SESSION_EXPIRY` | — | Session expiry in milliseconds |
| `PAYOUT_ENCRYPTION_KEY` | — | AES-256-GCM key for payout-account fields at rest. 32-byte hex preferred; any other value is SHA-256–hashed to 32 bytes. Set a real key in production. |

## Payouts & Revenue

| Variable | Required | Notes |
|---|---|---|
| `PLATFORM_COMMISSION_PERCENT` | — | Host-side commission as a percentage of a booking's grand total (GST-inclusive). Defaults to `0` (no deduction — host receives the full amount). Clamped to `[0, 100]`. Drives every `platformFee` / `hostNet`. |
| `MIN_PAYOUT_THRESHOLD` | — | Minimum payable balance (in booking currency) before a host can trigger a payout. Defaults to `0`. |
| `PAYOUT_RESERVE_AMOUNT` | — | Amount held back per wallet (not withdrawable) to absorb fees / refund clawbacks. Seeds new wallets' `reserveBalance`. Defaults to `0`. |
| `CASHFREE_PAYOUT_CLIENT_ID` | — | Cashfree **Payouts** client id (separate product/creds from the PG). Required to register beneficiaries and dispatch payouts. |
| `CASHFREE_PAYOUT_CLIENT_SECRET` | — | Cashfree Payouts client secret. |
| `CASHFREE_PAYOUT_ENV` | — | `production` → live payout API; anything else (default) → sandbox. |

## Cloudflare R2 Storage

| Variable | Required | Notes |
|---|---|---|
| `R2_ACCOUNT_ID` | ✅ | Cloudflare account ID (from R2 dashboard) |
| `R2_ACCESS_KEY_ID` | ✅ | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 API token secret |
| `R2_BUCKET_NAME` | ✅ | Target R2 bucket name |
| `R2_PUBLIC_BASE_URL` | ✅ | Public bucket URL, e.g. `https://pub-<hash>.r2.dev` or custom domain |
| `R2_PRESIGN_EXPIRY_SECONDS` | — | Presigned URL TTL in seconds. Default: `300` |

## Email (placeholder — not yet wired)

| Variable |
|---|
| `EMAIL_HOST` |
| `EMAIL_PORT` |
| `EMAIL_USER` |
| `EMAIL_PASSWORD` |
| `EMAIL_FROM` |
