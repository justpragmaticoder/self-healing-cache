import { CacheStorage } from './CacheStorage';
import { HealthMonitor } from './HealthMonitor';
import { FailurePredictor } from '../ml/FailurePredictor';
import { RecoveryManager, DataRefreshFunction } from '../recovery/RecoveryManager';
import { CacheConfig, CacheState, RecoveryStrategy } from '../types';

export class SelfHealingCache<T = any> {
  private storage: CacheStorage<T> | any; // Can be CacheStorage or external adapter
  private healthMonitor: HealthMonitor;
  private failurePredictor: FailurePredictor;
  private recoveryManager: RecoveryManager<T>;
  private config: CacheConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private dataRefreshFunction?: DataRefreshFunction<T>;
  private useExternalAdapter: boolean = false;
  private requestCounter: number = 0;
  private lastPredictionTime: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 10000,
      defaultTTL: config.defaultTTL || 300000, // 5 minutes
      healthCheckInterval: config.healthCheckInterval || 10000, // 10 seconds
      predictionThreshold: config.predictionThreshold || 0.75, // More conservative: only act on high confidence
      enableML: config.enableML !== false,
      enableAdaptiveRecovery: config.enableAdaptiveRecovery !== false,
      storageAdapter: config.storageAdapter
    };

    // Use external adapter if provided, otherwise use built-in storage
    if (this.config.storageAdapter) {
      this.storage = this.config.storageAdapter;
      this.useExternalAdapter = true;
    } else {
      this.storage = new CacheStorage<T>(this.config.maxSize);
      this.useExternalAdapter = false;
    }

    this.healthMonitor = new HealthMonitor();
    this.failurePredictor = new FailurePredictor();
    this.recoveryManager = new RecoveryManager<T>();

    this.startHealthChecks();
  }

  setDataRefreshFunction(fn: DataRefreshFunction<T>): void {
    this.dataRefreshFunction = fn;
  }

  async get(key: string): Promise<T | undefined> {
    const startTime = Date.now();
    this.requestCounter++;

    // Run ML prediction every 100 requests (to gather enough data for learning)
    if (this.config.enableML && this.requestCounter % 100 === 0) {
      this.runMLPrediction();
    }

    try {
      // Check circuit breaker
      if (this.recoveryManager.isCircuitBreakerOpen()) {
        this.healthMonitor.recordError();
        return undefined;
      }

      // Get from storage (handle both sync and async)
      const value = this.useExternalAdapter
        ? await this.storage.get(key)
        : this.storage.get(key);

      if (value !== undefined) {
        this.healthMonitor.recordHit();
        this.healthMonitor.recordResponseTime(Date.now() - startTime);
        return value;
      }

      this.healthMonitor.recordMiss();

      // SELF-HEALING ADVANTAGE: Retry on failure with exponential backoff
      if (this.dataRefreshFunction) {
        let lastError: any;
        const maxRetries = 2;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const refreshedValue = await this.dataRefreshFunction(key);
            if (refreshedValue !== undefined) {
              await this.set(key, refreshedValue);
              this.healthMonitor.recordResponseTime(Date.now() - startTime);
              return refreshedValue;
            }
            break; // Success
          } catch (error) {
            lastError = error;
            // Retry with backoff only if not last attempt
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 20 * (attempt + 1)));
            }
          }
        }

        // All retries failed - record error once
        if (lastError) {
          this.healthMonitor.recordError();
          this.healthMonitor.recordResponseTime(Date.now() - startTime);
          throw lastError;
        }
      }

      this.healthMonitor.recordResponseTime(Date.now() - startTime);
      return undefined;

    } catch (error) {
      // Don't double-record error (already recorded above)
      this.healthMonitor.recordResponseTime(Date.now() - startTime);
      throw error;
    }
  }

  private runMLPrediction(): void {
    const metrics = this.healthMonitor.getCurrentMetrics();
    const errorTrend = this.healthMonitor.calculateTrend('errorRate');
    const hitRateTrend = this.healthMonitor.calculateTrend('hitRate');
    const responseTimeTrend = this.healthMonitor.calculateTrend('avgResponseTime');
    const failureFrequency = this.healthMonitor.getFailureFrequency();

    const prediction = this.failurePredictor.predict(
      metrics,
      errorTrend,
      hitRateTrend,
      responseTimeTrend,
      failureFrequency
    );

    // Schedule outcome recording after prediction window (shorter for faster experiments)
    // This allows time to see if the predicted failure actually occurs
    setTimeout(() => {
      const futureMetrics = this.healthMonitor.getCurrentMetrics();
      const futureState = this.healthMonitor.getCacheState();

      // Consider it a failure if error rate increased significantly or state degraded
      const errorRateIncreased = futureMetrics.errorRate > metrics.errorRate + 0.05;
      const stateDegraded = futureState === CacheState.CRITICAL || futureState === CacheState.DEGRADED;
      const actualFailure = errorRateIncreased || stateDegraded;

      this.failurePredictor.recordActualOutcome(actualFailure);
    }, 2000); // Reduced from 5000ms to 2000ms for faster feedback

    // Train the model with current features and historical state
    const currentState = this.healthMonitor.getCacheState();
    const isCurrentlyFailing = currentState === CacheState.CRITICAL || currentState === CacheState.DEGRADED;

    // Only train if we have meaningful signal (not in normal/healthy state all the time)
    if (isCurrentlyFailing || errorTrend > 0.01 || metrics.errorRate > 0.05) {
      this.failurePredictor.learn(
        {
          errorRateTrend: errorTrend,
          hitRateTrend: hitRateTrend,
          responseTimeTrend: responseTimeTrend,
          failureFrequency: failureFrequency,
          currentErrorRate: metrics.errorRate,
          memoryPressure: metrics.memoryUsage / 1024
        },
        isCurrentlyFailing
      );
    }
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    if (this.useExternalAdapter) {
      await this.storage.set(key, value, ttl || this.config.defaultTTL);
    } else {
      this.storage.set(key, value, ttl || this.config.defaultTTL);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (this.useExternalAdapter) {
      return await this.storage.delete(key);
    }
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    if (this.useExternalAdapter) {
      await this.storage.clear();
    } else {
      this.storage.clear();
    }
  }

  async triggerSelfHealing(): Promise<void> {
    const metrics = this.healthMonitor.getCurrentMetrics();
    const state = this.healthMonitor.getCacheState();

    // Only trigger healing if system is not healthy
    if (state === CacheState.HEALTHY) {
      return;
    }

    console.log(`[Self-Healing] Cache state: ${state}, triggering recovery...`);

    // Get predictions
    const errorTrend = this.healthMonitor.calculateTrend('errorRate');
    const hitRateTrend = this.healthMonitor.calculateTrend('hitRate');
    const responseTimeTrend = this.healthMonitor.calculateTrend('avgResponseTime');
    const failureFrequency = this.healthMonitor.getFailureFrequency();

    let prediction = null;
    let strategy = RecoveryStrategy.ADAPTIVE;

    if (this.config.enableML) {
      prediction = this.failurePredictor.predict(
        metrics,
        errorTrend,
        hitRateTrend,
        responseTimeTrend,
        failureFrequency
      );

      console.log(`[ML Prediction] Failure probability: ${(prediction.probability * 100).toFixed(2)}%, ` +
                  `Time to failure: ${(prediction.estimatedTimeToFailure / 1000).toFixed(0)}s, ` +
                  `Confidence: ${(prediction.confidence * 100).toFixed(2)}%`);

      // Use ML recommendation if confidence is high enough
      if (prediction.confidence > 0.5 && prediction.probability > this.config.predictionThreshold) {
        strategy = prediction.recommendedAction;
      }
    }

    // Get keys that might need refresh (e.g., most accessed or recently added)
    const entries = this.useExternalAdapter ? [] : this.storage.getAllEntries();
    const keysToRefresh = entries
      .sort((a: any, b: any) => b.accessCount - a.accessCount)
      .slice(0, Math.min(100, entries.length))
      .map((e: any) => e.key);

    if (keysToRefresh.length > 0 && this.dataRefreshFunction) {
      try {
        const recoveryAction = await this.recoveryManager.executeRecovery(
          strategy,
          keysToRefresh,
          this.dataRefreshFunction,
          metrics
        );

        // Update metrics after recovery
        recoveryAction.metricsAfterRecovery = this.healthMonitor.getCurrentMetrics();

        console.log(`[Recovery] Strategy: ${strategy}, Success: ${recoveryAction.success}, ` +
                    `Duration: ${recoveryAction.duration}ms`);

        // Learn from the recovery outcome
        if (this.config.enableML && prediction) {
          const actualFailure = state === CacheState.CRITICAL;
          this.failurePredictor.learn(
            {
              errorRateTrend: errorTrend,
              hitRateTrend: hitRateTrend,
              responseTimeTrend: responseTimeTrend,
              failureFrequency: failureFrequency,
              currentErrorRate: metrics.errorRate,
              memoryPressure: metrics.memoryUsage / 1024
            },
            actualFailure
          );
        }

      } catch (error) {
        console.error('[Recovery] Failed:', error);
      }
    }
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    const metrics = this.healthMonitor.getCurrentMetrics();
    const state = this.healthMonitor.getCacheState();

    // Clean expired entries periodically (only for built-in storage)
    if (!this.useExternalAdapter && typeof this.storage.cleanExpired === 'function') {
      this.storage.cleanExpired();
    }

    // Trigger self-healing if needed
    if (state !== CacheState.HEALTHY && this.config.enableAdaptiveRecovery) {
      await this.triggerSelfHealing();
    }
  }

  getHealth(): { state: CacheState; metrics: any } {
    return {
      state: this.healthMonitor.getCacheState(),
      metrics: this.healthMonitor.getCurrentMetrics()
    };
  }

  getStats(): any {
    const cacheStats = this.healthMonitor.getCacheStats();
    return {
      cacheSize: this.storage.size(),
      health: this.getHealth(),
      cacheStats: {
        hits: cacheStats.cacheHits,
        misses: cacheStats.cacheMisses,
        hitRate: cacheStats.totalRequests > 0
          ? cacheStats.cacheHits / cacheStats.totalRequests
          : 0
      },
      mlStats: this.failurePredictor.getModelStats(),
      predictionAccuracy: this.failurePredictor.getPredictionAccuracy(),
      recoveryStats: {
        successRate: this.recoveryManager.getSuccessRate(),
        bestStrategy: this.recoveryManager.getBestStrategy(),
        history: this.recoveryManager.getRecoveryHistory().slice(-10)
      }
    };
  }

  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }

  reset(): void {
    this.storage.clear();
    this.healthMonitor.reset();
    this.failurePredictor.reset();
    this.recoveryManager.reset();
  }
}
