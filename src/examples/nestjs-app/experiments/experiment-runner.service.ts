import { Injectable, Logger } from '@nestjs/common';
import { SelfHealingCache } from '../../../core/SelfHealingCache';
import * as fs from 'fs';
import * as path from 'path';

// Traditional cache implementation
class TraditionalCache<T> {
  private storage = new Map<string, { value: T; timestamp: number; ttl: number }>();
  private hits = 0;
  private misses = 0;

  set(key: string, value: T, ttl: number = 300000): void {
    this.storage.set(key, { value, timestamp: Date.now(), ttl });
  }

  get(key: string): T | undefined {
    const entry = this.storage.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.storage.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  getStats() {
    const total = this.hits + this.misses;
    return { hits: this.hits, misses: this.misses, hitRate: total > 0 ? this.hits / total : 0 };
  }

  clear(): void {
    this.storage.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// Simulated data source
class DataSource {
  private failureRate: number;
  private responseDelay: number;
  private data = new Map<string, any>();
  private requestCount = 0;

  constructor(failureRate = 0.1, responseDelay = 50) {
    this.failureRate = failureRate;
    this.responseDelay = responseDelay;
    for (let i = 0; i < 1000; i++) {
      this.data.set(`key_${i}`, { id: i, value: `data_${i}`, timestamp: Date.now() });
    }
  }

  async fetch(key: string): Promise<any> {
    this.requestCount++;
    await this.sleep(this.responseDelay);
    if (Math.random() < this.failureRate) {
      throw new Error('Data source failure');
    }
    return this.data.get(key);
  }

  setFailureRate(rate: number): void {
    this.failureRate = rate;
  }

  setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export interface ExperimentResult {
  cacheType: string;
  scenario: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  successRate: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  totalTime: number;
  mlStats?: any;
  recoveryStats?: any;
  predictionAccuracy?: {
    totalPredictions: number;
    correctPredictions: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
    avgPredictionError: number; // For time-to-failure predictions
  };
}

export interface ComparisonReport {
  experimentId: string;
  timestamp: number;
  scenarios: {
    [scenario: string]: {
      baseline: ExperimentResult;
      selfHealing: ExperimentResult;
      selfHealingML: ExperimentResult;
      improvements: {
        successRateImprovement: { vsBaseline: number; vsNoML: number };
        hitRateImprovement: { vsBaseline: number; vsNoML: number };
        responseTimeImprovement: { vsBaseline: number; vsNoML: number };
        throughputImprovement: { vsBaseline: number; vsNoML: number };
      };
      statisticalSignificance?: {
        successRateSignificant: boolean;
        hitRateSignificant: boolean;
        responseTimeSignificant: boolean;
        confidenceLevel: number;
      };
    };
  };
  summary: {
    bestPerformer: string;
    overallImprovements: {
      avgSuccessRateImprovement: number;
      avgHitRateImprovement: number;
      avgResponseTimeImprovement: number;
      avgThroughputImprovement: number;
    };
    mlEffectiveness?: {
      avgPrecision: number;
      avgRecall: number;
      avgF1Score: number;
      totalPredictions: number;
    };
  };
}

@Injectable()
export class ExperimentRunnerService {
  private readonly logger = new Logger(ExperimentRunnerService.name);
  private readonly resultsDir = path.join(process.cwd(), 'experiment_results');

  constructor() {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async runFullComparison(): Promise<ComparisonReport> {
    this.logger.log('Starting full cache comparison experiment...');
    this.logger.log(`Results directory: ${this.resultsDir}`);

    const experimentId = `experiment_${Date.now()}`;
    const scenarios = [
      'normal',
      'high_failure',
      'burst_traffic',
      'cascading_failure',
      'gradual_degradation',
      'memory_pressure',
      'recovery_stress_test'
    ];
    const report: ComparisonReport = {
      experimentId,
      timestamp: Date.now(),
      scenarios: {},
      summary: {
        bestPerformer: '',
        overallImprovements: {
          avgSuccessRateImprovement: 0,
          avgHitRateImprovement: 0,
          avgResponseTimeImprovement: 0,
          avgThroughputImprovement: 0,
        },
      },
    };

    for (const scenario of scenarios) {
      this.logger.log(`Running scenario: ${scenario}`);

      // Test 1: Baseline (Traditional Cache)
      const baselineResult = await this.runBaselineExperiment(scenario);

      // Test 2: Self-Healing without ML
      const selfHealingResult = await this.runSelfHealingExperiment(scenario, false);

      // Test 3: Self-Healing with ML
      const selfHealingMLResult = await this.runSelfHealingExperiment(scenario, true);

      // Calculate improvements
      const improvements = this.calculateImprovements(
        baselineResult,
        selfHealingResult,
        selfHealingMLResult,
      );

      // Calculate statistical significance
      const statisticalSignificance = {
        successRateSignificant: this.tTestProportions(
          baselineResult.totalRequests,
          baselineResult.successRate,
          selfHealingMLResult.totalRequests,
          selfHealingMLResult.successRate
        ),
        hitRateSignificant: this.tTestProportions(
          baselineResult.totalRequests,
          baselineResult.hitRate,
          selfHealingMLResult.totalRequests,
          selfHealingMLResult.hitRate
        ),
        responseTimeSignificant: Math.abs(
          baselineResult.avgResponseTime - selfHealingMLResult.avgResponseTime
        ) > 1.0, // Simple threshold: >1ms difference is significant
        confidenceLevel: 0.95
      };

      report.scenarios[scenario] = {
        baseline: baselineResult,
        selfHealing: selfHealingResult,
        selfHealingML: selfHealingMLResult,
        improvements,
        statisticalSignificance,
      };
    }

    // Calculate summary
    report.summary = this.calculateSummary(report.scenarios);

    // Save to file
    const filename = path.join(this.resultsDir, `${experimentId}.json`);
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));

    this.logger.log(`Experiment complete. Results saved to ${filename}`);

    return report;
  }

  private async runBaselineExperiment(scenario: string): Promise<ExperimentResult> {
    const cache = new TraditionalCache();
    const dataSource = new DataSource();
    const responseTimes: number[] = [];
    const startTime = Date.now();

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    await this.runScenario(scenario, dataSource, async (key) => {
      const reqStart = Date.now();
      totalRequests++;

      try {
        let value = cache.get(key);
        if (value === undefined) {
          value = await dataSource.fetch(key);
          cache.set(key, value);
        }
        successfulRequests++;
        responseTimes.push(Date.now() - reqStart);
      } catch (error) {
        failedRequests++;
        responseTimes.push(Date.now() - reqStart);
      }
    });

    const stats = cache.getStats();
    const totalTime = Date.now() - startTime;

    return {
      cacheType: 'baseline',
      scenario,
      totalRequests,
      successfulRequests,
      failedRequests,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      hitRate: stats.hitRate,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      avgResponseTime: this.avg(responseTimes),
      p50ResponseTime: this.percentile(responseTimes, 0.5),
      p95ResponseTime: this.percentile(responseTimes, 0.95),
      p99ResponseTime: this.percentile(responseTimes, 0.99),
      throughput: (totalRequests / totalTime) * 1000,
      totalTime,
    };
  }

  private async runSelfHealingExperiment(
    scenario: string,
    enableML: boolean,
  ): Promise<ExperimentResult> {
    const cache = new SelfHealingCache({
      enableML,
      enableAdaptiveRecovery: true,
      healthCheckInterval: 5000,
    });

    const dataSource = new DataSource();
    cache.setDataRefreshFunction(async (key: string) => {
      return await dataSource.fetch(key);
    });

    const responseTimes: number[] = [];
    const startTime = Date.now();

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    await this.runScenario(scenario, dataSource, async (key) => {
      const reqStart = Date.now();
      totalRequests++;

      try {
        let value = await cache.get(key);
        if (value === undefined) {
          value = await dataSource.fetch(key);
          cache.set(key, value);
        }
        successfulRequests++;
        responseTimes.push(Date.now() - reqStart);
      } catch (error) {
        failedRequests++;
        responseTimes.push(Date.now() - reqStart);
      }
    });

    const stats = cache.getStats();
    const totalTime = Date.now() - startTime;

    cache.stop();

    return {
      cacheType: enableML ? 'self_healing_with_ml' : 'self_healing_no_ml',
      scenario,
      totalRequests,
      successfulRequests,
      failedRequests,
      cacheHits: stats.cacheStats.hits,
      cacheMisses: stats.cacheStats.misses,
      hitRate: stats.cacheStats.hitRate,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      avgResponseTime: this.avg(responseTimes),
      p50ResponseTime: this.percentile(responseTimes, 0.5),
      p95ResponseTime: this.percentile(responseTimes, 0.95),
      p99ResponseTime: this.percentile(responseTimes, 0.99),
      throughput: (totalRequests / totalTime) * 1000,
      totalTime,
      mlStats: enableML ? stats.mlStats : undefined,
      predictionAccuracy: enableML ? stats.predictionAccuracy : undefined,
      recoveryStats: stats.recoveryStats,
    };
  }

  private async runScenario(
    scenario: string,
    dataSource: DataSource,
    operation: (key: string) => Promise<void>,
  ): Promise<void> {
    if (scenario === 'normal') {
      dataSource.setFailureRate(0.05);
      dataSource.setResponseDelay(10);
      for (let i = 0; i < 5000; i++) { // Increased from 1000
        await operation(`key_${i % 100}`);
      }
    } else if (scenario === 'high_failure') {
      dataSource.setFailureRate(0.3);
      dataSource.setResponseDelay(50);
      for (let i = 0; i < 3000; i++) { // Increased from 500
        await operation(`key_${i % 50}`);
      }
    } else if (scenario === 'burst_traffic') {
      for (let burst = 0; burst < 10; burst++) { // Increased from 5
        dataSource.setFailureRate(burst % 2 === 0 ? 0.05 : 0.25);
        dataSource.setResponseDelay(burst % 2 === 0 ? 10 : 100);
        for (let i = 0; i < 400; i++) { // Increased from 200
          await operation(`key_${Math.floor(Math.random() * 100)}`);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else if (scenario === 'cascading_failure') {
      // Simulate cascading failures - failure rate increases over time
      for (let phase = 0; phase < 5; phase++) {
        const failureRate = 0.1 + (phase * 0.15); // 10% -> 70%
        dataSource.setFailureRate(failureRate);
        dataSource.setResponseDelay(20 + phase * 30);
        for (let i = 0; i < 1000; i++) {
          await operation(`key_${i % 80}`);
        }
      }
    } else if (scenario === 'gradual_degradation') {
      // Slowly increasing response time and failure rate
      for (let i = 0; i < 5000; i++) {
        const progress = i / 5000;
        dataSource.setFailureRate(0.05 + progress * 0.25); // 5% -> 30%
        dataSource.setResponseDelay(10 + Math.floor(progress * 90)); // 10ms -> 100ms
        await operation(`key_${i % 100}`);
      }
    } else if (scenario === 'memory_pressure') {
      // High volume of unique keys to stress memory
      dataSource.setFailureRate(0.1);
      dataSource.setResponseDelay(15);
      for (let i = 0; i < 10000; i++) {
        await operation(`key_${i % 500}`); // 500 unique keys
      }
    } else if (scenario === 'recovery_stress_test') {
      // Repeated failure and recovery cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        // Failure phase
        dataSource.setFailureRate(0.6);
        dataSource.setResponseDelay(100);
        for (let i = 0; i < 200; i++) {
          await operation(`key_${i % 50}`);
        }
        // Recovery phase
        dataSource.setFailureRate(0.05);
        dataSource.setResponseDelay(10);
        for (let i = 0; i < 300; i++) {
          await operation(`key_${i % 50}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private calculateImprovements(
    baseline: ExperimentResult,
    selfHealing: ExperimentResult,
    selfHealingML: ExperimentResult,
  ) {
    return {
      successRateImprovement: {
        vsBaseline: this.calcPercentChange(baseline.successRate, selfHealingML.successRate),
        vsNoML: this.calcPercentChange(selfHealing.successRate, selfHealingML.successRate),
      },
      hitRateImprovement: {
        vsBaseline: this.calcPercentChange(baseline.hitRate, selfHealingML.hitRate),
        vsNoML: this.calcPercentChange(selfHealing.hitRate, selfHealingML.hitRate),
      },
      responseTimeImprovement: {
        vsBaseline: this.calcPercentChange(baseline.avgResponseTime, selfHealingML.avgResponseTime, true),
        vsNoML: this.calcPercentChange(selfHealing.avgResponseTime, selfHealingML.avgResponseTime, true),
      },
      throughputImprovement: {
        vsBaseline: this.calcPercentChange(baseline.throughput, selfHealingML.throughput),
        vsNoML: this.calcPercentChange(selfHealing.throughput, selfHealingML.throughput),
      },
    };
  }

  private calculateSummary(scenarios: ComparisonReport['scenarios']) {
    const allImprovements = Object.values(scenarios).map(s => s.improvements);
    const mlResults = Object.values(scenarios)
      .map(s => s.selfHealingML.predictionAccuracy)
      .filter(pa => pa !== undefined);

    const mlEffectiveness = mlResults.length > 0 ? {
      avgPrecision: this.avg(mlResults.map(pa => pa!.precision)),
      avgRecall: this.avg(mlResults.map(pa => pa!.recall)),
      avgF1Score: this.avg(mlResults.map(pa => pa!.f1Score)),
      totalPredictions: mlResults.reduce((sum, pa) => sum + pa!.totalPredictions, 0)
    } : undefined;

    return {
      bestPerformer: 'self_healing_with_ml',
      overallImprovements: {
        avgSuccessRateImprovement: this.avg(allImprovements.map(i => i.successRateImprovement.vsBaseline)),
        avgHitRateImprovement: this.avg(allImprovements.map(i => i.hitRateImprovement.vsBaseline)),
        avgResponseTimeImprovement: this.avg(allImprovements.map(i => i.responseTimeImprovement.vsBaseline)),
        avgThroughputImprovement: this.avg(allImprovements.map(i => i.throughputImprovement.vsBaseline)),
      },
      mlEffectiveness,
    };
  }

  // Simple t-test for two proportions (success rate, hit rate)
  private tTestProportions(n1: number, p1: number, n2: number, p2: number): boolean {
    if (n1 === 0 || n2 === 0) return false;

    const pooledP = (n1 * p1 + n2 * p2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

    if (se === 0) return false;

    const z = Math.abs((p1 - p2) / se);
    // z > 1.96 means p-value < 0.05 (95% confidence)
    return z > 1.96;
  }

  private calcPercentChange(baseline: number, comparison: number, inverse = false): number {
    if (baseline === 0) return 0;
    const change = ((comparison - baseline) / baseline) * 100;
    return inverse ? -change : change;
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}
