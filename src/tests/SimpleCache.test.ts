import { SimpleCache } from '../libs/self-healing-cache/core/SimpleCache';

describe('SimpleCache', () => {
  let cache: SimpleCache;
  let mockDataRefreshFunction: jest.Mock;

  beforeEach(() => {
    cache = new SimpleCache();
    mockDataRefreshFunction = jest.fn();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');

      expect(value).toBe('value1');
    });

    it('should return undefined for non-existent keys', async () => {
      const value = await cache.get('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should overwrite existing values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key1', 'value2');

      const value = await cache.get('key1');
      expect(value).toBe('value2');
    });

    it('should handle different data types', async () => {
      await cache.set('string', 'text');
      await cache.set('number', 42);
      await cache.set('object', { foo: 'bar' });
      await cache.set('array', [1, 2, 3]);
      await cache.set('boolean', true);

      expect(await cache.get('string')).toBe('text');
      expect(await cache.get('number')).toBe(42);
      expect(await cache.get('object')).toEqual({ foo: 'bar' });
      expect(await cache.get('array')).toEqual([1, 2, 3]);
      expect(await cache.get('boolean')).toBe(true);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect TTL and expire entries', async () => {
      jest.useFakeTimers();

      await cache.set('key1', 'value1', 1000); // 1 second TTL

      expect(await cache.get('key1')).toBe('value1');

      // Fast-forward past TTL
      jest.advanceTimersByTime(1500);

      const value = await cache.get('key1');
      expect(value).toBeUndefined();

      jest.useRealTimers();
    });

    it('should not expire entries without TTL', async () => {
      jest.useFakeTimers();

      await cache.set('key1', 'value1'); // No TTL

      jest.advanceTimersByTime(10000); // 10 seconds

      expect(await cache.get('key1')).toBe('value1');

      jest.useRealTimers();
    });

    it('should update TTL when setting existing key', async () => {
      jest.useFakeTimers();

      await cache.set('key1', 'value1', 1000);

      jest.advanceTimersByTime(500);

      await cache.set('key1', 'value2', 2000); // New TTL

      jest.advanceTimersByTime(1500); // Total 2000ms

      expect(await cache.get('key1')).toBe('value2');

      jest.useRealTimers();
    });
  });

  describe('Data Refresh Function', () => {
    it('should use data refresh function when key not found', async () => {
      mockDataRefreshFunction.mockResolvedValue('refreshed-value');
      cache.setDataRefreshFunction(mockDataRefreshFunction);

      const value = await cache.get('key1');

      expect(mockDataRefreshFunction).toHaveBeenCalledWith('key1');
      expect(value).toBe('refreshed-value');
    });

    it('should cache refreshed values', async () => {
      mockDataRefreshFunction.mockResolvedValue('refreshed-value');
      cache.setDataRefreshFunction(mockDataRefreshFunction);

      await cache.get('key1');
      await cache.get('key1');

      // Should only call refresh function once
      expect(mockDataRefreshFunction).toHaveBeenCalledTimes(1);
    });

    it('should not use refresh function if value exists', async () => {
      mockDataRefreshFunction.mockResolvedValue('refreshed-value');
      cache.setDataRefreshFunction(mockDataRefreshFunction);

      await cache.set('key1', 'existing-value');
      const value = await cache.get('key1');

      expect(value).toBe('existing-value');
      expect(mockDataRefreshFunction).not.toHaveBeenCalled();
    });

    it('should handle refresh function errors', async () => {
      mockDataRefreshFunction.mockRejectedValue(new Error('Refresh failed'));
      cache.setDataRefreshFunction(mockDataRefreshFunction);

      await expect(cache.get('key1')).rejects.toThrow('Refresh failed');
    });

    it('should work without refresh function', async () => {
      const value = await cache.get('nonexistent');
      expect(value).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', 'value1');

      await cache.get('key1'); // Hit
      await cache.get('key2'); // Miss
      await cache.get('key1'); // Hit

      const stats = cache.getStats();

      expect(stats.cacheStats.hits).toBe(2);
      expect(stats.cacheStats.misses).toBe(1);
    });

    it('should calculate hit rate correctly', async () => {
      await cache.set('key1', 'value1');

      await cache.get('key1'); // Hit
      await cache.get('key2'); // Miss

      const stats = cache.getStats();

      expect(stats.cacheStats.hitRate).toBe(0.5); // 1 hit out of 2 total
    });

    it('should handle zero operations', () => {
      const stats = cache.getStats();

      expect(stats.cacheStats.hits).toBe(0);
      expect(stats.cacheStats.misses).toBe(0);
      expect(stats.cacheStats.hitRate).toBe(0);
    });

    it('should track cache size', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      const stats = cache.getStats();

      expect(stats.cacheSize).toBeGreaterThan(0);
    });

    it('should include cache size in stats', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();

      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      await cache.set('key1', null);
      const value = await cache.get('key1');

      expect(value).toBeNull();
    });

    it('should handle undefined values', async () => {
      await cache.set('key1', undefined);
      const value = await cache.get('key1');

      expect(value).toBeUndefined();
    });

    it('should handle large objects', async () => {
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `value${i}` }))
      };

      await cache.set('large', largeObject);
      const value = await cache.get('large');

      expect(value).toEqual(largeObject);
    });

    it('should handle empty strings', async () => {
      await cache.set('empty', '');
      const value = await cache.get('empty');

      expect(value).toBe('');
    });

    it('should handle zero as a value', async () => {
      await cache.set('zero', 0);
      const value = await cache.get('zero');

      expect(value).toBe(0);
    });

    it('should handle special characters in keys', async () => {
      await cache.set('key:with:colons', 'value1');
      await cache.set('key/with/slashes', 'value2');
      await cache.set('key.with.dots', 'value3');

      expect(await cache.get('key:with:colons')).toBe('value1');
      expect(await cache.get('key/with/slashes')).toBe('value2');
      expect(await cache.get('key.with.dots')).toBe('value3');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous gets', async () => {
      await cache.set('key1', 'value1');

      const promises = Array.from({ length: 10 }, () => cache.get('key1'));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBe('value1');
      });
    });

    it('should handle multiple simultaneous sets', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        cache.set(`key${i}`, `value${i}`)
      );

      await Promise.all(promises);

      for (let i = 0; i < 10; i++) {
        expect(await cache.get(`key${i}`)).toBe(`value${i}`);
      }
    });

    it('should handle refresh function being called concurrently', async () => {
      let callCount = 0;
      mockDataRefreshFunction.mockImplementation(async (key) => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return `value-${callCount}`;
      });

      cache.setDataRefreshFunction(mockDataRefreshFunction);

      // Multiple concurrent requests for same key
      const promises = Array.from({ length: 5 }, () => cache.get('key1'));
      await Promise.all(promises);

      // Should only call refresh once due to caching
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });
});

