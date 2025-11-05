import { CacheEntry } from '../types';

// Abstract interface for storage adapters
export interface StorageAdapter<T = any> {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  set(key: string, value: T, ttl?: number): Promise<void>;
  get(key: string): Promise<T | undefined>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;

  // Statistics
  size(): Promise<number>;
  keys(pattern?: string): Promise<string[]>;

  // Health check
  ping(): Promise<boolean>;
}
