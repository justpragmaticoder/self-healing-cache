import { createClient, RedisClientType } from 'redis';
import { StorageAdapter } from './StorageAdapter';

export class RedisAdapter<T = any> implements StorageAdapter<T> {
  private client: RedisClientType;
  private connected = false;

  constructor(
    private host: string = 'localhost',
    private port: number = 6379,
    private password?: string
  ) {
    this.client = createClient({
      socket: {
        host: this.host,
        port: this.port
      },
      password: this.password
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log(`Redis connected to ${this.host}:${this.port}`);
      this.connected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis disconnected');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify({
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessTime: Date.now()
    });

    if (ttl) {
      await this.client.setEx(key, Math.floor(ttl / 1000), serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async get(key: string): Promise<T | undefined> {
    const data = await this.client.get(key);

    if (!data) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(data);

      // Update access stats
      parsed.accessCount++;
      parsed.lastAccessTime = Date.now();

      // Save updated stats back (without changing TTL)
      const ttl = await this.client.ttl(key);
      const serialized = JSON.stringify(parsed);

      if (ttl > 0) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return parsed.value as T;
    } catch (error) {
      console.error('Failed to parse cached value:', error);
      return undefined;
    }
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(key);
    return result === 1;
  }

  async clear(): Promise<void> {
    await this.client.flushDb();
  }

  async size(): Promise<number> {
    return await this.client.dbSize();
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  // Redis-specific methods
  async getMemoryUsage(): Promise<number> {
    const info = await this.client.info('memory');
    const match = info.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1]) / 1024 / 1024 : 0; // MB
  }

  async getStats(): Promise<any> {
    const info = await this.client.info('stats');
    const memory = await this.client.info('memory');

    return {
      memory: memory.split('\r\n').reduce((acc: any, line: string) => {
        const [key, value] = line.split(':');
        if (key && value) acc[key] = value;
        return acc;
      }, {}),
      stats: info.split('\r\n').reduce((acc: any, line: string) => {
        const [key, value] = line.split(':');
        if (key && value) acc[key] = value;
        return acc;
      }, {})
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}
