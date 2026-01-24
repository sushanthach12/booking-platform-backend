# Booking Platform - Microservices Architecture Design

## Table of Contents

1. [Overview](#overview)
2. [API Gateway Design](#api-gateway-design)
3. [Service Boundaries & Optimization](#service-boundaries--optimization)
4. [Database Strategy](#database-strategy)
5. [Inter-Service Communication](#inter-service-communication)
6. [Data Retrieval Patterns](#data-retrieval-patterns)
7. [Distributed Transaction Management (Saga Pattern)](#distributed-transaction-management-saga-pattern)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

This document outlines the microservices architecture for the booking platform, focusing on:
- **API Gateway** for request routing and cross-cutting concerns
- **Optimized service boundaries** (not one service per module)
- **Database per service** pattern with shared data strategies
- **Inter-service communication** patterns for data retrieval

### Architecture Principles

1. **Service Autonomy**: Each service owns its data and business logic
2. **Database per Service**: Each service has its own database
3. **API Gateway Pattern**: Single entry point for all client requests
4. **Event-Driven Communication**: Async messaging for loose coupling
5. **Data Consistency**: Eventual consistency where acceptable, strong consistency for critical operations

---

## API Gateway Design

### Technology Choice

**NestJS Gateway Service** - Custom API Gateway built with NestJS

**Why NestJS Gateway:**
- Full TypeScript/Node.js control and type safety
- Easy integration with existing NestJS microservices
- Custom logic implementation without external dependencies
- Unified codebase and deployment strategy
- Leverages existing NestJS ecosystem (guards, interceptors, filters)
- Better developer experience and debugging

### Gateway Responsibilities

```
┌─────────────────────────────────────────────────────────┐
│              NestJS API Gateway Service                  │
├─────────────────────────────────────────────────────────┤
│  • Request Routing (Path-based, Header-based)           │
│  • Authentication & Authorization (JWT validation)       │
│  • Rate Limiting (Per user, per IP, per endpoint)        │
│  • Request/Response Transformation                       │
│  • API Versioning (/v1, /v2)                              │
│  • CORS Handling                                          │
│  • Request Logging & Monitoring                          │
│  • Circuit Breaker Pattern                               │
│  • Load Balancing (Round-robin, Least connections)      │
│  • Request Aggregation (BFF pattern)                      │
│  • Response Caching                                       │
└─────────────────────────────────────────────────────────┘
```

### Gateway Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NestJS Gateway                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Controllers (Route Handlers)                             │
│    ↓                                                      │
│  Guards (Auth, Rate Limiting)                            │
│    ↓                                                      │
│  Interceptors (Logging, Transformation)                  │
│    ↓                                                      │
│  Proxy Service (HTTP Client)                              │
│    ↓                                                      │
│  Circuit Breaker                                          │
│    ↓                                                      │
│  Microservices (User, Property, Booking, etc.)          │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Gateway Implementation

#### Project Structure

```
gateway/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── gateway.config.ts
│   │   └── services.config.ts
│   ├── controllers/
│   │   ├── gateway.controller.ts
│   │   └── health.controller.ts
│   ├── services/
│   │   ├── proxy.service.ts
│   │   ├── routing.service.ts
│   │   └── circuit-breaker.service.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── rate-limit.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── transform.interceptor.ts
│   │   └── timeout.interceptor.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── common/
│       ├── decorators/
│       └── interfaces/
├── package.json
└── tsconfig.json
```

#### Main Gateway Module

```typescript
// gateway/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './controllers/gateway.controller';
import { ProxyService } from './services/proxy.service';
import { RoutingService } from './services/routing.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { gatewayConfig } from './config/gateway.config';
import { servicesConfig } from './config/services.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [gatewayConfig, servicesConfig],
      isGlobal: true,
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [GatewayController],
  providers: [
    ProxyService,
    RoutingService,
    CircuitBreakerService,
    JwtAuthGuard,
    RateLimitGuard,
    LoggingInterceptor,
    TimeoutInterceptor,
    HttpExceptionFilter,
  ],
})
export class AppModule {}
```

#### Services Configuration

```typescript
// gateway/src/config/services.config.ts
export const servicesConfig = () => ({
  services: {
    user: {
      baseUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60, // seconds
        limit: 100, // requests per TTL
      },
    },
    property: {
      baseUrl: process.env.PROPERTY_SERVICE_URL || 'http://localhost:3002',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 200,
      },
    },
    booking: {
      baseUrl: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 10, // Lower for write operations
      },
    },
    payment: {
      baseUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
      timeout: 10000, // Longer timeout for payment operations
      retries: 2,
      rateLimit: {
        ttl: 60,
        limit: 50,
      },
    },
    search: {
      baseUrl: process.env.SEARCH_SERVICE_URL || 'http://localhost:3005',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 200,
      },
    },
    notification: {
      baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
      timeout: 3000,
      retries: 2,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    content: {
      baseUrl: process.env.CONTENT_SERVICE_URL || 'http://localhost:3007',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    pricing: {
      baseUrl: process.env.PRICING_SERVICE_URL || 'http://localhost:3008',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 100,
      },
    },
    admin: {
      baseUrl: process.env.ADMIN_SERVICE_URL || 'http://localhost:3009',
      timeout: 5000,
      retries: 3,
      rateLimit: {
        ttl: 60,
        limit: 50, // Lower for admin operations
      },
    },
  },
});
```

#### Routing Service

```typescript
// gateway/src/services/routing.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
    const serviceConfig = this.configService.get(`services.${service}`);
    
    this.routes.set(routeKey, {
      path,
      service,
      method,
      requiresAuth,
      rateLimit: serviceConfig?.rateLimit,
    });
  }

  getRoute(path: string, method: string): RouteConfig | null {
    // Try exact match first
    const exactKey = `${method}:${path}`;
    if (this.routes.has(exactKey)) {
      return this.routes.get(exactKey);
    }

    // Try pattern matching
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
    const pattern = path
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');
    return new RegExp(`^${pattern}$`);
  }

  getServiceUrl(serviceName: string): string {
    const serviceConfig = this.configService.get(`services.${serviceName}`);
    return serviceConfig?.baseUrl || '';
  }
}
```

#### Proxy Service

```typescript
// gateway/src/services/proxy.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { RoutingService } from './routing.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProxyService {
  constructor(
    private httpService: HttpService,
    private routingService: RoutingService,
    private circuitBreaker: CircuitBreakerService,
    private configService: ConfigService,
  ) {}

  async proxyRequest(
    method: string,
    path: string,
    body: any,
    headers: Record<string, string>,
    query: Record<string, any>,
  ): Promise<any> {
    const route = this.routingService.getRoute(path, method);
    
    if (!route) {
      throw new HttpException(
        `No route found for ${method} ${path}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const serviceUrl = this.routingService.getServiceUrl(route.service);
    const serviceConfig = this.configService.get(`services.${route.service}`);
    const targetUrl = `${serviceUrl}${path}`;

    // Remove gateway-specific headers
    const cleanHeaders = { ...headers };
    delete cleanHeaders.host;
    delete cleanHeaders['content-length'];

    try {
      return await this.circuitBreaker.execute(route.service, async () => {
        const requestConfig = {
          method: method.toLowerCase() as any,
          url: targetUrl,
          headers: cleanHeaders,
          params: query,
          data: body,
          timeout: serviceConfig?.timeout || 5000,
        };

        const response = await firstValueFrom(
          this.httpService.request(requestConfig).pipe(
            timeout(serviceConfig?.timeout || 5000),
            catchError((error) => {
              throw new HttpException(
                error.response?.data || error.message,
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
              );
            }),
          ),
        );

        return {
          data: response.data,
          status: response.status,
          headers: response.headers,
        };
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Service ${route.service} unavailable`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
```

#### Gateway Controller

```typescript
// gateway/src/controllers/gateway.controller.ts
import {
  Controller,
  All,
  Req,
  Res,
  Body,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  UseFilters,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from '../services/proxy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../interceptors/timeout.interceptor';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { RoutingService } from '../services/routing.service';
import { Public } from '../common/decorators/public.decorator';

@Controller()
@UseInterceptors(LoggingInterceptor, TimeoutInterceptor)
@UseFilters(HttpExceptionFilter)
export class GatewayController {
  constructor(
    private proxyService: ProxyService,
    private routingService: RoutingService,
  ) {}

  @All('*')
  async handleRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Query() query: Record<string, any>,
    @Headers() headers: Record<string, string>,
  ) {
    const route = this.routingService.getRoute(req.path, req.method);
    
    if (!route) {
      return res.status(404).json({
        statusCode: 404,
        message: `Route not found: ${req.method} ${req.path}`,
      });
    }

    // Apply auth guard if required
    if (route.requiresAuth) {
      const authGuard = new JwtAuthGuard();
      await authGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => res,
        }),
      } as any);
    }

    // Apply rate limiting
    const rateLimitGuard = new RateLimitGuard(route.rateLimit);
    await rateLimitGuard.canActivate({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as any);

    try {
      const response = await this.proxyService.proxyRequest(
        req.method,
        req.path,
        body,
        headers,
        query,
      );

      return res.status(response.status).json(response.data);
    } catch (error) {
      const status = error.status || 500;
      const message = error.message || 'Internal server error';
      return res.status(status).json({
        statusCode: status,
        message,
      });
    }
  }
}
```

#### Main Bootstrap

```typescript
// gateway/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable shutdown hooks
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Gateway is running on: http://localhost:${port}`);
}

bootstrap();
```

#### Additional Gateway Components

##### JWT Authentication Guard

```typescript
// gateway/src/guards/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

##### Rate Limiting Guard

```typescript
// gateway/src/guards/rate-limit.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '@nestjs-modules/ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const route = request.route;
    
    if (!route?.rateLimit) {
      return true; // No rate limit configured
    }

    const key = this.getRateLimitKey(request, route);
    const { ttl, limit } = route.rateLimit;

    const current = await this.redisService.getClient().incr(key);
    
    if (current === 1) {
      await this.redisService.getClient().expire(key, ttl);
    }

    if (current > limit) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getRateLimitKey(request: any, route: any): string {
    const userId = request.user?.sub || 'anonymous';
    const ip = request.ip;
    return `rate_limit:${route.service}:${userId}:${ip}`;
  }
}
```

##### Logging Interceptor

```typescript
// gateway/src/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const delay = Date.now() - now;

          this.logger.log(
            `${method} ${url} ${statusCode} - ${delay}ms - ${ip}`,
          );
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(
            `${method} ${url} ${error.status || 500} - ${delay}ms - ${ip} - ${error.message}`,
          );
        },
      }),
    );
  }
}
```

##### Timeout Interceptor

```typescript
// gateway/src/interceptors/timeout.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly timeout = 30000; // 30 seconds default

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeout),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => err);
      }),
    );
  }
}
```

##### HTTP Exception Filter

```typescript
// gateway/src/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

##### Circuit Breaker Service

```typescript
// gateway/src/services/circuit-breaker.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';

interface CircuitState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits: Map<string, CircuitState> = new Map();
  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 minute
  private readonly successThreshold = 2;

  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const circuit = this.getCircuit(serviceName);

    if (circuit.state === 'OPEN') {
      if (Date.now() - circuit.lastFailureTime > this.timeout) {
        circuit.state = 'HALF_OPEN';
        this.logger.log(`Circuit breaker for ${serviceName} moved to HALF_OPEN`);
      } else {
        throw new HttpException(
          `Circuit breaker is OPEN for ${serviceName}`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess(serviceName, circuit);
      return result;
    } catch (error) {
      this.onFailure(serviceName, circuit);
      throw error;
    }
  }

  private getCircuit(serviceName: string): CircuitState {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
      });
    }
    return this.circuits.get(serviceName)!;
  }

  private onSuccess(serviceName: string, circuit: CircuitState): void {
    if (circuit.state === 'HALF_OPEN') {
      circuit.failures = 0;
      circuit.state = 'CLOSED';
      this.logger.log(`Circuit breaker for ${serviceName} moved to CLOSED`);
    } else if (circuit.state === 'CLOSED') {
      circuit.failures = Math.max(0, circuit.failures - 1);
    }
  }

  private onFailure(serviceName: string, circuit: CircuitState): void {
    circuit.failures++;
    circuit.lastFailureTime = Date.now();

    if (circuit.failures >= this.failureThreshold) {
      circuit.state = 'OPEN';
      this.logger.warn(
        `Circuit breaker for ${serviceName} moved to OPEN after ${circuit.failures} failures`,
      );
    }
  }
}
```

#### Environment Configuration

```env
# gateway/.env
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h

# Service URLs
USER_SERVICE_URL=http://localhost:3001
PROPERTY_SERVICE_URL=http://localhost:3002
BOOKING_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004
SEARCH_SERVICE_URL=http://localhost:3005
NOTIFICATION_SERVICE_URL=http://localhost:3006
CONTENT_SERVICE_URL=http://localhost:3007
PRICING_SERVICE_URL=http://localhost:3008
ADMIN_SERVICE_URL=http://localhost:3009

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Redis (for rate limiting and caching)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Service Boundaries & Optimization

### Service Decomposition Strategy

**Key Principle**: Group related modules by business capability and data ownership, not by technical layers.

### Optimized Service Boundaries

Based on your current modules, here's the recommended service grouping:

```
┌─────────────────────────────────────────────────────────────┐
│                    Microservices Architecture                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User Service (Auth + Users)                              │
│     • Authentication (login, register, JWT)                 │
│     • User management (profiles, preferences)                 │
│     • OAuth integration                                       │
│     • Password reset                                          │
│                                                               │
│  2. Property Service (Properties + Availability)             │
│     • Property CRUD operations                                │
│     • Availability calendar management                        │
│     • Property metadata (amenities, images)                   │
│     • Host property management                                │
│                                                               │
│  3. Booking Service (Bookings + Waitlist)                    │
│     • Booking creation & cancellation                         │
│     • Waitlist management                                     │
│     • Slot reservations                                       │
│     • Booking history                                         │
│                                                               │
│  4. Search Service (Search + Analytics)                      │
│     • Property search with filters                            │
│     • Geospatial search (PostGIS)                            │
│     • Search result caching                                   │
│     • Search analytics                                        │
│     • Recommendation engine                                   │
│                                                               │
│  5. Payment Service (Payments)                               │
│     • Payment processing                                      │
│     • Payment gateway integration                             │
│     • Webhook handling                                        │
│     • Refund processing                                       │
│                                                               │
│  6. Notification Service (Notifications)                     │
│     • Email notifications                                     │
│     • SMS notifications                                       │
│     • Push notifications                                      │
│     • Notification templates                                  │
│                                                               │
│  7. Content Service (Reviews + Upload)                      │
│     • Reviews & ratings                                       │
│     • File upload (images, documents)                        │
│     • Content moderation                                      │
│                                                               │
│  8. Pricing Service (Price Alerts)                           │
│     • Price monitoring                                        │
│     • Price alerts                                            │
│     • Dynamic pricing calculations                            │
│     • Auto-booking on price drop                              │
│                                                               │
│  9. Admin Service (Admin + Health)                           │
│     • Admin operations                                        │
│     • System health checks                                    │
│     • Platform analytics                                      │
│     • User moderation                                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Service Grouping Rationale

#### 1. User Service (Auth + Users)
**Why together:**
- Strong data coupling (users table needed for auth)
- Shared JWT token management
- Common user profile operations
- Single source of truth for user data

**Database:** `users_db` (PostgreSQL)
- `users` table
- `user_sessions` table
- `oauth_tokens` table

#### 2. Property Service (Properties + Availability)
**Why together:**
- Availability is tightly coupled with properties
- Frequent joint queries (property + availability)
- Strong consistency requirements
- Reduces inter-service calls

**Database:** `properties_db` (PostgreSQL with PostGIS)
- `properties` table
- `availability_calendar` table
- `property_images` table
- `amenities` table

#### 3. Booking Service (Bookings + Waitlist)
**Why together:**
- Waitlist is booking-related functionality
- Shared business logic (slot reservations)
- Transactional requirements
- Reduces complexity

**Database:** `bookings_db` (PostgreSQL)
- `bookings` table
- `waitlist` table
- `slot_reservations` table

#### 4. Search Service (Search + Analytics)
**Why together:**
- Search results feed analytics
- Shared caching strategies
- Read-heavy workload (can scale independently)
- Can use read replicas/Elasticsearch

**Database:** `search_db` (PostgreSQL + Elasticsearch)
- Search index (Elasticsearch)
- Search analytics (PostgreSQL)
- Search cache (Redis)

#### 5. Payment Service (Standalone)
**Why separate:**
- PCI-DSS compliance requirements
- Isolated security boundary
- Independent scaling needs
- Different failure modes

**Database:** `payments_db` (PostgreSQL)
- `payments` table
- `payment_methods` table
- `refunds` table

#### 6. Notification Service (Standalone)
**Why separate:**
- Async, fire-and-forget operations
- Different scaling patterns
- Can use message queues
- Independent failure tolerance

**Database:** `notifications_db` (PostgreSQL)
- `notifications` table
- `notification_templates` table
- `notification_logs` table

#### 7. Content Service (Reviews + Upload)
**Why together:**
- Both handle user-generated content
- Similar moderation workflows
- Shared storage (S3/Azure Blob)
- Content-related operations

**Database:** `content_db` (PostgreSQL)
- `reviews` table
- `ratings` table
- `upload_metadata` table

#### 8. Pricing Service (Standalone)
**Why separate:**
- Background job processing
- Price monitoring is independent
- Can scale based on alert volume
- Event-driven architecture

**Database:** `pricing_db` (PostgreSQL)
- `price_alerts` table
- `price_history` table
- `pricing_rules` table

#### 9. Admin Service (Admin + Health)
**Why together:**
- Both are operational concerns
- Low traffic, high privilege
- Aggregates data from other services
- System monitoring

**Database:** `admin_db` (PostgreSQL)
- `admin_users` table
- `audit_logs` table
- `system_metrics` table

---

## Database Strategy

### Database per Service Pattern

**Principle**: Each microservice has its own database. Services cannot directly access other services' databases.

### Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Database per Service                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User Service          →  users_db (PostgreSQL)              │
│  Property Service      →  properties_db (PostgreSQL + PostGIS)│
│  Booking Service      →  bookings_db (PostgreSQL)            │
│  Search Service        →  search_db (PostgreSQL + Elasticsearch)│
│  Payment Service      →  payments_db (PostgreSQL)           │
│  Notification Service  →  notifications_db (PostgreSQL)      │
│  Content Service       →  content_db (PostgreSQL)             │
│  Pricing Service       →  pricing_db (PostgreSQL)             │
│  Admin Service         →  admin_db (PostgreSQL)               │
│                                                               │
│  Shared Infrastructure:                                       │
│  • Redis Cluster (Cache, Locks, Pub/Sub)                     │
│  • Message Queue (RabbitMQ/Kafka)                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Database Design per Service

#### User Service Database
```sql
-- users_db
CREATE DATABASE users_db;

-- Tables
users
user_sessions
oauth_tokens
user_preferences
password_reset_tokens
```

#### Property Service Database
```sql
-- properties_db
CREATE DATABASE properties_db;
CREATE EXTENSION postgis;

-- Tables
properties
availability_calendar
property_images
amenities
property_pricing_rules
```

#### Booking Service Database
```sql
-- bookings_db
CREATE DATABASE bookings_db;

-- Tables
bookings
waitlist
slot_reservations
booking_invitations
```

#### Search Service Database
```sql
-- search_db (PostgreSQL for analytics)
CREATE DATABASE search_db;

-- Tables
search_analytics
search_history
popular_searches

-- Elasticsearch Index
properties_index (for fast search)
```

#### Payment Service Database
```sql
-- payments_db
CREATE DATABASE payments_db;

-- Tables
payments
payment_methods
refunds
payment_webhooks
```

### Shared Data Strategy

**Problem**: Services need data from other services (e.g., Booking Service needs Property data).

**Solutions:**

#### 1. API Calls (Synchronous)
- **Use Case**: Real-time data needed for request
- **Example**: Booking Service calls Property Service for property details
- **Pros**: Always up-to-date data
- **Cons**: Network latency, service coupling, failure propagation

#### 2. Data Replication (Asynchronous)
- **Use Case**: Frequently accessed data, read-heavy
- **Example**: Booking Service maintains a local copy of property data
- **Pros**: Fast reads, reduced coupling, better availability
- **Cons**: Eventual consistency, storage overhead, sync complexity

#### 3. Event Sourcing / CQRS
- **Use Case**: Complex data relationships, audit requirements
- **Example**: Property events published, Booking Service subscribes
- **Pros**: Decoupling, audit trail, scalability
- **Cons**: Complexity, eventual consistency

#### 4. Shared Read Database (Anti-pattern, but sometimes acceptable)
- **Use Case**: Read-only shared data, strict consistency needed
- **Example**: Shared read replica for reference data
- **Pros**: Strong consistency, simple
- **Cons**: Violates service autonomy, scaling limitations

### Recommended Approach: Hybrid

**For Booking Service needing Property data:**

1. **Critical Path (Synchronous API)**: 
   - Booking creation needs real-time property validation
   - Use HTTP call to Property Service with circuit breaker

2. **Non-Critical Path (Replicated Data)**:
   - Property details for booking history
   - Replicate via events to Booking Service's read store

3. **Cache Layer**:
   - Redis cache for frequently accessed property data
   - Reduces API calls

---

## Inter-Service Communication

### Communication Patterns

```
┌─────────────────────────────────────────────────────────────┐
│              Inter-Service Communication Patterns            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Synchronous (HTTP/REST)                                   │
│     • Request-Response pattern                                │
│     • Real-time data needed                                  │
│     • Use: Booking → Property (validate property)           │
│                                                               │
│  2. Asynchronous (Message Queue)                              │
│     • Event-driven pattern                                   │
│     • Fire-and-forget operations                             │
│     • Use: Booking → Notification (send email)                │
│                                                               │
│  3. Pub/Sub (Redis/RabbitMQ)                                 │
│     • Publish-Subscribe pattern                              │
│     • Multiple subscribers                                   │
│     • Use: Property updated → Search, Booking, Pricing      │
│                                                               │
│  4. gRPC (Optional, for high-performance)                     │
│     • Binary protocol, faster than REST                      │
│     • Service-to-service communication                       │
│     • Use: Internal service calls                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Synchronous Communication (HTTP/REST)

**When to use:**
- Need immediate response
- Transactional operations
- Data validation before proceeding

**Example: Booking Service → Property Service**

```typescript
// booking-service/src/services/property-client.service.ts
import { Injectable, HttpService } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PropertyClientService {
  constructor(private httpService: HttpService) {}

  async getProperty(propertyId: string): Promise<PropertyDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`http://property-service/api/v1/properties/${propertyId}`, {
          timeout: 5000, // 5 second timeout
        })
      );
      return response.data;
    } catch (error) {
      // Circuit breaker pattern
      throw new ServiceUnavailableException('Property service unavailable');
    }
  }

  async checkAvailability(
    propertyId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<boolean> {
    const response = await firstValueFrom(
      this.httpService.post(
        `http://property-service/api/v1/properties/${propertyId}/availability`,
        { checkIn, checkOut },
        { timeout: 3000 }
      )
    );
    return response.data.available;
  }
}
```

**Circuit Breaker Implementation:**

```typescript
// booking-service/src/common/circuit-breaker/circuit-breaker.service.ts
@Injectable()
export class CircuitBreakerService {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (this.isOpen(serviceName)) {
      throw new ServiceUnavailableException(`${serviceName} circuit breaker open`);
    }

