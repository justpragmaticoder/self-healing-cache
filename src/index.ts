// Main exports
export { SelfHealingCache } from './core/SelfHealingCache';
export { CacheStorage } from './core/CacheStorage';
export { HealthMonitor } from './core/HealthMonitor';

// ML components
export { FailurePredictor } from './ml/FailurePredictor';

// Recovery components
export { RecoveryManager, DataRefreshFunction } from './recovery/RecoveryManager';


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
