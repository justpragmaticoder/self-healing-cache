import { SelfHealingCache } from '../core/SelfHealingCache';

// Traditional cache implementation for comparison
class TraditionalCache<T> {
  private storage = new Map<string, { value: T; timestamp: number; ttl: number }>();
  private hits = 0;
  private misses = 0;
  private errors = 0;

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

  recordError(): void {
    this.errors++;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  clear(): void {
    this.storage.clear();
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
  }
}

// Simulated data source with configurable failure rate
class DataSource {
  private failureRate: number;
  private responseDelay: number;
  private data = new Map<string, any>();

  constructor(failureRate: number = 0.1, responseDelay: number = 50) {
    this.failureRate = failureRate;
    this.responseDelay = responseDelay;

    // Pre-populate with test data
    for (let i = 0; i < 1000; i++) {
      this.data.set(`key_${i}`, { id: i, value: `data_${i}`, timestamp: Date.now() });
    }
  }

  async fetch(key: string): Promise<any> {
    await this.sleep(this.responseDelay);

    // Simulate random failures
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Benchmark scenarios
async function runBenchmark(
  cache: SelfHealingCache | TraditionalCache<any>,
  dataSource: DataSource,
  scenario: string
): Promise<any> {
  const startTime = Date.now();
  const results = {
    scenario,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    responseTimes: [] as number[]
  };

  // Scenario 1: Normal operation
  if (scenario === 'normal') {
    dataSource.setFailureRate(0.05);
    dataSource.setResponseDelay(10);

    for (let i = 0; i < 1000; i++) {
      const key = `key_${i % 100}`;
      const reqStart = Date.now();

      try {
        let value;
        if (cache instanceof SelfHealingCache) {
          value = await cache.get(key);
          if (value === undefined) {
            value = await dataSource.fetch(key);
            cache.set(key, value);
          }
        } else {
          value = cache.get(key);
          if (value === undefined) {
            value = await dataSource.fetch(key);
            cache.set(key, value);
          }
        }

        results.successfulRequests++;
      } catch (error) {
        results.failedRequests++;
        if (!(cache instanceof SelfHealingCache)) {
          (cache as TraditionalCache<any>).recordError();
        }
      }

      results.responseTimes.push(Date.now() - reqStart);
      results.totalRequests++;
    }
  }

  // Scenario 2: High failure rate (system degradation)
  if (scenario === 'high_failure') {
    dataSource.setFailureRate(0.3);
    dataSource.setResponseDelay(50);

    for (let i = 0; i < 500; i++) {
      const key = `key_${i % 50}`;
      const reqStart = Date.now();

      try {
        let value;
        if (cache instanceof SelfHealingCache) {
          value = await cache.get(key);
          if (value === undefined) {
            value = await dataSource.fetch(key);
            cache.set(key, value);
          }
        } else {
          value = cache.get(key);
          if (value === undefined) {
            value = await dataSource.fetch(key);
            cache.set(key, value);
          }
        }

        results.successfulRequests++;
      } catch (error) {
        results.failedRequests++;
        if (!(cache instanceof SelfHealingCache)) {
          (cache as TraditionalCache<any>).recordError();
        }
      }

      results.responseTimes.push(Date.now() - reqStart);
      results.totalRequests++;
    }
  }

  // Scenario 3: Burst traffic with periodic failures
  if (scenario === 'burst_traffic') {
    for (let burst = 0; burst < 5; burst++) {
      // Alternate between normal and degraded
      dataSource.setFailureRate(burst % 2 === 0 ? 0.05 : 0.25);
      dataSource.setResponseDelay(burst % 2 === 0 ? 10 : 100);

      for (let i = 0; i < 200; i++) {
        const key = `key_${Math.floor(Math.random() * 100)}`;
        const reqStart = Date.now();

        try {
          let value;
          if (cache instanceof SelfHealingCache) {
            value = await cache.get(key);
            if (value === undefined) {
              value = await dataSource.fetch(key);
              cache.set(key, value);
            }
          } else {
            value = cache.get(key);
            if (value === undefined) {
              value = await dataSource.fetch(key);
              cache.set(key, value);
            }
          }

          results.successfulRequests++;
        } catch (error) {
          results.failedRequests++;
          if (!(cache instanceof SelfHealingCache)) {
            (cache as TraditionalCache<any>).recordError();
          }
        }

        results.responseTimes.push(Date.now() - reqStart);
        results.totalRequests++;
      }

      // Wait between bursts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const totalTime = Date.now() - startTime;
  results.avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;

  return {
    ...results,
    totalTime,
    throughput: (results.totalRequests / totalTime) * 1000, // requests per second
    p50: percentile(results.responseTimes, 0.5),
    p95: percentile(results.responseTimes, 0.95),
    p99: percentile(results.responseTimes, 0.99)
  };
}

function percentile(values: number[], p: number): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[index];
}

async function main() {
  console.log('='.repeat(80));
  console.log('Self-Healing Cache vs Traditional Cache Benchmark');
  console.log('='.repeat(80));

  const scenarios = ['normal', 'high_failure', 'burst_traffic'];

  for (const scenario of scenarios) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Scenario: ${scenario.toUpperCase()}`);
    console.log('='.repeat(80));

    // Test Traditional Cache
    console.log('\n[Traditional Cache]');
    const traditionalCache = new TraditionalCache();
    const dataSource1 = new DataSource();
    const traditionalResults = await runBenchmark(traditionalCache, dataSource1, scenario);

    console.log(`Total Requests: ${traditionalResults.totalRequests}`);
    console.log(`Successful: ${traditionalResults.successfulRequests} (${(traditionalResults.successfulRequests / traditionalResults.totalRequests * 100).toFixed(2)}%)`);
    console.log(`Failed: ${traditionalResults.failedRequests} (${(traditionalResults.failedRequests / traditionalResults.totalRequests * 100).toFixed(2)}%)`);
    console.log(`Avg Response Time: ${traditionalResults.avgResponseTime.toFixed(2)}ms`);
    console.log(`P50: ${traditionalResults.p50}ms, P95: ${traditionalResults.p95}ms, P99: ${traditionalResults.p99}ms`);
    console.log(`Throughput: ${traditionalResults.throughput.toFixed(2)} req/s`);
    console.log(`Total Time: ${traditionalResults.totalTime}ms`);

    // Test Self-Healing Cache
    console.log('\n[Self-Healing Cache]');
    const selfHealingCache = new SelfHealingCache({
      enableML: true,
      enableAdaptiveRecovery: true,
      healthCheckInterval: 5000
    });

    const dataSource2 = new DataSource();
    selfHealingCache.setDataRefreshFunction(async (key: string) => {
      return await dataSource2.fetch(key);
    });

    const selfHealingResults = await runBenchmark(selfHealingCache, dataSource2, scenario);

    console.log(`Total Requests: ${selfHealingResults.totalRequests}`);
    console.log(`Successful: ${selfHealingResults.successfulRequests} (${(selfHealingResults.successfulRequests / selfHealingResults.totalRequests * 100).toFixed(2)}%)`);
    console.log(`Failed: ${selfHealingResults.failedRequests} (${(selfHealingResults.failedRequests / selfHealingResults.totalRequests * 100).toFixed(2)}%)`);
    console.log(`Avg Response Time: ${selfHealingResults.avgResponseTime.toFixed(2)}ms`);
    console.log(`P50: ${selfHealingResults.p50}ms, P95: ${selfHealingResults.p95}ms, P99: ${selfHealingResults.p99}ms`);
    console.log(`Throughput: ${selfHealingResults.throughput.toFixed(2)} req/s`);
    console.log(`Total Time: ${selfHealingResults.totalTime}ms`);

    // Get self-healing stats
    const stats = selfHealingCache.getStats();
    console.log(`\n[Self-Healing Stats]`);
    console.log(`Cache Health: ${stats.health.state}`);
    console.log(`ML Model: ${stats.mlStats.dataPoints} data points, Weights: [${stats.mlStats.weights.map((w: number) => w.toFixed(3)).join(', ')}]`);
    console.log(`Recovery Success Rate: ${(stats.recoveryStats.successRate * 100).toFixed(2)}%`);
    console.log(`Best Strategy: ${stats.recoveryStats.bestStrategy}`);

    // Comparison
    console.log(`\n[Comparison]`);
    const successRateImprovement = ((selfHealingResults.successfulRequests - traditionalResults.successfulRequests) / traditionalResults.successfulRequests * 100);
    const responseTimeImprovement = ((traditionalResults.avgResponseTime - selfHealingResults.avgResponseTime) / traditionalResults.avgResponseTime * 100);
    const throughputImprovement = ((selfHealingResults.throughput - traditionalResults.throughput) / traditionalResults.throughput * 100);

    console.log(`Success Rate Improvement: ${successRateImprovement > 0 ? '+' : ''}${successRateImprovement.toFixed(2)}%`);
    console.log(`Response Time Improvement: ${responseTimeImprovement > 0 ? '+' : ''}${responseTimeImprovement.toFixed(2)}%`);
    console.log(`Throughput Improvement: ${throughputImprovement > 0 ? '+' : ''}${throughputImprovement.toFixed(2)}%`);

    selfHealingCache.stop();
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('Benchmark Complete');
  console.log('='.repeat(80));
}

main().catch(console.error);
