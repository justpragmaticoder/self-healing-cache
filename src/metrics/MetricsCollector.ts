import { HealthMetrics, RecoveryAction, CacheState } from '../types';

export interface ExperimentMetrics {
  experimentName: string;
  startTime: number;
  endTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheMisses: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  healthMetricsHistory: HealthMetrics[];
  recoveryActions: RecoveryAction[];
  downtimeSeconds: number;
  mtbf: number; // Mean Time Between Failures
  mttr: number; // Mean Time To Recovery
  availability: number;
}

export class MetricsCollector {
  private experiments = new Map<string, ExperimentMetrics>();
  private currentExperiment?: string;
  private startTime = 0;
  private responseTimes: number[] = [];
  private healthSnapshots: HealthMetrics[] = [];
  private recoveryActions: RecoveryAction[] = [];
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private failureTimes: number[] = [];
  private recoveryTimes: number[] = [];
  private downtimeStart: number | null = null;
  private totalDowntime = 0;

  startExperiment(name: string): void {
    this.currentExperiment = name;
    this.startTime = Date.now();
    this.responseTimes = [];
    this.healthSnapshots = [];
    this.recoveryActions = [];
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.failureTimes = [];
    this.recoveryTimes = [];
    this.downtimeStart = null;
    this.totalDowntime = 0;
  }

  recordRequest(success: boolean, responseTime: number, wasHit: boolean): void {
    this.totalRequests++;
    this.responseTimes.push(responseTime);

    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
      this.failureTimes.push(Date.now());
    }

    if (wasHit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  recordHealthSnapshot(metrics: HealthMetrics): void {
    this.healthSnapshots.push(metrics);
  }

  recordRecoveryAction(action: RecoveryAction): void {
    this.recoveryActions.push(action);
    this.recoveryTimes.push(action.duration);

    if (this.downtimeStart) {
      this.totalDowntime += Date.now() - this.downtimeStart;
      this.downtimeStart = null;
    }
  }

  recordStateChange(newState: CacheState): void {
    if (newState === CacheState.CRITICAL && !this.downtimeStart) {
      this.downtimeStart = Date.now();
    } else if (newState === CacheState.HEALTHY && this.downtimeStart) {
      this.totalDowntime += Date.now() - this.downtimeStart;
      this.downtimeStart = null;
    }
  }

  endExperiment(): ExperimentMetrics {
    if (!this.currentExperiment) {
      throw new Error('No active experiment');
    }

    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Calculate MTBF (Mean Time Between Failures)
    let mtbf = 0;
    if (this.failureTimes.length > 1) {
      const intervals = [];
      for (let i = 1; i < this.failureTimes.length; i++) {
        intervals.push(this.failureTimes[i] - this.failureTimes[i - 1]);
      }
      mtbf = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }

    // Calculate MTTR (Mean Time To Recovery)
    const mttr = this.recoveryTimes.length > 0
      ? this.recoveryTimes.reduce((a, b) => a + b, 0) / this.recoveryTimes.length
      : 0;

    // Calculate availability
    const availability = duration > 0
      ? ((duration - this.totalDowntime) / duration) * 100
      : 100;

    const metrics: ExperimentMetrics = {
      experimentName: this.currentExperiment,
      startTime: this.startTime,
      endTime,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      avgResponseTime: this.calculateAverage(this.responseTimes),
      p50ResponseTime: this.calculatePercentile(this.responseTimes, 0.5),
      p95ResponseTime: this.calculatePercentile(this.responseTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(this.responseTimes, 0.99),
      healthMetricsHistory: [...this.healthSnapshots],
      recoveryActions: [...this.recoveryActions],
      downtimeSeconds: this.totalDowntime / 1000,
      mtbf: mtbf / 1000, // Convert to seconds
      mttr: mttr / 1000, // Convert to seconds
      availability
    };

    this.experiments.set(this.currentExperiment, metrics);
    this.currentExperiment = undefined;

    return metrics;
  }

  getExperiment(name: string): ExperimentMetrics | undefined {
    return this.experiments.get(name);
  }

  getAllExperiments(): ExperimentMetrics[] {
    return Array.from(this.experiments.values());
  }

  compareExperiments(baseline: string, comparison: string): any {
    const baselineMetrics = this.experiments.get(baseline);
    const comparisonMetrics = this.experiments.get(comparison);

    if (!baselineMetrics || !comparisonMetrics) {
      throw new Error('Both experiments must exist');
    }

    return {
      baseline: baseline,
      comparison: comparison,
      improvements: {
        successRate: this.calculateImprovement(
          baselineMetrics.successfulRequests / baselineMetrics.totalRequests,
          comparisonMetrics.successfulRequests / comparisonMetrics.totalRequests
        ),
        avgResponseTime: this.calculateImprovement(
          comparisonMetrics.avgResponseTime,
          baselineMetrics.avgResponseTime // Inverted: lower is better
        ),
        p95ResponseTime: this.calculateImprovement(
          comparisonMetrics.p95ResponseTime,
          baselineMetrics.p95ResponseTime // Inverted: lower is better
        ),
        hitRate: this.calculateImprovement(
          baselineMetrics.cacheHits / baselineMetrics.totalRequests,
          comparisonMetrics.cacheHits / comparisonMetrics.totalRequests
        ),
        availability: this.calculateImprovement(
          baselineMetrics.availability,
          comparisonMetrics.availability
        ),
        mttr: this.calculateImprovement(
          comparisonMetrics.mttr,
          baselineMetrics.mttr // Inverted: lower is better
        )
      },
      baselineMetrics,
      comparisonMetrics
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculatePercentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateImprovement(baseline: number, comparison: number): number {
    if (baseline === 0) return 0;
    return ((comparison - baseline) / baseline) * 100;
  }

  exportToJSON(): string {
    const data = {
      experiments: Array.from(this.experiments.entries()).map(([name, metrics]) => ({
        name,
        ...metrics
      }))
    };
    return JSON.stringify(data, null, 2);
  }

  exportToCSV(): string {
    const headers = [
      'Experiment',
      'Total Requests',
      'Success Rate %',
      'Hit Rate %',
      'Avg Response Time (ms)',
      'P95 Response Time (ms)',
      'P99 Response Time (ms)',
      'Availability %',
      'MTBF (s)',
      'MTTR (s)',
      'Recovery Actions'
    ];

    const rows = Array.from(this.experiments.values()).map(m => [
      m.experimentName,
      m.totalRequests.toString(),
      ((m.successfulRequests / m.totalRequests) * 100).toFixed(2),
      ((m.cacheHits / m.totalRequests) * 100).toFixed(2),
      m.avgResponseTime.toFixed(2),
      m.p95ResponseTime.toFixed(2),
      m.p99ResponseTime.toFixed(2),
      m.availability.toFixed(2),
      m.mtbf.toFixed(2),
      m.mttr.toFixed(2),
      m.recoveryActions.length.toString()
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  reset(): void {
    this.experiments.clear();
    this.currentExperiment = undefined;
  }
}
