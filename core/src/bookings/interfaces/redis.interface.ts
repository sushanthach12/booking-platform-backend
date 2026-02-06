export interface IRedisService {
  acquireLock(key: string, ttl?: number): Promise<string | null>;
  releaseLock(key: string, lockValue: string): Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface AvailabilityCache {
  available: boolean;
  price: number;
}

export interface LockOptions {
  ttl?: number; // Time to live in milliseconds
  retryCount?: number;
  retryDelay?: number; // Delay between retries in milliseconds
}
