/**
 * Simple baseline cache WITHOUT self-healing capabilities
 * Used as baseline comparison in experiments
 */

export class SimpleCache<T = any> {
  private storage = new Map<string, { value: T; expiresAt: number }>();
  private hits = 0;
  private misses = 0;
  private errors = 0;
  private totalRequests = 0;
  private dataRefreshFunction?: (key: string) => Promise<T>;

  constructor(private readonly defaultTTL: number = 60000) {}

  setDataRefreshFunction(fn: (key: string) => Promise<T>): void {
    this.dataRefreshFunction = fn;
  }

  async get(key: string): Promise<T | undefined> {
    this.totalRequests++;

    try {
      const cached = this.storage.get(key);

      // Check if cached and not expired
      if (cached && cached.expiresAt > Date.now()) {
        this.hits++;
        return cached.value;
      }

      this.misses++;

      // Try to fetch from data source (NO RETRY - this is baseline)
      if (this.dataRefreshFunction) {
        const value = await this.dataRefreshFunction(key);
        if (value !== undefined) {
          await this.set(key, value);
          return value;
        }
      }

      return undefined;
    } catch (error) {
      this.errors++;
      throw error;
    }
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.storage.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  size(): number {
    return this.storage.size;
  }

  getStats(): any {
    return {
      cacheSize: this.storage.size,
      cacheStats: {
        hits: this.hits,
        misses: this.misses,
        hitRate: this.totalRequests > 0 ? this.hits / this.totalRequests : 0
      }
    };
  }

  stop(): void {
    // No background tasks to stop
  }
}