    try {
      const result = await operation();
      this.onSuccess(serviceName);
      return result;
    } catch (error) {
      this.onFailure(serviceName);
      throw error;
    }
  }

  private isOpen(serviceName: string): boolean {
    const failures = this.failures.get(serviceName) || 0;
    const lastFailure = this.lastFailureTime.get(serviceName) || 0;
    
    if (failures >= this.threshold) {
      if (Date.now() - lastFailure < this.timeout) {
        return true; // Circuit is open
      }
      // Timeout passed, reset
      this.failures.set(serviceName, 0);
    }
    return false;
  }

  private onSuccess(serviceName: string): void {
    this.failures.set(serviceName, 0);
  }

  private onFailure(serviceName: string): void {
    const current = this.failures.get(serviceName) || 0;
    this.failures.set(serviceName, current + 1);
    this.lastFailureTime.set(serviceName, Date.now());
  }
}
```

### Asynchronous Communication (Message Queue)

**When to use:**
- Non-critical operations
- Background processing
- Decoupling services
- Event notifications

**Technology Options:**
- **RabbitMQ**: Easy to use, good for simple pub/sub
- **Apache Kafka**: High throughput, event streaming
- **Redis Pub/Sub**: Lightweight, good for simple cases
- **AWS SQS/SNS**: Managed, serverless

**Example: Booking Created Event**

```typescript
// booking-service/src/events/booking-created.event.ts
export class BookingCreatedEvent {
  constructor(
    public readonly bookingId: string,
    public readonly propertyId: string,
    public readonly guestId: string,
    public readonly checkIn: Date,
    public readonly checkOut: Date,
    public readonly totalPrice: number,
  ) {}
}
```

```typescript
// booking-service/src/services/booking.service.ts
@Injectable()
export class BookingService {
  constructor(
    private eventEmitter: EventEmitter2,
    // ... other dependencies
  ) {}

