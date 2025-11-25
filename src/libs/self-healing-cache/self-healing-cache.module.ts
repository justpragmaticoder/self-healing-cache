import { Module, Global, DynamicModule } from '@nestjs/common';
import { SelfHealingCacheService } from './self-healing-cache.service';
import { ExperimentRunnerService } from './experiments/experiment-runner.service';
import { SELF_HEALING_CACHE_OPTIONS } from './constants';

/**
 * Redis configuration for cache storage
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

/**
 * MySQL configuration for metrics persistence
 */
export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Self-Healing Cache configuration options
 */
export interface SelfHealingCacheModuleOptions {
  /**
   * Maximum cache size (number of entries)
   * @default 10000
   */
  maxSize?: number;

  /**
   * Default TTL in milliseconds
   * @default 300000 (5 minutes)
   */
  defaultTTL?: number;

  /**
   * Health check interval in milliseconds
   * @default 10000 (10 seconds)
   */
  healthCheckInterval?: number;

  /**
   * ML prediction threshold (0-1)
   * @default 0.75
   */
  predictionThreshold?: number;

  /**
   * Enable machine learning predictions
   * @default true
   */
  enableML?: boolean;

  /**
   * Enable adaptive recovery strategies
   * @default true
   */
  enableAdaptiveRecovery?: boolean;

  /**
   * Redis configuration (optional, falls back to in-memory)
   */
  redis?: RedisConfig;

  /**
   * MySQL configuration for metrics (optional)
   */
  mysql?: MySQLConfig;

  /**
   * Enable experiment runner service
   * @default false (recommended for production)
   */
  enableExperiments?: boolean;
}

/**
 * Self-Healing Cache Module
 *
 * A drop-in cache layer with ML-powered failure prediction and adaptive recovery.
 *
 * @example
 * ```typescript
 * // Basic usage with Redis
 * SelfHealingCacheModule.forRoot({
 *   redis: {
 *     host: 'localhost',
 *     port: 6379,
 *   },
 * })
 *
 * // Full configuration with all features
 * SelfHealingCacheModule.forRoot({
 *   maxSize: 10000,
 *   defaultTTL: 300000,
 *   enableML: true,
 *   enableAdaptiveRecovery: true,
 *   redis: {
 *     host: process.env.REDIS_HOST,
 *     port: parseInt(process.env.REDIS_PORT),
 *   },
 *   mysql: {
 *     host: process.env.MYSQL_HOST,
 *     port: parseInt(process.env.MYSQL_PORT),
 *     user: process.env.MYSQL_USER,
 *     password: process.env.MYSQL_PASSWORD,
 *     database: process.env.MYSQL_DATABASE,
 *   },
 * })
 * ```
 */
@Global()
@Module({})
export class SelfHealingCacheModule {
  /**
   * Register SelfHealingCacheModule with configuration
   *
   * @param options - Cache configuration options
   * @returns Dynamic module
   */
  static forRoot(options: SelfHealingCacheModuleOptions = {}): DynamicModule {
    const providers: any[] = [
      {
        provide: SELF_HEALING_CACHE_OPTIONS,
        useValue: {
          maxSize: 10000,
          defaultTTL: 300000,
          healthCheckInterval: 10000,
          predictionThreshold: 0.75,
          enableML: true,
          enableAdaptiveRecovery: true,
          enableExperiments: false,
          ...options,
        },
      },
      SelfHealingCacheService,
    ];

    // Add ExperimentRunnerService only if explicitly enabled
    if (options.enableExperiments) {
      providers.push(ExperimentRunnerService);
    }

    return {
      module: SelfHealingCacheModule,
      providers,
      exports: options.enableExperiments
        ? [SelfHealingCacheService, ExperimentRunnerService]
        : [SelfHealingCacheService],
    };
  }

  /**
   * Register SelfHealingCacheModule asynchronously
   * Useful for injecting ConfigService or other async providers
   *
   * @example
   * ```typescript
   * SelfHealingCacheModule.forRootAsync({
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     redis: {
   *       host: config.get('REDIS_HOST'),
   *       port: config.get('REDIS_PORT'),
   *     },
   *     enableML: config.get('ENABLE_ML') === 'true',
   *   }),
   * })
   * ```
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<SelfHealingCacheModuleOptions> | SelfHealingCacheModuleOptions;
    inject?: any[];
  }): DynamicModule {
    const providers: any[] = [
      {
        provide: SELF_HEALING_CACHE_OPTIONS,
        useFactory: async (...args: any[]) => {
          const config = await options.useFactory(...args);
          return {
            maxSize: 10000,
            defaultTTL: 300000,
            healthCheckInterval: 10000,
            predictionThreshold: 0.75,
            enableML: true,
            enableAdaptiveRecovery: true,
            enableExperiments: false,
            ...config,
          };
        },
        inject: options.inject || [],
      },
      SelfHealingCacheService,
    ];

    return {
      module: SelfHealingCacheModule,
      providers,
      exports: [SelfHealingCacheService],
    };
  }
}
