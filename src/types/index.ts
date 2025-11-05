export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessTime: number;
  ttl?: number;
}

export interface HealthMetrics {
  timestamp: number;
  hitRate: number;
  missRate: number;
  errorRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  failureCount: number;
}

export interface FailurePrediction {
  probability: number;
  estimatedTimeToFailure: number;
  confidence: number;
  recommendedAction: RecoveryStrategy;
}

export enum RecoveryStrategy {
  IMMEDIATE_REFRESH = 'immediate_refresh',
  GRADUAL_REFRESH = 'gradual_refresh',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FALLBACK = 'fallback',
  ADAPTIVE = 'adaptive'
}

export enum CacheState {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
  RECOVERING = 'recovering'
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  healthCheckInterval: number;
  predictionThreshold: number;
  enableML: boolean;
  enableAdaptiveRecovery: boolean;
  storageAdapter?: any; // StorageAdapter interface
}

export interface RecoveryAction {
  strategy: RecoveryStrategy;
  timestamp: number;
  success: boolean;
  duration: number;
  metricsBeforeRecovery: HealthMetrics;
  metricsAfterRecovery: HealthMetrics;
}