  async createBooking(dto: CreateBookingDto): Promise<Booking> {
    // ... create booking logic
    
    // Publish event
    const event = new BookingCreatedEvent(
      booking.id,
      booking.propertyId,
      booking.guestId,
      booking.checkIn,
      booking.checkOut,
      booking.totalPrice,
    );
    
    this.eventEmitter.emit('booking.created', event);
    
    return booking;
  }
}
```

```typescript
// notification-service/src/listeners/booking-listener.ts
@Injectable()
export class BookingListener {
  @OnEvent('booking.created')
  async handleBookingCreated(event: BookingCreatedEvent) {
    // Send notification
    await this.notificationService.send({
      userId: event.guestId,
      type: 'booking_confirmation',
      data: { bookingId: event.bookingId },
    });
  }
}
```

### Data Replication Pattern

**When to use:**
- Frequently accessed data
- Reduce inter-service calls
- Improve performance
- Better availability

**Example: Property Data in Booking Service**

```typescript
// property-service/src/events/property-updated.event.ts
export class PropertyUpdatedEvent {
  constructor(
    public readonly propertyId: string,
    public readonly data: Partial<Property>,
  ) {}
}
```

```typescript
// booking-service/src/replicated/property-replica.entity.ts
@Entity('property_replicas')
export class PropertyReplica {
  @PrimaryColumn('uuid')
  propertyId: string;

