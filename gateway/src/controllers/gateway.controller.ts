import {
  All,
  Body,
  Controller,
  Headers,
  NotFoundException,
  Query,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import type { Response } from 'express';
import type { GatewayRequest } from '../common/interfaces/gateway-request.interface';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { TimeoutInterceptor } from '../interceptors/timeout.interceptor';
import { ProxyService } from '../services/proxy.service';
import { RoutingService } from '../services/routing.service';

@Controller()
@UseInterceptors(TimeoutInterceptor)
export class GatewayController {
  constructor(
    private proxyService: ProxyService,
    private routingService: RoutingService,
    private jwtAuthGuard: JwtAuthGuard,
    private rateLimitGuard: RateLimitGuard,
  ) {}

  @All('*')
  async handleRequest(
    @Req() req: GatewayRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
    @Query() query: Record<string, string | string[]>,
    @Headers() headers: Record<string, string | string[]>,
  ) {
    const route = this.routingService.getRoute(req.path, req.method);

    if (!route) {
      throw new NotFoundException(`Route not found: ${req.method} ${req.path}`);
    }

    req.gatewayRoute = route;
    const context = new ExecutionContextHost([req, res]);

    // Check if route is excluded from auth, otherwise require auth
    if (!this.routingService.isExcludedFromAuth(req.path, route)) {
      await this.jwtAuthGuard.canActivate(context);
    }

    await this.rateLimitGuard.canActivate(context);

    const response = await this.proxyService.proxyRequest(
      req.user as { id: string; role: string },
      req.method,
      req.path,
      body,
      headers,
      query,
    );

    this.applyResponseHeaders(res, response.headers);
    res.status(response.status);
    return response.data;
  }

  private applyResponseHeaders(
    res: Response,
    headers: Record<string, string>,
  ): void {
    for (const [key, value] of Object.entries(headers)) {
      const headerKey = key.toLowerCase();
      if (headerKey === 'transfer-encoding' || headerKey === 'content-length') {
        continue;
      }
      if (value !== undefined) {
        res.setHeader(key, value);
      }
    }
  }
}
