import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { SelfHealingCache } from '../../core/SelfHealingCache';
import { RedisAdapter } from '../../adapters/RedisAdapter';
import { InMemoryAdapter } from '../../adapters/InMemoryAdapter';
import { MySQLMetricsAdapter } from '../../adapters/MySQLMetricsAdapter';
import { StorageAdapter } from '../../adapters/StorageAdapter';
import { SELF_HEALING_CACHE_OPTIONS } from './constants';
import { SelfHealingCacheModuleOptions } from './self-healing-cache.module';

@Injectable()
export class SelfHealingCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SelfHealingCacheService.name);
  private cache!: SelfHealingCache;
  private storageAdapter!: StorageAdapter;
  private metricsAdapter: MySQLMetricsAdapter | null = null;
  private metricsInterval?: NodeJS.Timeout;

  constructor(
    @Inject(SELF_HEALING_CACHE_OPTIONS)
    private options: SelfHealingCacheModuleOptions,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Self-Healing Cache...');

    // Initialize storage adapter
    if (this.options.redis) {
      try {
        const redisAdapter = new RedisAdapter(
          this.options.redis.host,
          this.options.redis.port,
          this.options.redis.password,
        );
        await redisAdapter.connect();
        this.storageAdapter = redisAdapter;
        this.logger.log('Redis adapter connected');
      } catch (error) {
        this.logger.warn('Redis connection failed, using in-memory storage');
        this.storageAdapter = new InMemoryAdapter();
      }
    } else {
      this.storageAdapter = new InMemoryAdapter();
      this.logger.log('Using in-memory storage');
    }

    // Initialize metrics adapter
    if (this.options.mysql) {
      try {
        this.metricsAdapter = new MySQLMetricsAdapter(this.options.mysql);
        await this.metricsAdapter.connect();
        this.logger.log('MySQL metrics adapter connected');

        // Start periodic metrics collection
        this.metricsInterval = setInterval(async () => {
          try {
            const health = this.cache.getHealth();
            await this.metricsAdapter!.saveHealthMetrics(health.metrics, health.state);
          } catch (error) {
            this.logger.error('Failed to save metrics:', error);
          }
        }, 15000);
      } catch (error) {
        this.logger.warn('MySQL connection failed, metrics will not be persisted');
      }
    }

    // Initialize cache
    this.cache = new SelfHealingCache({
      maxSize: this.options.maxSize || 10000,
      defaultTTL: this.options.defaultTTL || 300000,
      healthCheckInterval: this.options.healthCheckInterval || 10000,
      enableML: this.options.enableML !== false,
      enableAdaptiveRecovery: this.options.enableAdaptiveRecovery !== false,
      predictionThreshold: this.options.predictionThreshold || 0.6,
      storageAdapter: this.storageAdapter,
    });

    this.logger.log('Self-Healing Cache initialized successfully');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Self-Healing Cache...');

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.cache) {
      this.cache.stop();
    }

    if (this.storageAdapter) {
      await this.storageAdapter.disconnect();
    }

    if (this.metricsAdapter) {
      await this.metricsAdapter.disconnect();
    }

    this.logger.log('Self-Healing Cache shut down successfully');
  }

  getCache(): SelfHealingCache {
    return this.cache;
  }

  getMetricsAdapter(): MySQLMetricsAdapter | null {
    return this.metricsAdapter;
  }

  async get(key: string): Promise<any | undefined> {
    return await this.cache.get(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl);
  }

  async delete(key: string): Promise<boolean> {
    return await this.cache.delete(key);
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }

  getHealth() {
    return this.cache.getHealth();
  }

  getStats() {
    return this.cache.getStats();
  }

  async triggerHealing() {
    await this.cache.triggerSelfHealing();
  }

  setDataRefreshFunction(fn: (key: string) => Promise<any>): void {
    this.cache.setDataRefreshFunction(fn);
  }

  getStorageAdapter(): any {
    return this.storageAdapter;
  }
}
