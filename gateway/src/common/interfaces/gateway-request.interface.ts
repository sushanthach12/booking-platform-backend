import { Request } from 'express';
import type { RouteConfig } from '../../services/routing.service';

export interface GatewayRequest extends Request {
  user?: Record<string, unknown>;
  gatewayRoute?: RouteConfig;
}
