import { RecoveryStrategy, RecoveryAction, HealthMetrics } from '../types';

export type DataRefreshFunction<T> = (key: string) => Promise<T>;

export class RecoveryManager<T = any> {
  private recoveryHistory: RecoveryAction[] = [];
  private circuitBreakerOpen = false;
  private circuitBreakerOpenTime = 0;
  private readonly circuitBreakerTimeout = 30000; // 30 seconds
  private activeRecoveries = new Set<string>();

  async executeRecovery(
    strategy: RecoveryStrategy,
    keys: string[],
    refreshFunction: DataRefreshFunction<T>,
    metricsBeforeRecovery: HealthMetrics
  ): Promise<RecoveryAction> {
    const startTime = Date.now();

    try {
      switch (strategy) {
        case RecoveryStrategy.IMMEDIATE_REFRESH:
          await this.immediateRefresh(keys, refreshFunction);
          break;

        case RecoveryStrategy.GRADUAL_REFRESH:
          await this.gradualRefresh(keys, refreshFunction);
          break;

        case RecoveryStrategy.CIRCUIT_BREAKER:
          await this.circuitBreakerRecovery(keys, refreshFunction);
          break;

        case RecoveryStrategy.FALLBACK:
          await this.fallbackRecovery(keys);
          break;

        case RecoveryStrategy.ADAPTIVE:
          await this.adaptiveRecovery(keys, refreshFunction, metricsBeforeRecovery);
          break;

        default:
          throw new Error(`Unknown recovery strategy: ${strategy}`);
      }

      const action: RecoveryAction = {
        strategy,
        timestamp: Date.now(),
        success: true,
        duration: Date.now() - startTime,
        metricsBeforeRecovery,
        metricsAfterRecovery: metricsBeforeRecovery // Will be updated by caller
      };

      this.recoveryHistory.push(action);
      return action;

    } catch (error) {
      const action: RecoveryAction = {
        strategy,
        timestamp: Date.now(),
        success: false,
        duration: Date.now() - startTime,
        metricsBeforeRecovery,
        metricsAfterRecovery: metricsBeforeRecovery
      };

      this.recoveryHistory.push(action);
      throw error;
    }
  }

  private async immediateRefresh(keys: string[], refreshFunction: DataRefreshFunction<T>): Promise<void> {
    // Refresh all keys in parallel
    const promises = keys.map(key =>
      this.refreshWithTracking(key, refreshFunction)
    );

    await Promise.allSettled(promises);
  }

  private async gradualRefresh(keys: string[], refreshFunction: DataRefreshFunction<T>): Promise<void> {
    // Refresh keys in batches to avoid overwhelming the system
    const batchSize = Math.max(1, Math.floor(keys.length / 10));

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const promises = batch.map(key =>
        this.refreshWithTracking(key, refreshFunction)
      );

      await Promise.allSettled(promises);

      // Small delay between batches
      if (i + batchSize < keys.length) {
        await this.sleep(100);
      }
    }
  }

  private async circuitBreakerRecovery(keys: string[], refreshFunction: DataRefreshFunction<T>): Promise<void> {
    // Open circuit breaker - stop all requests temporarily
    this.circuitBreakerOpen = true;
    this.circuitBreakerOpenTime = Date.now();

    // Wait for system to stabilize
    await this.sleep(5000);

    // Try to refresh a small sample first
    const sampleSize = Math.min(5, keys.length);
    const sample = keys.slice(0, sampleSize);

    try {
      await Promise.all(sample.map(key => this.refreshWithTracking(key, refreshFunction)));

      // If successful, gradually refresh the rest
      this.circuitBreakerOpen = false;
      await this.gradualRefresh(keys.slice(sampleSize), refreshFunction);

    } catch (error) {
      // Keep circuit breaker open longer
      this.circuitBreakerOpenTime = Date.now();
      throw error;
    }
  }

  private async fallbackRecovery(keys: string[]): Promise<void> {
    // Fallback strategy - mark keys for lazy refresh
    // They will be refreshed on next access
    keys.forEach(key => {
      this.activeRecoveries.delete(key);
    });
  }

  private async adaptiveRecovery(
    keys: string[],
    refreshFunction: DataRefreshFunction<T>,
    metrics: HealthMetrics
  ): Promise<void> {
    // Choose strategy based on current system state
    if (metrics.errorRate > 0.3) {
      // High error rate - use circuit breaker
      await this.circuitBreakerRecovery(keys, refreshFunction);
    } else if (metrics.avgResponseTime > 1000) {
      // Slow response - use gradual refresh
      await this.gradualRefresh(keys, refreshFunction);
    } else if (metrics.hitRate < 0.5) {
      // Low hit rate - immediate refresh might help
      await this.immediateRefresh(keys, refreshFunction);
    } else {
      // System is relatively healthy - use fallback
      await this.fallbackRecovery(keys);
    }
  }

  private async refreshWithTracking(key: string, refreshFunction: DataRefreshFunction<T>): Promise<void> {
    if (this.activeRecoveries.has(key)) {
      return; // Already being recovered
    }

    this.activeRecoveries.add(key);

    try {
      await refreshFunction(key);
    } finally {
      this.activeRecoveries.delete(key);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpen) return false;

    // Auto-reset circuit breaker after timeout
    if (Date.now() - this.circuitBreakerOpenTime > this.circuitBreakerTimeout) {
      this.circuitBreakerOpen = false;
      return false;
    }

    return true;
  }

  getRecoveryHistory(): RecoveryAction[] {
    return [...this.recoveryHistory];
  }

  getSuccessRate(): number {
    if (this.recoveryHistory.length === 0) return 1.0;

    const successful = this.recoveryHistory.filter(a => a.success).length;
    return successful / this.recoveryHistory.length;
  }

  getBestStrategy(): RecoveryStrategy {
    if (this.recoveryHistory.length < 10) {
      return RecoveryStrategy.ADAPTIVE;
    }

    // Calculate success rate by strategy
    const strategyStats = new Map<RecoveryStrategy, { success: number; total: number }>();

    for (const action of this.recoveryHistory) {
      const stats = strategyStats.get(action.strategy) || { success: 0, total: 0 };
      stats.total++;
      if (action.success) stats.success++;
      strategyStats.set(action.strategy, stats);
    }

    let bestStrategy = RecoveryStrategy.ADAPTIVE;
    let bestRate = 0;

    for (const [strategy, stats] of strategyStats.entries()) {
      const rate = stats.success / stats.total;
      if (rate > bestRate) {
        bestRate = rate;
        bestStrategy = strategy;
      }
    }

    return bestStrategy;
  }

  reset(): void {
    this.recoveryHistory = [];
    this.circuitBreakerOpen = false;
    this.activeRecoveries.clear();
  }
}
