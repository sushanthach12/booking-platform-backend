# Deploying Core and Gateway to Vercel

Both **core** and **gateway** are set up to run as Vercel serverless functions.

## Deploy as two separate projects

1. **Core**
   - In [Vercel](https://vercel.com): New Project → Import repo.
   - **Root Directory:** `core` (or `backend/core` if repo root is above `backend`).
   - **Build Command:** `npm run build` (or `pnpm run build`).
   - **Install Command:** `npm install` or `pnpm install`.
   - Add env vars (e.g. `DATABASE_URL`, `REDIS_URL`, JWT secrets).
   - Deploy. Copy the deployment URL (e.g. `https://your-core.vercel.app`).

2. **Gateway**
   - New Project → same repo.
   - **Root Directory:** `gateway` (or `backend/gateway`).
   - **Build Command:** `npm run build` (or `pnpm run build`).
   - Add env vars:
     - **`CORE_BASE_URL`:** core deployment URL (e.g. `https://your-core.vercel.app`).
     - Plus Redis, `JWT_SECRET`, `ALLOWED_ORIGINS`, etc.
   - Deploy.

## Env vars

- **Core:** `DATABASE_URL`, `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`), and any other vars from `.env.local`.
- **Gateway:** `CORE_BASE_URL` (required in production), `REDIS_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`, etc.

## Notes

- Each service uses a serverless entry (`src/vercel.ts`) and `vercel.json`; no code changes needed for deploy beyond setting env.
- BullMQ/Redis: queue workers do not run on Vercel; use an external worker or cron if you need background jobs.
- Set **Node.js Version** in project settings to match your local (e.g. 20.x).
