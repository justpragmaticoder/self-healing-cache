import { InMemoryAdapter } from '../libs/self-healing-cache/adapters/InMemoryAdapter';

describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      await adapter.set('key1', 'value1');
      const value = await adapter.get('key1');

      expect(value).toBe('value1');
    });

    it('should return undefined for non-existent keys', async () => {
      const value = await adapter.get('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should delete keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.delete('key1');

      const value = await adapter.get('key1');
      expect(value).toBeUndefined();
    });

    it('should check key existence with has', async () => {
      await adapter.set('key1', 'value1');

      expect(await adapter.has('key1')).toBe(true);
      expect(await adapter.has('nonexistent')).toBe(false);
    });
  });

  describe('TTL Management', () => {
    it('should handle TTL in set operation', async () => {
      jest.useFakeTimers();

      await adapter.set('key1', 'value1', 1000);

      expect(await adapter.get('key1')).toBe('value1');

      jest.advanceTimersByTime(1500);

      expect(await adapter.get('key1')).toBeUndefined();

      jest.useRealTimers();
    });

    it('should not expire keys without TTL', async () => {
      jest.useFakeTimers();

      await adapter.set('key1', 'value1');

      jest.advanceTimersByTime(10000);

      expect(await adapter.get('key1')).toBe('value1');

      jest.useRealTimers();
    });
  });

  describe('Storage Management', () => {
    it('should store multiple entries', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      expect(await adapter.get('key1')).toBe('value1');
      expect(await adapter.get('key2')).toBe('value2');
      expect(await adapter.get('key3')).toBe('value3');
    });

    it('should overwrite existing keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key1', 'value2');

      expect(await adapter.get('key1')).toBe('value2');
    });

    it('should handle many entries', async () => {
      for (let i = 0; i < 100; i++) {
        await adapter.set(`key${i}`, `value${i}`);
      }

      for (let i = 0; i < 100; i++) {
        expect(await adapter.get(`key${i}`)).toBe(`value${i}`);
      }
    });
  });

  describe('Keys and Pattern Matching', () => {
    it('should get all keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      const keys = await adapter.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should get keys by pattern', async () => {
      await adapter.set('user:1', 'value1');
      await adapter.set('user:2', 'value2');
      await adapter.set('post:1', 'value3');

      const userKeys = await adapter.keys('user:*');
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain('user:1');
      expect(userKeys).toContain('user:2');
    });

    it('should support wildcard patterns', async () => {
      await adapter.set('prefix:key1:suffix', 'value1');
      await adapter.set('prefix:key2:suffix', 'value2');
      await adapter.set('other', 'value3');

      const keys = await adapter.keys('prefix:*:suffix');
      expect(keys).toHaveLength(2);
    });
  });

  describe('Clear and Size', () => {
    it('should clear all data', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      await adapter.clear();

      expect(await adapter.get('key1')).toBeUndefined();
      expect(await adapter.get('key2')).toBeUndefined();
      expect(await adapter.get('key3')).toBeUndefined();
      expect(await adapter.size()).toBe(0);
    });

    it('should return correct size', async () => {
      expect(await adapter.size()).toBe(0);

      await adapter.set('key1', 'value1');
      expect(await adapter.size()).toBe(1);

      await adapter.set('key2', 'value2');
      expect(await adapter.size()).toBe(2);
    });

    it('should respond to ping', async () => {
      const result = await adapter.ping();
      expect(result).toBe(true);
    });
  });

  describe('Data Types', () => {
    it('should handle strings', async () => {
      await adapter.set('key', 'string value');
      expect(await adapter.get('key')).toBe('string value');
    });

    it('should handle numbers', async () => {
      await adapter.set('key', 42);
      expect(await adapter.get('key')).toBe(42);
    });

    it('should handle objects', async () => {
      const obj = { foo: 'bar', nested: { value: 123 } };
      await adapter.set('key', obj);
      expect(await adapter.get('key')).toEqual(obj);
    });

    it('should handle arrays', async () => {
      const arr = [1, 2, 3, 'four', { five: 5 }];
      await adapter.set('key', arr);
      expect(await adapter.get('key')).toEqual(arr);
    });

    it('should handle booleans', async () => {
      await adapter.set('true', true);
      await adapter.set('false', false);

      expect(await adapter.get('true')).toBe(true);
      expect(await adapter.get('false')).toBe(false);
    });

    it('should handle null', async () => {
      await adapter.set('key', null);
      expect(await adapter.get('key')).toBe(null);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000);
      await adapter.set(longKey, 'value');
      expect(await adapter.get(longKey)).toBe('value');
    });

    it('should handle keys with special characters', async () => {
      const specialKeys = [
        'key:with:colons',
        'key/with/slashes',
        'key.with.dots',
        'key-with-dashes',
        'key_with_underscores',
        'key with spaces'
      ];

      for (const key of specialKeys) {
        await adapter.set(key, `value-${key}`);
        expect(await adapter.get(key)).toBe(`value-${key}`);
      }
    });

    it('should handle rapid successive operations', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(adapter.set(`key${i}`, `value${i}`));
      }

      await Promise.all(promises);

      for (let i = 0; i < 100; i++) {
        expect(await adapter.get(`key${i}`)).toBe(`value${i}`);
      }
    });

    it('should handle deleting non-existent keys', async () => {
      const result = await adapter.delete('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('Memory Management', () => {
    it('should properly clean up expired entries', async () => {
      jest.useFakeTimers();

      await adapter.set('key1', 'value1', 1000);
      await adapter.set('key2', 'value2', 2000);
      await adapter.set('key3', 'value3'); // No TTL

      jest.advanceTimersByTime(1500);

      expect(await adapter.get('key1')).toBeUndefined();
      expect(await adapter.get('key2')).toBe('value2');
      expect(await adapter.get('key3')).toBe('value3');

      jest.useRealTimers();
    });

    it('should handle large number of entries', async () => {
      for (let i = 0; i < 1000; i++) {
        await adapter.set(`key${i}`, `value${i}`);
      }

      for (let i = 0; i < 1000; i++) {
        expect(await adapter.get(`key${i}`)).toBe(`value${i}`);
      }
    });
  });
});

