import { SelfHealingCache } from '../core/SelfHealingCache';
import { CacheState } from '../types';

describe('SelfHealingCache', () => {
  let cache: SelfHealingCache;

  beforeEach(() => {
    cache = new SelfHealingCache({
      maxSize: 100,
      defaultTTL: 60000,
      healthCheckInterval: 30000,
      enableML: true,
      enableAdaptiveRecovery: true
    });
  });

  afterEach(() => {
    cache.stop();
  });

  describe('Basic operations', () => {
    test('should set and get values', async () => {
      cache.set('key1', 'value1');
      const value = await cache.get('key1');
      expect(value).toBe('value1');
    });

    test('should return undefined for non-existent keys', async () => {
      const value = await cache.get('non-existent');
      expect(value).toBeUndefined();
    });

    test('should delete values', async () => {
      cache.set('key1', 'value1');
      expect(await cache.get('key1')).toBe('value1');

      cache.delete('key1');
      expect(await cache.get('key1')).toBeUndefined();
    });

    test('should clear all values', async () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(await cache.get('key1')).toBeUndefined();
      expect(await cache.get('key2')).toBeUndefined();
    });
  });

  describe('Health monitoring', () => {
    test('should track cache hits', async () => {
      cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.get('key1');

      const health = cache.getHealth();
      expect(health.metrics.hitRate).toBeGreaterThan(0);
    });

    test('should track cache misses', async () => {
      await cache.get('non-existent1');
      await cache.get('non-existent2');

      const health = cache.getHealth();
      expect(health.metrics.missRate).toBeGreaterThan(0);
    });

    test('should start in healthy or degraded state', () => {
      const health = cache.getHealth();
      // Initial state can be healthy or degraded depending on initialization
      expect([CacheState.HEALTHY, CacheState.DEGRADED]).toContain(health.state);
    });
  });

  describe('Data refresh function', () => {
    test('should use refresh function for cache misses', async () => {
      const mockFetch = jest.fn().mockResolvedValue('fetched-value');
      cache.setDataRefreshFunction(mockFetch);

      const value = await cache.get('key1');

      expect(mockFetch).toHaveBeenCalledWith('key1');
      expect(value).toBe('fetched-value');
    });

    test('should cache refreshed values', async () => {
      const mockFetch = jest.fn().mockResolvedValue('fetched-value');
      cache.setDataRefreshFunction(mockFetch);

      await cache.get('key1');
      await cache.get('key1');

      // Should only fetch once, second time from cache
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle refresh failures', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Fetch failed'));
      cache.setDataRefreshFunction(mockFetch);

      await expect(cache.get('key1')).rejects.toThrow('Fetch failed');
    });
  });

  describe('Statistics', () => {
    test('should provide comprehensive stats', async () => {
      cache.set('key1', 'value1');
      await cache.get('key1');

      const stats = cache.getStats();

      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('health');
      expect(stats).toHaveProperty('mlStats');
      expect(stats).toHaveProperty('recoveryStats');
    });

    test('should track ML model data points', async () => {
      const stats = cache.getStats();

      expect(stats.mlStats).toHaveProperty('dataPoints');
      expect(stats.mlStats).toHaveProperty('weights');
      expect(Array.isArray(stats.mlStats.weights)).toBe(true);
    });
  });

  describe('TTL expiration', () => {
    test('should respect TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL

      expect(await cache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(await cache.get('key1')).toBeUndefined();
    });
  });
});
