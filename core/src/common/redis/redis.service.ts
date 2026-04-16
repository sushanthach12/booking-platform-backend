import { Injectable, Logger } from '@nestjs/common';
import { IRedisService } from './interface/redis.interface';
import { RedisConnectionService } from './redis.conn.service';

const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class RedisService implements IRedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly redisClient: RedisConnectionService) {}

  async acquireLock(key: string, ttl: number = 30000): Promise<string | null> {
    try {
      const client = this.redisClient.getClient();
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
      const client = this.redisClient.getClient();
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
      return await this.redisClient.getClient()?.get(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting key ${key}: ${message}`);
      return null;
    }
  }

  async getMany(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    try {
      return await this.redisClient.getClient()?.mget(...keys);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting keys (batch): ${message}`);
      return keys.map(() => null);
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const client = this.redisClient.getClient();
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
      await this.redisClient.getClient()?.del(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error deleting key ${key}: ${message}`);
    }
  }

  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      const pipeline = this.redisClient.getClient()?.pipeline();
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
      const result = await this.redisClient.getClient()?.exists(key);
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
