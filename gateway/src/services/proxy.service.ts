import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { ServiceName, getServiceConfig } from '../config/services.config';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RoutingService } from './routing.service';

@Injectable()
export class ProxyService {
  constructor(
    private httpService: HttpService,
    private routingService: RoutingService,
    private circuitBreaker: CircuitBreakerService,
    private configService: ConfigService,
  ) {}

  async proxyRequest(
    user: {
      id: string;
      role: string;
    },
    method: string,
    path: string,
    body: unknown,
    headers: Record<string, string | string[]>,
    query: Record<string, string | string[]>,
  ): Promise<{
    data: unknown;
    status: number;
    headers: Record<string, string>;
  }> {
    const route = this.routingService.getRoute(path, method);

    if (!route) {
      throw new HttpException(
        `No route found for ${method} ${path}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const serviceUrl = this.routingService.getServiceUrl(route.service);
    const serviceConfig = getServiceConfig(
      this.configService,
      route.service as ServiceName,
    );
    const targetUrl = `${serviceUrl}${path}`;

    const cleanHeaders: Record<string, string> = {
      ...headers,
      user: JSON.stringify(user),
    };
    delete cleanHeaders.host;
    delete cleanHeaders['content-length'];

    try {
      return await this.circuitBreaker.execute(route.service, async () => {
        const requestConfig: AxiosRequestConfig = {
          method: method.toLowerCase() as
            | 'get'
            | 'post'
            | 'put'
            | 'patch'
            | 'delete'
            | 'head'
            | 'options',
          url: targetUrl,
          headers: cleanHeaders,
          params: query,
          data: body,
          timeout: serviceConfig.timeout,
        };

        const response = await firstValueFrom(
          this.httpService.request(requestConfig).pipe(
            timeout(serviceConfig.timeout),
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
          headers: response.headers as Record<string, string>,
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