  @Column()
  title: string;

  @Column()
  hostId: string;

  @Column('decimal')
  pricePerNight: number;

  @Column('jsonb')
  address: any;

  @Column('timestamp')
  lastSyncedAt: Date;
}
```

```typescript
// booking-service/src/listeners/property-listener.ts
@Injectable()
export class PropertyListener {
  @OnEvent('property.updated')
  async handlePropertyUpdated(event: PropertyUpdatedEvent) {
    // Update local replica
    await this.propertyReplicaRepo.upsert({
      propertyId: event.propertyId,
      ...event.data,
      lastSyncedAt: new Date(),
    }, ['propertyId']);
  }
}
```

---

## Data Retrieval Patterns

### Scenario: Booking Service Needs Property Data

**Problem**: When creating a booking, the Booking Service needs property information (price, availability, host details).

### Solution Options

#### Option 1: Synchronous API Call (Recommended for Critical Path)

```typescript
// booking-service/src/services/booking.service.ts
@Injectable()
export class BookingService {
  constructor(
    private propertyClient: PropertyClientService,
    private availabilityClient: AvailabilityClientService,
  ) {}

  async createBooking(dto: CreateBookingDto): Promise<Booking> {
    // 1. Fetch property data (synchronous)
    const property = await this.propertyClient.getProperty(dto.propertyId);
    
    // 2. Check availability (synchronous)
    const isAvailable = await this.availabilityClient.checkAvailability(
      dto.propertyId,
      dto.checkIn,
      dto.checkOut,
    );
    
    if (!isAvailable) {
      throw new ConflictException('Property not available');
    }
    
    // 3. Calculate price
    const totalPrice = this.calculatePrice(
      property.pricePerNight,
      dto.checkIn,
      dto.checkOut,
    );
    
    // 4. Create booking
    return this.bookingRepo.save({
      ...dto,
      totalPrice,
      propertyTitle: property.title, // Denormalized for display
    });
  }
}
```

**Pros:**
- Always up-to-date data
- Simple implementation
- Strong consistency

**Cons:**
- Network latency (adds ~50-200ms)
- Service coupling
- Failure propagation

**Mitigation:**
- Use circuit breaker
- Cache frequently accessed properties
- Set appropriate timeouts
- Use connection pooling

#### Option 2: Data Replication with Event Sourcing

```typescript
// booking-service maintains local copy of property data
// Updated via events from property-service

