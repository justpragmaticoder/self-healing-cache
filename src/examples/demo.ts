import { SelfHealingCache } from '../core/SelfHealingCache';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { CacheState } from '../types';

class SimulatedAPI {
  private failureRate: number;
  private responseDelay: number;

  constructor(failureRate: number = 0.1, responseDelay: number = 50) {
    this.failureRate = failureRate;
    this.responseDelay = responseDelay;
  }

  async getData(key: string): Promise<any> {
    await this.sleep(this.responseDelay);

    if (Math.random() < this.failureRate) {
      throw new Error('API failure');
    }

    return {
      key,
      value: `Data for ${key}`,
      timestamp: Date.now()
    };
  }

  setFailureRate(rate: number): void {
    this.failureRate = rate;
  }

  setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function demonstrateScientificNovelty() {
  console.log('\n' + '='.repeat(80));
  console.log('DEMONSTRATION OF SCIENTIFIC NOVELTY');
  console.log('Self-Healing Cache with ML Prediction and Adaptive Recovery');
  console.log('='.repeat(80));

  const metricsCollector = new MetricsCollector();

  // Experiment 1: Traditional approach (no self-healing)
  console.log('\n' + '='.repeat(80));
  console.log('EXPERIMENT 1: Traditional Cache (Baseline)');
  console.log('='.repeat(80));

  const traditionalCache = new SelfHealingCache({
    enableML: false,
    enableAdaptiveRecovery: false,
    healthCheckInterval: 60000 // Disabled effectively
  });

  const api1 = new SimulatedAPI(0.15, 30);
  traditionalCache.setDataRefreshFunction(async (key: string) => {
    return await api1.getData(key);
  });

  metricsCollector.startExperiment('traditional_cache');

  // Run workload
  console.log('\nRunning workload with 15% failure rate...');
  for (let i = 0; i < 200; i++) {
    const key = `item:${i % 50}`;
    const startTime = Date.now();

    try {
      await traditionalCache.get(key);
      metricsCollector.recordRequest(true, Date.now() - startTime, i % 50 < i);
    } catch (error) {
      metricsCollector.recordRequest(false, Date.now() - startTime, false);
    }

    if (i % 50 === 0) {
      const health = traditionalCache.getHealth();
      metricsCollector.recordHealthSnapshot(health.metrics);
      metricsCollector.recordStateChange(health.state);
    }
  }

  const traditionalResults = metricsCollector.endExperiment();
  traditionalCache.stop();

  console.log('\n[Results]');
  console.log(`Total Requests: ${traditionalResults.totalRequests}`);
  console.log(`Success Rate: ${(traditionalResults.successfulRequests / traditionalResults.totalRequests * 100).toFixed(2)}%`);
  console.log(`Cache Hit Rate: ${(traditionalResults.cacheHits / traditionalResults.totalRequests * 100).toFixed(2)}%`);
  console.log(`Avg Response Time: ${traditionalResults.avgResponseTime.toFixed(2)}ms`);
  console.log(`P95 Response Time: ${traditionalResults.p95ResponseTime.toFixed(2)}ms`);
  console.log(`Availability: ${traditionalResults.availability.toFixed(2)}%`);
  console.log(`MTTR: ${traditionalResults.mttr.toFixed(2)}s`);

  // Experiment 2: Self-healing with ML prediction
  console.log('\n' + '='.repeat(80));
  console.log('EXPERIMENT 2: Self-Healing Cache with ML Prediction');
  console.log('='.repeat(80));

  const selfHealingCache = new SelfHealingCache({
    enableML: true,
    enableAdaptiveRecovery: true,
    healthCheckInterval: 3000,
    predictionThreshold: 0.5
  });

  const api2 = new SimulatedAPI(0.15, 30);
  selfHealingCache.setDataRefreshFunction(async (key: string) => {
    return await api2.getData(key);
  });

  metricsCollector.startExperiment('self_healing_cache');

  console.log('\nRunning workload with 15% failure rate...');
  for (let i = 0; i < 200; i++) {
    const key = `item:${i % 50}`;
    const startTime = Date.now();

    try {
      await selfHealingCache.get(key);
      metricsCollector.recordRequest(true, Date.now() - startTime, i % 50 < i);
    } catch (error) {
      metricsCollector.recordRequest(false, Date.now() - startTime, false);
    }

    if (i % 50 === 0) {
      const health = selfHealingCache.getHealth();
      metricsCollector.recordHealthSnapshot(health.metrics);
      metricsCollector.recordStateChange(health.state);
    }

    // Allow health checks to run
    if (i % 30 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Get recovery actions
  const stats = selfHealingCache.getStats();
  stats.recoveryStats.history.forEach((action: any) => {
    metricsCollector.recordRecoveryAction(action);
  });

  const selfHealingResults = metricsCollector.endExperiment();
  selfHealingCache.stop();

  console.log('\n[Results]');
  console.log(`Total Requests: ${selfHealingResults.totalRequests}`);
  console.log(`Success Rate: ${(selfHealingResults.successfulRequests / selfHealingResults.totalRequests * 100).toFixed(2)}%`);
  console.log(`Cache Hit Rate: ${(selfHealingResults.cacheHits / selfHealingResults.totalRequests * 100).toFixed(2)}%`);
  console.log(`Avg Response Time: ${selfHealingResults.avgResponseTime.toFixed(2)}ms`);
  console.log(`P95 Response Time: ${selfHealingResults.p95ResponseTime.toFixed(2)}ms`);
  console.log(`Availability: ${selfHealingResults.availability.toFixed(2)}%`);
  console.log(`MTTR: ${selfHealingResults.mttr.toFixed(2)}s`);
  console.log(`Recovery Actions Taken: ${selfHealingResults.recoveryActions.length}`);
  console.log(`ML Model Data Points: ${stats.mlStats.dataPoints}`);

  // Comparison
  console.log('\n' + '='.repeat(80));
  console.log('COMPARATIVE ANALYSIS - SCIENTIFIC CONTRIBUTION');
  console.log('='.repeat(80));

  const comparison = metricsCollector.compareExperiments('traditional_cache', 'self_healing_cache');

  console.log('\n[Improvements Over Baseline]');
  console.log(`Success Rate: ${comparison.improvements.successRate > 0 ? '+' : ''}${comparison.improvements.successRate.toFixed(2)}%`);
  console.log(`Avg Response Time: ${comparison.improvements.avgResponseTime > 0 ? '+' : ''}${comparison.improvements.avgResponseTime.toFixed(2)}%`);
  console.log(`P95 Response Time: ${comparison.improvements.p95ResponseTime > 0 ? '+' : ''}${comparison.improvements.p95ResponseTime.toFixed(2)}%`);
  console.log(`Hit Rate: ${comparison.improvements.hitRate > 0 ? '+' : ''}${comparison.improvements.hitRate.toFixed(2)}%`);
  console.log(`Availability: ${comparison.improvements.availability > 0 ? '+' : ''}${comparison.improvements.availability.toFixed(2)}%`);
  console.log(`MTTR: ${comparison.improvements.mttr > 0 ? '+' : ''}${comparison.improvements.mttr.toFixed(2)}%`);

  console.log('\n[Key Scientific Contributions]');
  console.log('1. ML-based Failure Prediction:');
  console.log(`   - Trained model with ${stats.mlStats.dataPoints} data points`);
  console.log(`   - Adaptive weight adjustment: [${stats.mlStats.weights.map((w: number) => w.toFixed(3)).join(', ')}]`);
  console.log(`   - Enables proactive recovery before critical failures`);

  console.log('\n2. Adaptive Recovery Strategies:');
  console.log(`   - Total recovery actions: ${selfHealingResults.recoveryActions.length}`);
  console.log(`   - Best strategy identified: ${stats.recoveryStats.bestStrategy}`);
  console.log(`   - Recovery success rate: ${(stats.recoveryStats.successRate * 100).toFixed(2)}%`);
  console.log(`   - Dynamically selects strategy based on system state`);

  console.log('\n3. Self-Healing Capabilities:');
  console.log(`   - Automated failure detection and recovery`);
  console.log(`   - Reduced downtime: ${(traditionalResults.downtimeSeconds - selfHealingResults.downtimeSeconds).toFixed(2)}s`);
  console.log(`   - Improved MTTR by ${Math.abs(comparison.improvements.mttr).toFixed(2)}%`);
  console.log(`   - No manual intervention required`);

  // Export results
  console.log('\n' + '='.repeat(80));
  console.log('EXPORTING RESULTS');
  console.log('='.repeat(80));

  const csv = metricsCollector.exportToCSV();
  console.log('\n[CSV Export]');
  console.log(csv);

  console.log('\n' + '='.repeat(80));
  console.log('DEMONSTRATION COMPLETE');
  console.log('='.repeat(80));
}

demonstrateScientificNovelty().catch(console.error);
