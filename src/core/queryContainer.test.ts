import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineQuery, configureContainer, _getRegistryEntry, _evictRegistryEntry } from './queryContainer';
import { setLifecycleAdapter } from './lifecycle';

function createMockAdapter() {
  const cleanups: (() => void)[] = [];
  let registeredCount = 0;
  return {
    adapter: {
      onScopeDispose(cleanup: () => void) {
        cleanups.push(cleanup);
        registeredCount++;
        return true;
      }
    },
    flush() {
      const copy = [...cleanups];
      cleanups.length = 0;
      copy.forEach((fn) => fn());
    },
    cleanups,
    get registered() {
      return registeredCount;
    }
  };
}

describe('defineQuery', () => {
  let mock: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    mock = createMockAdapter();
    setLifecycleAdapter(mock.adapter);
  });

  afterEach(() => {
    setLifecycleAdapter(null);
  });

  describe('singleton behavior', () => {
    it('returns the same instance for the same key', () => {
      const factory = defineQuery('singleton-a', (q) => {
        (q as Record<string, unknown>).value = Math.random();
        return q;
      });
      const a = factory();
      const b = factory();
      expect(a).toBe(b);
    });

    it('returns different instances for different keys', () => {
      const factoryA = defineQuery('key-a', (q) => {
        (q as Record<string, unknown>).id = 'a';
        return q;
      });
      const factoryB = defineQuery('key-b', (q) => {
        (q as Record<string, unknown>).id = 'b';
        return q;
      });
      const a = factoryA();
      const b = factoryB();
      expect(a).not.toBe(b);
    });

    it('calls factory only once per key', () => {
      const spy = vi.fn<(q: object) => object>((q) => q);
      const factory = defineQuery('once-only', spy);
      factory();
      factory();
      factory();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('refcounting', () => {
    it('registers a cleanup on each call', () => {
      const factory = defineQuery('ref-register', (q) => q);
      factory();
      factory();
      factory();
      expect(mock.registered).toBe(3);
    });

    it('decrements refCount when scope disposes', () => {
      const factory = defineQuery('ref-dec', (q) => {
        (q as Record<string, unknown>).dispose = vi.fn();
        return q;
      });
      factory();
      factory();
      expect(mock.cleanups).toHaveLength(2);
      mock.flush();
      expect(mock.cleanups).toHaveLength(0);
    });
  });

  describe('query injection', () => {
    it('factory receives a query instance from defineQuery', () => {
      const spy = vi.fn<(q: object) => object>((q) => q);
      const factory = defineQuery('injected', spy);
      factory();
      expect(spy).toHaveBeenCalledTimes(1);
      const received = spy.mock.calls[0][0];
      expect(received).toBeDefined();
      expect(typeof received).toBe('object');
    });

    it('factory can configure the query via handler', () => {
      const factory = defineQuery('handler-test', (q) => {
        const query = q as { handler: (exec: () => Promise<null>, strat?: string) => unknown };
        query.handler(async () => null, 'FIFO');
        return q;
      });
      const instance = factory();
      expect(instance).toBeDefined();
    });
  });

  describe('configureContainer', () => {
    it('does not throw when called', () => {
      expect(() => configureContainer({ debug: true })).not.toThrow();
      expect(() => configureContainer({ debug: false })).not.toThrow();
    });
  });

  describe('without lifecycle adapter', () => {
    it('falls back gracefully when no adapter installed', () => {
      setLifecycleAdapter(null);
      const factory = defineQuery('no-adapter', (q) => q);
      expect(() => factory()).not.toThrow();
    });
  });

  describe('disposal race condition', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('stale timer does not dispose a newer entry at the same key', () => {
      // 1. Create entry A, use it, release it → disposal scheduled at 5s
      const factory1 = defineQuery('race-key', (q) => q);
      factory1();
      mock.flush();
      expect(_getRegistryEntry('race-key')).toBeDefined();

      // 2. Evict entry A (simulates trimRegistry) before its timer fires
      vi.advanceTimersByTime(3000);
      _evictRegistryEntry('race-key');
      expect(_getRegistryEntry('race-key')).toBeUndefined();

      // 3. Create entry B at the same key, use it 12 times (very hot → 30s delay)
      const factory2 = defineQuery('race-key', (q) => q);
      for (let i = 0; i < 12; i++) factory2();
      mock.flush();
      const entryB = _getRegistryEntry('race-key');
      expect(entryB).toBeDefined();
      expect(entryB!.usageCount).toBeGreaterThanOrEqual(12);

      // 4. Advance past entry A's original 5s delay (now at t=8s)
      //    Stale timer fires — must NOT remove entry B
      vi.advanceTimersByTime(5000);
      expect(_getRegistryEntry('race-key')).toBeDefined();

      // 5. Advance to just before entry B's 30s timer fires (t=32s)
      vi.advanceTimersByTime(24_000);
      expect(_getRegistryEntry('race-key')).toBeDefined();

      // 6. Advance past entry B's timer (t=34s) — entry B should be disposed
      vi.advanceTimersByTime(2000);
      expect(_getRegistryEntry('race-key')).toBeUndefined();
    });
  });
});
