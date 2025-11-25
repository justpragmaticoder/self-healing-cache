/**
 * Self-Healing Cache Module - Main Exports
 *
 * This is a self-contained, production-ready cache module for NestJS applications.
 * Simply copy this entire folder into your NestJS project and import the module.
 */

// NestJS Module
export { SelfHealingCacheModule, SelfHealingCacheModuleOptions, RedisConfig, MySQLConfig } from './self-healing-cache.module';
export { SelfHealingCacheService } from './self-healing-cache.service';
export { ExperimentRunnerService } from './experiments/experiment-runner.service';

// Core Components
export { SelfHealingCache } from './core/SelfHealingCache';
export { CacheStorage } from './core/CacheStorage';
export { HealthMonitor } from './core/HealthMonitor';
export { SimpleCache } from './core/SimpleCache';

// ML Components
export { FailurePredictor } from './ml/FailurePredictor';

// Recovery Components
export { RecoveryManager, DataRefreshFunction } from './recovery/RecoveryManager';

// Storage Adapters
export { StorageAdapter } from './adapters/StorageAdapter';
export { RedisAdapter } from './adapters/RedisAdapter';
export { MySQLMetricsAdapter } from './adapters/MySQLMetricsAdapter';
export { InMemoryAdapter } from './adapters/InMemoryAdapter';

// Types
export {
  CacheEntry,
  HealthMetrics,
  FailurePrediction,
  RecoveryStrategy,
  CacheState,
  CacheConfig,
  RecoveryAction,
  ExperimentMetrics
} from './types';

// Constants
export { SELF_HEALING_CACHE_OPTIONS } from './constants';

