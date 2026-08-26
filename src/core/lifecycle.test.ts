import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setLifecycleAdapter,
  getLifecycleAdapter,
  onScopeDispose
} from './lifecycle';
import { reactAdapter } from '../adapters/react';

describe('lifecycle', () => {
  beforeEach(() => {
    setLifecycleAdapter(null);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    setLifecycleAdapter(null);
    vi.restoreAllMocks();
  });

  describe('setLifecycleAdapter / getLifecycleAdapter', () => {
    it('stores and retrieves adapter', () => {
      const adapter = { onScopeDispose: () => true };
      setLifecycleAdapter(adapter);
      expect(getLifecycleAdapter()).toBe(adapter);
    });

    it('returns null when no adapter set', () => {
      expect(getLifecycleAdapter()).toBeNull();
    });
  });

  describe('onScopeDispose', () => {
    it('calls adapter.onScopeDispose when adapter installed', () => {
      const spy = vi.fn(() => true);
      setLifecycleAdapter({ onScopeDispose: spy });
      const cleanup = vi.fn();
      const result = onScopeDispose(cleanup);
      expect(spy).toHaveBeenCalledWith(cleanup);
      expect(result).toBe(true);
    });

    it('returns false when no adapter installed', () => {
      const result = onScopeDispose(() => {});
      expect(result).toBe(false);
    });
  });

  describe('reactAdapter', () => {
    it('always returns false (stub)', () => {
      expect(reactAdapter.onScopeDispose(() => {})).toBe(false);
    });
  });
});
