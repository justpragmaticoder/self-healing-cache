import { CacheEntry } from '../types';

export class CacheStorage<T = any> {
  private storage = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttl?: number): void {
    // Evict if at capacity
    if (this.storage.size >= this.maxSize && !this.storage.has(key)) {
      this.evictLRU();
    }

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

  get(key: string): T | undefined {
    const entry = this.storage.get(key);

    if (!entry) return undefined;

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

  has(key: string): boolean {
    const entry = this.storage.get(key);

    if (!entry) return false;

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.storage.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  size(): number {
    return this.storage.size;
  }

  getEntry(key: string): CacheEntry<T> | undefined {
    return this.storage.get(key);
  }

  getAllEntries(): CacheEntry<T>[] {
    return Array.from(this.storage.values());
  }

  private evictLRU(): void {
    let oldestEntry: CacheEntry<T> | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.storage.entries()) {
      if (!oldestEntry || entry.lastAccessTime < oldestEntry.lastAccessTime) {
        oldestEntry = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.storage.delete(oldestKey);
    }
  }

  // Clean expired entries
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.storage.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.storage.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}