@Injectable()
export class BookingService {
  constructor(
    private propertyReplicaRepo: Repository<PropertyReplica>,
  ) {}

  async createBooking(dto: CreateBookingDto): Promise<Booking> {
    // 1. Get property from local replica (fast, no network call)
    const property = await this.propertyReplicaRepo.findOne({
      where: { propertyId: dto.propertyId },
    });
    
    if (!property) {
      // Fallback to API call if replica not available
      return this.createBookingWithApiCall(dto);
    }
    
    // 2. Use replicated data
    const totalPrice = this.calculatePrice(
      property.pricePerNight,
      dto.checkIn,
      dto.checkOut,
    );
    
    // 3. Still validate availability via API (critical)
    const isAvailable = await this.availabilityClient.checkAvailability(
      dto.propertyId,
      dto.checkIn,
      dto.checkOut,
    );
    
    // ... create booking
  }
}
```

**Pros:**
- Fast reads (no network call)
- Better availability
- Reduced coupling

**Cons:**
- Eventual consistency
- Storage overhead
- Sync complexity

#### Option 3: Hybrid Approach (Recommended)

```typescript
@Injectable()
export class BookingService {
  constructor(
    private propertyClient: PropertyClientService,
    private propertyReplicaRepo: Repository<PropertyReplica>,
    private cacheService: CacheService,
  ) {}

