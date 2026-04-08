import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Minimal ioredis subset used internally. */
type RedisInstance = Pick<
  Redis,
  | 'get'
  | 'set'
  | 'del'
  | 'mget'
  | 'exists'
  | 'eval'
  | 'pipeline'
  | 'ping'
  | 'quit'
  | 'on'
>;

@Injectable()
export class RedisClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisClient.name);
  private instance: RedisInstance | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST') ?? 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') ?? 6379;

    try {
      const redis = url ? new Redis(url) : new Redis({ host, port });

      redis.on('connect', () =>
        this.logger.log('Redis connection established'),
      );
      redis.on('ready', () => this.logger.log('Redis ready'));
      redis.on('error', (err: Error) =>
        this.logger.error(`Redis error: ${err.message}`),
      );
      redis.on('close', () => this.logger.warn('Redis connection closed'));

      await redis.ping();
      this.instance = redis as RedisInstance;
      this.logger.log('Redis client initialized');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Redis connection failed: ${message}`);
      this.instance = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      this.logger.log('Redis connection closed');
    }
  }

  getInstance(): RedisInstance {
    if (!this.instance) {
      throw new Error('Redis client not available');
    }
    return this.instance;
  }
}
