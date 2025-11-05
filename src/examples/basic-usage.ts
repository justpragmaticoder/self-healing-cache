import { SelfHealingCache } from '../core/SelfHealingCache';

// Simulate a database or external API
class MockDatabase {
  private data: Map<string, any>;
  private failureRate: number;

  constructor(failureRate: number = 0) {
    this.data = new Map();
    this.failureRate = failureRate;

    // Initialize with some data
    for (let i = 0; i < 100; i++) {
      this.data.set(`user:${i}`, {
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        createdAt: new Date().toISOString()
      });
    }
  }

  async fetch(key: string): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate random failures
    if (Math.random() < this.failureRate) {
      throw new Error('Database connection failed');
    }

    return this.data.get(key);
  }

  setFailureRate(rate: number): void {
    this.failureRate = rate;
  }
}

async function basicUsageExample() {
  console.log('='.repeat(60));
  console.log('Self-Healing Cache - Basic Usage Example');
  console.log('='.repeat(60));

  // Create cache instance
  const cache = new SelfHealingCache({
    maxSize: 1000,
    defaultTTL: 60000, // 1 minute
    healthCheckInterval: 5000, // 5 seconds
    enableML: true,
    enableAdaptiveRecovery: true
  });

  // Create mock database
  const database = new MockDatabase(0.1); // 10% failure rate

  // Set data refresh function
  cache.setDataRefreshFunction(async (key: string) => {
    console.log(`[DataSource] Fetching key: ${key}`);
    return await database.fetch(key);
  });

  console.log('\n1. Basic GET operations (cache misses, will fetch from database)');
  console.log('-'.repeat(60));

  for (let i = 0; i < 5; i++) {
    try {
      const user = await cache.get(`user:${i}`);
      console.log(`Retrieved user:${i} =>`, user?.name);
    } catch (error) {
      console.log(`Failed to retrieve user:${i}`);
    }
  }

  console.log('\n2. Cached GET operations (cache hits, no database access)');
  console.log('-'.repeat(60));

  for (let i = 0; i < 5; i++) {
    const user = await cache.get(`user:${i}`);
    console.log(`Retrieved user:${i} => ${user?.name} (from cache)`);
  }

  console.log('\n3. Manual SET operations');
  console.log('-'.repeat(60));

  cache.set('custom:1', { type: 'custom', data: 'Custom data 1' });
  cache.set('custom:2', { type: 'custom', data: 'Custom data 2' });
  console.log('Set custom:1 and custom:2');

  const custom1 = await cache.get('custom:1');
  console.log('Retrieved custom:1 =>', custom1);

  console.log('\n4. Health metrics');
  console.log('-'.repeat(60));

  const health = cache.getHealth();
  console.log('Cache State:', health.state);
  console.log('Hit Rate:', (health.metrics.hitRate * 100).toFixed(2) + '%');
  console.log('Miss Rate:', (health.metrics.missRate * 100).toFixed(2) + '%');
  console.log('Error Rate:', (health.metrics.errorRate * 100).toFixed(2) + '%');
  console.log('Avg Response Time:', health.metrics.avgResponseTime.toFixed(2) + 'ms');

  console.log('\n5. Simulating failures (increased failure rate)');
  console.log('-'.repeat(60));

  database.setFailureRate(0.4); // Increase to 40% failure rate

  for (let i = 10; i < 30; i++) {
    try {
      await cache.get(`user:${i}`);
    } catch (error) {
      // Silent catch - just generating failures
    }
  }

  // Wait for health check to trigger self-healing
  console.log('\nWaiting for self-healing to trigger...');
  await new Promise(resolve => setTimeout(resolve, 6000));

  console.log('\n6. Health metrics after failures');
  console.log('-'.repeat(60));

  const healthAfter = cache.getHealth();
  console.log('Cache State:', healthAfter.state);
  console.log('Hit Rate:', (healthAfter.metrics.hitRate * 100).toFixed(2) + '%');
  console.log('Error Rate:', (healthAfter.metrics.errorRate * 100).toFixed(2) + '%');

  console.log('\n7. Full statistics');
  console.log('-'.repeat(60));

  const stats = cache.getStats();
  console.log('Cache Size:', stats.cacheSize);
  console.log('ML Model Data Points:', stats.mlStats.dataPoints);
  console.log('ML Model Weights:', stats.mlStats.weights.map((w: number) => w.toFixed(3)));
  console.log('Recovery Success Rate:', (stats.recoveryStats.successRate * 100).toFixed(2) + '%');
  console.log('Best Recovery Strategy:', stats.recoveryStats.bestStrategy);
  console.log('Recovery Actions:', stats.recoveryStats.history.length);

  console.log('\n8. Cleanup');
  console.log('-'.repeat(60));

  cache.stop();
  console.log('Cache stopped');

  console.log('\n' + '='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));
}

// Run the example
basicUsageExample().catch(console.error);
