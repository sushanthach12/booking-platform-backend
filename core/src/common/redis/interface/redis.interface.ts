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
