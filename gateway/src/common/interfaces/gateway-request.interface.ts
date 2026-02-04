import { Request } from 'express';
import type { RouteConfig } from '../../services/routing.service';

export interface GatewayRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
  gatewayRoute?: RouteConfig;
}
