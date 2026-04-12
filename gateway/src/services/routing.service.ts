import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getServiceConfig, ServiceName } from '../config/services.config';

export interface RouteConfig {
  path: string;
  service: string;
  method: string;
  excludeFromAuth?: string[];
  /** Optional prefix to prepend when forwarding to the downstream service. */
  targetPrefix?: string;
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

    // ── Prefixed routes (legacy / direct core access) ────────────────────
    this.addRoute('/api/core/v1/auth/*', 'core', 'ALL', [
      '/api/core/v1/auth/login',
      '/api/core/v1/auth/register',
      '/api/core/v1/auth/signup',
      '/api/core/v1/auth/forgot-password',
      '/api/core/v1/auth/reset-password',
      '/api/core/v1/auth/refresh',
      '/api/core/v1/auth/verify',
    ]);

    this.addRoute('/api/core/v1/properties/*', 'core', 'ALL', [
      '/api/core/v1/properties/listing',
      '/api/core/v1/properties/search',
      '/api/core/v1/properties/details',
    ]);

    this.addRoute('/api/core/v1/bookings/*', 'core', 'ALL', [
      '/api/core/v1/bookings/check-availability',
    ]);

    this.addRoute('/api/core/v1/host/*', 'core', 'ALL');
    this.addRoute('/api/core/v1/users/*', 'core', 'ALL');
    this.addRoute('/api/core/v1/payments/*', 'core', 'ALL', [
      '/api/core/v1/payments/webhook/*',
    ]);

    // ── Bare-path aliases (frontend calls without /api/core/v1 prefix) ───
    // targetPrefix rewrites the path before forwarding to the core service
    this.addRoute(
      '/auth/*',
      'core',
      'ALL',
      [
        '/auth/login',
        '/auth/register',
        '/auth/signup',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/refresh',
        '/auth/verify',
      ],
      '/api/core/v1',
    );

    this.addRoute(
      '/properties/*',
      'core',
      'ALL',
      ['/properties/listing', '/properties/search', '/properties/details'],
      '/api/core/v1',
    );

    this.addRoute(
      '/bookings/*',
      'core',
      'ALL',
      ['/bookings/check-availability'],
      '/api/core/v1',
    );

    this.addRoute('/host/*', 'core', 'ALL', [], '/api/core/v1');
    this.addRoute('/users/*', 'core', 'ALL', [], '/api/core/v1');
    this.addRoute(
      '/payments/*',
      'core',
      'ALL',
      ['/payments/webhook/*'],
      '/api/core/v1',
    );

    // Storage routes
    this.addRoute('/api/core/v1/storage/*', 'core', 'ALL');
  }

  private addRoute(
    path: string,
    service: string,
    method: string,
    excludeFromAuth?: string[],
    targetPrefix?: string,
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
      targetPrefix,
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

  /**
   * Returns the downstream path for the given incoming path and matched route.
   * If the route has a targetPrefix, prepends it to the incoming path.
   */
  resolveTargetPath(incomingPath: string, route: RouteConfig): string {
    if (route.targetPrefix) {
      return `${route.targetPrefix}${incomingPath}`;
    }
    return incomingPath;
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