  async createBooking(dto: CreateBookingDto): Promise<Booking> {
    // 1. Try cache first
    let property = await this.cacheService.get<Property>(
      `property:${dto.propertyId}`
    );
    
    // 2. Try replica if cache miss
    if (!property) {
      const replica = await this.propertyReplicaRepo.findOne({
        where: { propertyId: dto.propertyId },
      });
      
      if (replica && this.isReplicaFresh(replica)) {
        property = this.mapReplicaToProperty(replica);
        await this.cacheService.set(`property:${dto.propertyId}`, property, 300);
      }
    }
    
    // 3. Fallback to API call
    if (!property) {
      property = await this.propertyClient.getProperty(dto.propertyId);
      await this.cacheService.set(`property:${dto.propertyId}`, property, 300);
    }
    
    // 4. Critical validation via API (always synchronous)
    const isAvailable = await this.availabilityClient.checkAvailability(
      dto.propertyId,
      dto.checkIn,
      dto.checkOut,
    );
    
    // ... rest of booking creation
  }
  
  private isReplicaFresh(replica: PropertyReplica): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - replica.lastSyncedAt.getTime() < maxAge;
  }
}
```

**Strategy:**
- **Cache (Redis)**: Hot data, TTL 5 minutes
- **Replica (Local DB)**: Frequently accessed, updated via events
- **API Call**: Fallback, always for critical validations

### Data Retrieval Decision Matrix

| Scenario | Method | Reason |
|----------|--------|--------|
| Booking creation - property validation | Synchronous API | Critical, needs real-time data |
| Booking creation - property display | Cache/Replica | Non-critical, can be slightly stale |
| Availability check | Synchronous API | Critical, real-time required |
| Booking history - property details | Replica/Cache | Read-only, eventual consistency OK |
| Payment processing - booking details | Synchronous API | Critical, needs latest status |
| Search results - property data | Replica/Elasticsearch | Read-heavy, eventual consistency OK |
| Notification - user details | Replica/Cache | Non-critical, can be stale |

---

## Distributed Transaction Management (Saga Pattern)

### Overview

The **Saga Pattern** is used to manage distributed transactions across multiple microservices for the booking operation. Since booking involves multiple services (Property, Booking, Payment, Notification), we need a way to ensure data consistency and handle failures gracefully.

### Why Saga Pattern for Booking?

**Problem**: Booking creation spans multiple services:
1. **Property Service** - Reserve availability
2. **Booking Service** - Create booking record
3. **Payment Service** - Process payment
4. **Notification Service** - Send confirmation

**Challenge**: If payment fails after booking is created, we need to rollback the booking and release availability.

**Solution**: Orchestration-based Saga with compensation for each local transaction.

### Saga Pattern Implementation

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Booking Saga Orchestrator                       │
│                    (Booking Service)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 1: Reserve Availability                                │
│    → Property Service                                        │
│    ✓ Compensation: Release Availability                     │
│                                                               │
│  Step 2: Create Booking                                      │
│    → Booking Service (Local DB)                              │
│    ✓ Compensation: Cancel Booking                            │
│                                                               │
│  Step 3: Process Payment                                     │
│    → Payment Service                                         │
│    ✓ Compensation: Refund Payment                            │
│                                                               │
│  Step 4: Confirm Booking                                     │
│    → Booking Service (Update Status)                         │
│    ✓ Compensation: Revert Status                             │
│                                                               │
│  Step 5: Send Notification                                   │
│    → Notification Service (Fire & Forget)                     │
│    ✗ No Compensation Needed                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Implementation

**Booking Saga Service**

```typescript
// booking-service/src/services/booking-saga.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BookingRepository } from '../repositories/booking.repository';

interface SagaStep {
  name: string;
  execute: () => Promise<any>;
  compensate: () => Promise<void>;
}

interface BookingSagaContext {
  propertyId: string;
  guestId: string;
  checkInDate: Date;
  checkOutDate: Date;
  totalPrice: number;
  paymentMethodId: string;
  // Results from each step
  availabilityReservationId?: string;
  bookingId?: string;
  paymentId?: string;
}

@Injectable()
export class BookingSagaService {
  private readonly logger = new Logger(BookingSagaService.name);
  private completedSteps: SagaStep[] = [];

  constructor(
    private httpService: HttpService,
    private bookingRepo: BookingRepository,
  ) {}

  async executeBookingSaga(dto: CreateBookingDto, userId: string): Promise<Booking> {
    const context: BookingSagaContext = {
      propertyId: dto.propertyId,
      guestId: userId,
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      totalPrice: dto.totalPrice,
      paymentMethodId: dto.paymentMethodId,
    };

    this.completedSteps = [];

    try {
      // Step 1: Reserve Availability
      await this.executeStep(
        this.createReserveAvailabilityStep(context),
        context,
      );

      // Step 2: Create Booking
      await this.executeStep(
        this.createBookingStep(context),
        context,
      );

      // Step 3: Process Payment
      await this.executeStep(
        this.createProcessPaymentStep(context),
        context,
      );

      // Step 4: Confirm Booking
      await this.executeStep(
        this.createConfirmBookingStep(context),
        context,
      );

      // Step 5: Send Notification (no compensation needed)
      this.sendNotification(context).catch((err) => {
        this.logger.warn('Notification failed, but booking is confirmed', err);
      });

      return await this.bookingRepo.findOne({ where: { id: context.bookingId } });
    } catch (error) {
      // Compensate all completed steps in reverse order
      await this.compensateAll();
      throw error;
    }
  }

