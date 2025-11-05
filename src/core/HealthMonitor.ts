import { HealthMetrics, CacheState, FailurePrediction, RecoveryStrategy } from '../types';

export class HealthMonitor {
  private metrics: HealthMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private totalRequests = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private errors = 0;
  private responseTimes: number[] = [];
  private failureEvents: number[] = [];

  recordHit(): void {
    this.cacheHits++;
    this.totalRequests++;
  }

  recordMiss(): void {
    this.cacheMisses++;
    this.totalRequests++;
  }

  recordError(): void {
    this.errors++;
    this.failureEvents.push(Date.now());
    // Keep only last 100 failure events
    if (this.failureEvents.length > 100) {
      this.failureEvents.shift();
    }
  }

  recordResponseTime(timeMs: number): void {
    this.responseTimes.push(timeMs);
    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  getCurrentMetrics(): HealthMetrics {
    const hitRate = this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0;
    const missRate = this.totalRequests > 0 ? this.cacheMisses / this.totalRequests : 0;
    const errorRate = this.totalRequests > 0 ? this.errors / this.totalRequests : 0;
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    const metrics: HealthMetrics = {
      timestamp: Date.now(),
      hitRate,
      missRate,
      errorRate,
      avgResponseTime,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      failureCount: this.failureEvents.length
    };

    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    return metrics;
  }

  getCacheState(): CacheState {
    const metrics = this.getCurrentMetrics();

    if (metrics.errorRate > 0.5 || metrics.failureCount > 10) {
      return CacheState.CRITICAL;
    }
    if (metrics.errorRate > 0.2 || metrics.hitRate < 0.5) {
      return CacheState.DEGRADED;
    }
    if (metrics.errorRate > 0.1) {
      return CacheState.RECOVERING;
    }
    return CacheState.HEALTHY;
  }

  getMetricsHistory(): HealthMetrics[] {
    return [...this.metrics];
  }

  reset(): void {
    this.totalRequests = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.errors = 0;
    this.responseTimes = [];
    this.failureEvents = [];
    this.metrics = [];
  }

  // Calculate trend for prediction
  calculateTrend(metric: 'errorRate' | 'hitRate' | 'avgResponseTime'): number {
    if (this.metrics.length < 10) return 0;

    const recentMetrics = this.metrics.slice(-20);
    const values = recentMetrics.map(m => m[metric]);

    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + idx * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  getFailureFrequency(): number {
    if (this.failureEvents.length < 2) return 0;

    const now = Date.now();
    const recentFailures = this.failureEvents.filter(time => now - time < 60000); // Last minute
    return recentFailures.length;
  }

  getCacheStats() {
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      totalRequests: this.totalRequests
    };
  }
}
