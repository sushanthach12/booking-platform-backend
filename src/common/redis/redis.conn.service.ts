import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { Redis } from 'ioredis';

@Injectable()
export class RedisConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisConnectionService.name);

  constructor(@InjectRedis() private readonly client: Redis) {}

  onModuleInit(): void {
    try {
      this.client.on('connect', () => {
        this.logger.debug('Redis connection established');
      });
      this.client.on('ready', () => {
        this.logger.debug('Redis connection ready');
      });
      this.client.on('reconnecting', (delay) => {
        this.logger.warn(`Redis reconnecting in ${delay}ms`);
      });
      this.client.on('error', (error) => {
        this.logger.error(`Redis error: ${error.message}`, error.stack ?? '');
      });
      this.client.on('end', () => {
        this.logger.warn('Redis connection ended');
      });

      this.waitForReady(15000);
    } catch (error) {
      this.logger.error(
        `Failed to establish Redis connection on module init: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async waitForReady(timeoutMs = 15000): Promise<void> {
    if (this.client.status === 'ready') {
      return;
    }

    if (this.client.status === 'end') {
      throw new Error('Redis connection has ended');
    }

    await new Promise<void>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;
      let settled = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.client.off('ready', onReady);
        this.client.off('error', onError);
        this.client.off('end', onEnd);
      };

      const settleOnce = (fn: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        fn();
      };

      const onReady = () => settleOnce(resolve);
      const onError = (error: unknown) =>
        settleOnce(() =>
          reject(
            error instanceof Error
              ? error
              : new Error(`Redis error: ${String(error)}`),
          ),
        );
      const onEnd = () =>
        settleOnce(() =>
          reject(new Error('Redis connection ended before ready')),
        );

      this.client.once('ready', onReady);
      this.client.once('error', onError);
      this.client.once('end', onEnd);

      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          onError(new Error(`Redis connection timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      if (this.client.status === 'ready') {
        onReady();
        return;
      }

      // if (this.client.status === 'wait' || this.client.status === 'end') {
      //   this.client.connect().catch(onError);
      // }
    });
  }

  getClient(): Redis {
    if (this.client.status !== 'ready') {
      this.logger.warn(
        `Attempting to get Redis client while connection is not ready (status: ${this.client.status})`,
      );
    }
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      this.logger.warn(
        `Redis quit failed, disconnecting: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      this.client.disconnect();
    }
  }
}