  // Execute a step and track it for compensation
  private async executeStep(step: SagaStep, context: BookingSagaContext): Promise<void> {
    try {
      await step.execute();
      this.completedSteps.push(step);
      this.logger.log(`Step completed: ${step.name}`);
    } catch (error) {
      this.logger.error(`Step failed: ${step.name}`, error);
      throw error;
    }
  }

  // Compensate all completed steps in reverse order
  private async compensateAll(): Promise<void> {
    this.logger.warn(`Compensating ${this.completedSteps.length} completed steps`);

    // Compensate in reverse order
    for (let i = this.completedSteps.length - 1; i >= 0; i--) {
      const step = this.completedSteps[i];
      try {
        await step.compensate();
        this.logger.log(`Compensation completed: ${step.name}`);
      } catch (error) {
        this.logger.error(`Compensation failed: ${step.name}`, error);
        // Continue with other compensations even if one fails
      }
    }
  }

  // Step 1: Reserve Availability with Compensation
  private createReserveAvailabilityStep(context: BookingSagaContext): SagaStep {
    return {
      name: 'ReserveAvailability',
      execute: async () => {
        const response = await firstValueFrom(
          this.httpService.post(
            `${process.env.PROPERTY_SERVICE_URL}/api/v1/properties/${context.propertyId}/availability/reserve`,
            {
              checkInDate: context.checkInDate,
              checkOutDate: context.checkOutDate,
            },
            { timeout: 5000 },
          ),
        );

        if (!response.data.reserved) {
          throw new Error('Failed to reserve availability');
        }

        context.availabilityReservationId = response.data.reservationId;
      },
      compensate: async () => {
        if (context.availabilityReservationId) {
          await firstValueFrom(
            this.httpService.post(
              `${process.env.PROPERTY_SERVICE_URL}/api/v1/properties/${context.propertyId}/availability/release`,
              {
                reservationId: context.availabilityReservationId,
              },
              { timeout: 5000 },
            ),
          );
          this.logger.log(`Availability released: ${context.availabilityReservationId}`);
        }
      },
    };
  }

  // Step 2: Create Booking with Compensation
  private createBookingStep(context: BookingSagaContext): SagaStep {
    return {
      name: 'CreateBooking',
      execute: async () => {
        const booking = await this.bookingRepo.save({
          propertyId: context.propertyId,
          guestId: context.guestId,
          checkInDate: context.checkInDate,
          checkOutDate: context.checkOutDate,
          totalPrice: context.totalPrice,
          status: 'pending',
          paymentStatus: 'pending',
        });

        context.bookingId = booking.id;
      },
      compensate: async () => {
        if (context.bookingId) {
          await this.bookingRepo.update(
            { id: context.bookingId },
            {
              status: 'cancelled',
              paymentStatus: 'failed',
              cancellationReason: 'Saga rollback',
            },
          );
          this.logger.log(`Booking cancelled: ${context.bookingId}`);
        }
      },
    };
  }

  // Step 3: Process Payment with Compensation
  private createProcessPaymentStep(context: BookingSagaContext): SagaStep {
    return {
      name: 'ProcessPayment',
      execute: async () => {
        const response = await firstValueFrom(
          this.httpService.post(
            `${process.env.PAYMENT_SERVICE_URL}/api/v1/payments`,
            {
              bookingId: context.bookingId,
              amount: context.totalPrice,
              paymentMethodId: context.paymentMethodId,
            },
            { timeout: 10000 },
          ),
        );

        if (response.data.status !== 'succeeded') {
          throw new Error(
            `Payment failed: ${response.data.failureReason || 'Unknown error'}`,
          );
        }

        context.paymentId = response.data.id;
      },
      compensate: async () => {
        if (context.paymentId) {
          try {
            await firstValueFrom(
              this.httpService.post(
                `${process.env.PAYMENT_SERVICE_URL}/api/v1/payments/${context.paymentId}/refund`,
                {},
                { timeout: 5000 },
              ),
            );
            this.logger.log(`Payment refunded: ${context.paymentId}`);
          } catch (error) {
            this.logger.error(`Failed to refund payment ${context.paymentId}`, error);
            throw error; // Re-throw to log but continue compensation
          }
        }
      },
    };
  }

  // Step 4: Confirm Booking with Compensation
  private createConfirmBookingStep(context: BookingSagaContext): SagaStep {
    return {
      name: 'ConfirmBooking',
      execute: async () => {
        await this.bookingRepo.update(
          { id: context.bookingId },
          {
            status: 'confirmed',
            paymentStatus: 'succeeded',
            paymentId: context.paymentId,
          },
        );
      },
      compensate: async () => {
        // Revert booking status back to pending
        if (context.bookingId) {
          await this.bookingRepo.update(
            { id: context.bookingId },
            {
              status: 'pending',
              paymentStatus: 'pending',
              paymentId: null,
            },
          );
          this.logger.log(`Booking status reverted: ${context.bookingId}`);
        }
      },
    };
  }

  // Step 5: Send Notification (no compensation needed)
  private async sendNotification(context: BookingSagaContext): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${process.env.NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
          {
            userId: context.guestId,
            type: 'booking_confirmation',
            data: { bookingId: context.bookingId },
          },
          { timeout: 3000 },
        ),
      );
    } catch (error) {
      // Non-critical, just log
      this.logger.warn('Notification failed', error);
    }
  }
}
```

#### Controller Usage

```typescript
// booking-service/src/controllers/booking.controller.ts
@Controller('bookings')
export class BookingController {
  constructor(private bookingSagaService: BookingSagaService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: User,
  ): Promise<Booking> {
    return this.bookingSagaService.executeBookingSaga(dto, user.id);
  }
}
```

### Required Service Endpoints

#### Property Service - Availability Endpoints

```typescript
// property-service/src/controllers/availability.controller.ts
@Controller('properties/:id/availability')
export class AvailabilityController {
  @Post('reserve')
  async reserveAvailability(
    @Param('id') propertyId: string,
    @Body() dto: ReserveAvailabilityDto,
  ) {
    // Reserve availability with distributed lock
    // Return reservation ID for compensation
    const reservationId = await this.availabilityService.reserve(
      propertyId,
      dto.checkInDate,
      dto.checkOutDate,
    );
    return { reserved: true, reservationId };
  }

