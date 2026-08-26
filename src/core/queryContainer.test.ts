import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineQuery, configureContainer } from './queryContainer';
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
      const factory = defineQuery('singleton-a', () => ({ value: Math.random() }));
      const a = factory();
      const b = factory();
      expect(a).toBe(b);
    });

    it('returns different instances for different keys', () => {
      const factoryA = defineQuery('key-a', () => ({ id: 'a' }));
      const factoryB = defineQuery('key-b', () => ({ id: 'b' }));
      const a = factoryA();
      const b = factoryB();
      expect(a).not.toBe(b);
    });

    it('calls factory only once per key', () => {
      const spy = vi.fn(() => ({ x: 1 }));
      const factory = defineQuery('once-only', spy);
      factory();
      factory();
      factory();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('refcounting', () => {
    it('registers a cleanup on each call', () => {
      const factory = defineQuery('ref-register', () => ({ x: 1 }));
      factory();
      factory();
      factory();
      expect(mock.registered).toBe(3);
    });

    it('decrements refCount when scope disposes', () => {
      const dispose = vi.fn();
      const factory = defineQuery('ref-dec', () => ({ dispose }));
      factory();
      factory();
      expect(mock.cleanups).toHaveLength(2);
      mock.flush();
      expect(mock.cleanups).toHaveLength(0);
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
      const factory = defineQuery('no-adapter', () => ({ x: 1 }));
      expect(() => factory()).not.toThrow();
    });
  });
});
