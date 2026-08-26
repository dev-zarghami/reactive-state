import { setLifecycleAdapter, type LifecycleAdapter } from '../core/lifecycle';

/**
 * React binding — STUB.
 *
 * React has no way to register a teardown imperatively during render the way
 * Svelte's `onDestroy` and Vue's effect scopes allow. A proper React binding
 * needs a hook (`useEffect` cleanup) that owns the query instance's lifetime;
 * that lives in the roadmap, not here. Until then this adapter never claims a
 * scope, so container-managed instances fall back to manual `dispose()`.
 */
export const reactAdapter: LifecycleAdapter = {
  onScopeDispose() {
    return false;
  }
};

export function useReactAdapter(): void {
  setLifecycleAdapter(reactAdapter);
}