  @Post('release')
  async releaseAvailability(
    @Param('id') propertyId: string,
    @Body() dto: ReleaseAvailabilityDto,
  ) {
    // Release availability reservation
    await this.availabilityService.release(
      propertyId,
      dto.reservationId,
    );
    return { released: true };
  }
}
```

#### Payment Service - Refund Endpoint

```typescript
// payment-service/src/controllers/payment.controller.ts
@Controller('payments')
export class PaymentController {
  @Post(':id/refund')
  async refundPayment(@Param('id') paymentId: string) {
    // Process refund
    const refund = await this.paymentService.refund(paymentId);
    return { refunded: true, refundId: refund.id };
  }
}
```

### Saga Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Booking Saga Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Reserve Availability                                     │
│     ┌─────────────────┐                                      │
│     │ Property Service │                                      │
│     └─────────────────┘                                      │
│            │                                                  │
│            ✓ Success                                          │
│            │                                                  │
│  2. Create Booking                                            │
│     ┌─────────────────┐                                      │
│     │ Booking Service │                                      │
│     └─────────────────┘                                      │
│            │                                                  │
│            ✓ Success                                          │
│            │                                                  │
│  3. Process Payment                                           │
│     ┌─────────────────┐                                      │
│     │ Payment Service │                                      │
│     └─────────────────┘                                      │
│            │                                                  │
│            ✓ Success                                          │
│            │                                                  │
│  4. Confirm Booking                                           │
│     ┌─────────────────┐                                      │
│     │ Booking Service │                                      │
│     └─────────────────┘                                      │
│            │                                                  │
│            ✓ Success                                          │
│            │                                                  │
│  5. Send Notification (Async)                                 │
│     ┌─────────────────┐                                      │
│     │ Notification     │                                      │
│     │ Service          │                                      │
│     └─────────────────┘                                      │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  If ANY step fails:                                          │
│                                                               │
│  Compensation (Reverse Order):                                │
│    1. Revert Booking Status                                  │
│    2. Refund Payment                                         │
│    3. Cancel Booking                                         │
│    4. Release Availability                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Benefits

1. **Automatic Rollback**: If payment fails, booking is cancelled and availability is released
2. **Data Consistency**: All-or-nothing semantics across services
3. **Resilience**: Handles partial failures gracefully
4. **Modularity**: Each step is self-contained with its own compensation
5. **Easy to Maintain**: Clear separation of concerns, easy to add/remove steps
6. **Simple to Debug**: All logic in one place, clear error handling

### Best Practices

1. **Idempotency**: Each step should be idempotent (can be safely retried)
2. **Timeout Handling**: Set appropriate timeouts for each service call
3. **Compensation Safety**: Compensations should be safe to retry
4. **Logging**: Log all saga steps and compensations for debugging
5. **Monitoring**: Track saga success/failure rates
6. **Circuit Breakers**: Use circuit breakers for external service calls

### Error Handling

- **Step Failure**: Immediately trigger compensation for all completed steps
- **Compensation Failure**: Log error but continue with other compensations
- **Critical Compensation Failure**: Alert operations team for manual intervention
- **Network Timeouts**: Retry with exponential backoff before failing

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
1. Set up NestJS Gateway Service
2. Implement routing service and proxy service
3. Configure service endpoints and routing rules
4. Implement authentication guards (JWT) at gateway
5. Implement rate limiting guards
6. Set up circuit breaker pattern
7. Set up service discovery (Consul/Eureka or DNS)

### Phase 2: Core Services (Weeks 3-6)
1. **User Service**: Extract auth + users
2. **Property Service**: Extract properties + availability
3. **Booking Service**: Extract bookings + waitlist
4. Set up databases per service
5. Implement basic inter-service communication

### Phase 3: Supporting Services (Weeks 7-10)
1. **Payment Service**: Extract payments
2. **Notification Service**: Extract notifications
3. **Search Service**: Extract search + analytics
4. Implement message queue (RabbitMQ/Kafka)
5. Set up event publishing

### Phase 4: Advanced Features (Weeks 11-14)
1. **Content Service**: Extract reviews + upload
2. **Pricing Service**: Extract price alerts
3. **Admin Service**: Extract admin + health
4. Implement data replication
5. Set up monitoring (Prometheus + Grafana)

### Phase 5: Optimization (Weeks 15-16)
1. Implement caching strategies
2. Optimize inter-service calls
3. Set up circuit breakers
4. Performance testing and tuning

---

## Summary

### Key Decisions

1. **API Gateway**: NestJS Gateway Service (full TypeScript control, unified codebase)
2. **Service Boundaries**: 9 optimized services (not one per module)
3. **Database Strategy**: Database per service with hybrid data retrieval
4. **Communication**: 
   - Synchronous HTTP for critical paths
   - Async messaging for non-critical operations
   - Data replication for frequently accessed data

### Best Practices

1. **Service Autonomy**: Each service owns its data
2. **Fail Fast**: Use circuit breakers and timeouts
3. **Cache Aggressively**: Reduce inter-service calls
4. **Event-Driven**: Use events for loose coupling
5. **Monitor Everything**: Track service health and performance
6. **Version APIs**: Support multiple API versions
7. **Idempotency**: Make operations idempotent
8. **Graceful Degradation**: Handle service failures gracefully

### Technology Stack

- **API Gateway**: NestJS Gateway Service (TypeScript)
- **Services**: NestJS (TypeScript)
- **Databases**: PostgreSQL (per service)
- **Cache**: Redis Cluster
- **Message Queue**: RabbitMQ / Apache Kafka
- **Service Discovery**: Consul / Kubernetes DNS
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

---

This architecture provides a scalable, maintainable microservices foundation for your booking platform while optimizing service boundaries and data retrieval patterns.
