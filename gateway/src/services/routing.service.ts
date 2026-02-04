import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getServiceConfig, ServiceName } from '../config/services.config';

export interface RouteConfig {
  path: string;
  service: string;
  method: string;
  excludeFromAuth?: string[];
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
    // User routes - exclude auth routes like login, register, etc.
    // this.addRoute('/api/users/*', 'user', 'ALL', [
    //   '/api/users/v1/auth/login',
    //   '/api/users/v1/auth/register',
    //   '/api/users/v1/auth/refresh',
    //   '/api/users/v1/auth/verify',
    // ]);

    // Property routes - exclude public listing endpoints
    // this.addRoute('/api/properties/*', 'property', 'ALL', [
    //   '/api/properties/v1',
    //   '/api/properties/v1/search',
    // ]);

    // Search routes - public by default
    // this.addRoute('/api/search/*', 'search', 'GET');

    // Booking routes - all require auth
    // this.addRoute('/api/bookings/*', 'booking', 'ALL');

    // User routes - exclude auth routes like login, register, etc.
    this.addRoute('/api/core/v1/auth/*', 'core', 'ALL', [
      '/api/core/v1/auth/login',
      '/api/core/v1/auth/register',
      '/api/core/v1/auth/refresh',
      '/api/core/v1/auth/verify',
    ]);

    this.addRoute('/api/core/v1/properties/*', 'core', 'ALL', [
      // properties
      '/api/core/v1/properties/listing',
      '/api/core/v1/properties/search',
      '/api/core/v1/properties/details',
    ]);
  }

  private addRoute(
    path: string,
    service: string,
    method: string,
    excludeFromAuth?: string[],
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
      excludeFromAuth,
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
    // Handle wildcard at the end of path
    if (path.endsWith('/*')) {
      const basePath = path.slice(0, -2); // Remove '/*'
      const pattern = basePath.replace(/\//g, '\\/');
      return new RegExp(`^${pattern}(/.*)?$`);
    }

    const pattern = path
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/')
      .replace(/\\\.\*/g, '.*');
    return new RegExp(`^${pattern}$`);
  }

  getServiceUrl(serviceName: string): string {
    const serviceConfig = getServiceConfig(
      this.configService,
      serviceName as ServiceName,
    );
    return serviceConfig.baseUrl;
  }

  isExcludedFromAuth(path: string, route: RouteConfig): boolean {
    if (!route.excludeFromAuth || route.excludeFromAuth.length === 0) {
      return false;
    }

    return route.excludeFromAuth.some((excludedPath) => {
      const pattern = this.pathToRegex(excludedPath);
      return pattern.test(path);
    });
  }
}
