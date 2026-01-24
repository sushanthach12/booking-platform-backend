import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getServiceConfig, ServiceName } from '../config/services.config';

export interface RouteConfig {
  path: string;
  service: string;
  method: string;
  requiresAuth?: boolean;
  rateLimit?: {
    ttl: number;
    limit: number;
  };
}

@Injectable()
export class RoutingService {
  private routes: Map<string, RouteConfig> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Auth routes (no auth required)
    this.addRoute('/api/v1/auth/*', 'user', 'ALL', false);

    // User routes
    this.addRoute('/api/v1/users/*', 'user', 'ALL', true);

    // Property routes
    this.addRoute('/api/v1/properties', 'property', 'GET', false);
    this.addRoute('/api/v1/properties/*', 'property', 'ALL', true);

    // Search routes
    this.addRoute('/api/v1/search/*', 'search', 'GET', false);

    // Booking routes
    this.addRoute('/api/v1/bookings/*', 'booking', 'ALL', true);

    // Payment routes
    this.addRoute('/api/v1/payments/*', 'payment', 'ALL', true);

    // Notification routes
    this.addRoute('/api/v1/notifications/*', 'notification', 'ALL', true);

    // Content routes
    this.addRoute('/api/v1/reviews/*', 'content', 'ALL', true);
    this.addRoute('/api/v1/upload/*', 'content', 'ALL', true);

    // Pricing routes
    this.addRoute('/api/v1/price-alerts/*', 'pricing', 'ALL', true);

    // Admin routes
    this.addRoute('/api/v1/admin/*', 'admin', 'ALL', true);
  }

  private addRoute(
    path: string,
    service: string,
    method: string,
    requiresAuth: boolean = true,
  ): void {
    const routeKey = `${method}:${path}`;
    const serviceConfig = getServiceConfig(
      this.configService,
      service as ServiceName,
    );

    this.routes.set(routeKey, {
      path,
      service,
      method,
      requiresAuth,
      rateLimit: serviceConfig.rateLimit,
    });
  }

  getRoute(path: string, method: string): RouteConfig | null {
    const exactKey = `${method}:${path}`;
    if (this.routes.has(exactKey)) {
      return this.routes.get(exactKey) ?? null;
    }

    for (const [routeKey, config] of this.routes.entries()) {
      const [routeMethod, routePath] = routeKey.split(':');

      if (routeMethod === method || routeMethod === 'ALL') {
        const pattern = this.pathToRegex(routePath);
        if (pattern.test(path)) {
          return config;
        }
      }
    }

    return null;
  }

  private pathToRegex(path: string): RegExp {
    const pattern = path.replace(/\*/g, '.*').replace(/\//g, '\\/');
    return new RegExp(`^${pattern}$`);
  }

  getServiceUrl(serviceName: string): string {
    const serviceConfig = getServiceConfig(
      this.configService,
      serviceName as ServiceName,
    );
    return serviceConfig.baseUrl;
  }
}
