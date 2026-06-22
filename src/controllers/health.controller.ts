import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

// Version-neutral and excluded from the global `api` prefix (see main.ts) so
// infrastructure health checks (load balancers, Vercel, uptime monitors) can
// probe a stable, prefix-free `GET /health` returning HTTP 200.
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
