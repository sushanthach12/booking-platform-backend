# Environment Variables Reference

## Server
| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `8000` | HTTP listen port |
| `HTTP_TIMEOUT` | `5000` | Global request timeout (ms) |

## CORS
| Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `*` | CSV of allowed origins |
| `CORS_CREDENTIALS` | `true` | Allow credentials |

## Auth
| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Signing secret |
| `JWT_EXPIRY` | `86400` | Token TTL (seconds) |
| `SESSION_SECRET` | Yes | Session signing secret |
| `SESSION_EXPIRY` | `86400000` | Session TTL (ms) |

## Redis
| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | — | Full Redis URL (takes priority) |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |

## Downstream Services
Pattern: `<SERVICE>_BASE_URL` + optional `<SERVICE>_TIMEOUT`

| Variable | Default | Description |
|---|---|---|
| `CORE_BASE_URL` | `http://localhost:8001` | Core service |

> Add new services here as they are registered in `services.config.ts`.

## Loading
Config is loaded once at boot in `src/config/index.ts` via `loadEnvConfig()`.
Helpers in `src/config/config.utils.ts`: `parseNumber`, `parseBoolean`, `parseCsv`.
**Never** read `process.env` directly outside the config layer.
