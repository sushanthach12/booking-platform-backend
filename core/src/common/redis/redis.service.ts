import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Minimal Redis client interface used by this service. */
type RedisClient = Pick<
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

export interface AvailabilityCache {
  available: boolean;
  price: number;
}

export interface IRedisService {
  acquireLock(key: string, ttl?: number): Promise<string | null>;
  releaseLock(key: string, lockValue: string): Promise<boolean>;
  get(key: string): Promise<string | null>;
  getMany(keys: string[]): Promise<(string | null)[]>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  delMany(keys: string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
}

const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class RedisService
  implements IRedisService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisService.name);
  private redis: RedisClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST') ?? 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') ?? 6379;

    try {
      if (url) {
        this.redis = new Redis(url) as RedisClient;
      } else {
        this.redis = new Redis({ host, port }) as RedisClient;
      }

      this.redis.on('connect', () => {
        this.logger.log('Redis connection established');
      });
      this.redis.on('ready', () => {
        this.logger.log('Redis ready');
      });
      this.redis.on('error', (err: Error) => {
        this.logger.error(`Redis error: ${err.message}`);
      });
      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed');
      });

      await this.redis.ping();
      this.logger.log('Redis service initialized');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Redis connection failed: ${message}`);
      this.redis = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.logger.log('Redis connection closed');
    }
  }

  private guardClient(): RedisClient {
    if (!this.redis) {
      throw new Error('Redis client not available');
    }
    return this.redis;
  }

  async acquireLock(key: string, ttl: number = 30000): Promise<string | null> {
    try {
      const client = this.guardClient();
      const lockValue = this.generateLockValue();
      const lockKey = `lock:${key}`;
      const result = await client.set(lockKey, lockValue, 'PX', ttl, 'NX');
      return result === 'OK' ? lockValue : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error acquiring lock: ${message}`);
      return null;
    }
  }

  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    try {
      const client = this.guardClient();
      const lockKey = `lock:${key}`;
      const result = await client.eval(
        RELEASE_LOCK_SCRIPT,
        1,
        lockKey,
        lockValue,
      );
      return result === 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error releasing lock: ${message}`);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const client = this.guardClient();
      return await client.get(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting key ${key}: ${message}`);
      return null;
    }
  }

  async getMany(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    try {
      const client = this.guardClient();
      return await client.mget(...keys);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting keys (batch): ${message}`);
      return keys.map(() => null);
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const client = this.guardClient();
      if (ttl != null && ttl > 0) {
        await client.set(key, value, 'PX', ttl);
      } else {
        await client.set(key, value);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error setting key ${key}: ${message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      const client = this.guardClient();
      await client.del(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error deleting key ${key}: ${message}`);
    }
  }

  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      const client = this.guardClient();
      const pipeline = client.pipeline();
      for (const key of keys) {
        pipeline.del(key);
      }
      await pipeline.exec();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error deleting keys (batch): ${message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = this.guardClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error checking key ${key}: ${message}`);
      return false;
    }
  }

  private generateLockValue(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
}
