// Main exports
export { SelfHealingCache } from './core/SelfHealingCache';
export { CacheStorage } from './core/CacheStorage';
export { HealthMonitor } from './core/HealthMonitor';

// ML components
export { FailurePredictor } from './ml/FailurePredictor';

// Recovery components
export { RecoveryManager, DataRefreshFunction } from './recovery/RecoveryManager';

// Metrics
export { MetricsCollector, ExperimentMetrics } from './metrics/MetricsCollector';

// Types
export {
  CacheEntry,
  HealthMetrics,
  FailurePrediction,
  RecoveryStrategy,
  CacheState,
  CacheConfig,
  RecoveryAction
} from './types';
