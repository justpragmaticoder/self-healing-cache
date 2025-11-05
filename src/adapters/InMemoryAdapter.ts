import { StorageAdapter } from './StorageAdapter';
import { CacheEntry } from '../types';

// In-memory adapter for testing/fallback
export class InMemoryAdapter<T = any> implements StorageAdapter<T> {
  private storage = new Map<string, CacheEntry<T>>();

  async connect(): Promise<void> {
    // No connection needed for in-memory
  }

  async disconnect(): Promise<void> {
    // No disconnection needed
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessTime: Date.now(),
      ttl
    };

    this.storage.set(key, entry);
  }

  async get(key: string): Promise<T | undefined> {
    const entry = this.storage.get(key);

    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.storage.delete(key);
      return undefined;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessTime = Date.now();

    return entry.value;
  }

  async has(key: string): Promise<boolean> {
    const entry = this.storage.get(key);

    if (!entry) {
      return false;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.storage.delete(key);
      return false;
    }

    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async size(): Promise<number> {
    return this.storage.size;
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    if (pattern === '*') {
      return Array.from(this.storage.keys());
    }

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.storage.keys()).filter(key => regex.test(key));
  }

  async ping(): Promise<boolean> {
    return true;
  }
}
