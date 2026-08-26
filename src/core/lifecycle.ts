/**
 * Framework-agnostic lifecycle binding.
 *
 * The core (query engine + container) never imports a UI framework. Instead a
 * consumer installs a `LifecycleAdapter` once at startup — the adapter knows how
 * to run a cleanup callback when the *current consumer scope* (a Svelte
 * component, a Vue effect scope, …) tears down. Ship-in adapters live under
 * `src/adapters/*`.
 */

export type Cleanup = () => void;

export interface LifecycleAdapter {
  /**
   * Register `cleanup` to run when the active consumer scope is destroyed.
   * Must be called synchronously during that scope's setup (e.g. Svelte
   * component init). Returns `false` when there is no active scope to bind to,
   * so callers can fall back to manual disposal.
   */
  onScopeDispose(cleanup: Cleanup): boolean;
}

let current: LifecycleAdapter | null = null;
let warnedMissing = false;

export function setLifecycleAdapter(adapter: LifecycleAdapter | null): void {
  current = adapter;
}

export function getLifecycleAdapter(): LifecycleAdapter | null {
  return current;
}

/**
 * Bind `cleanup` to the active scope via the installed adapter. Returns `true`
 * when it was registered, `false` when no adapter/scope is available (in which
 * case the caller owns disposal).
 */
export function onScopeDispose(cleanup: Cleanup): boolean {
  if (!current) {
    if (!warnedMissing && typeof console !== 'undefined') {
      warnedMissing = true;
      console.warn(
        '[reactive-state] No lifecycle adapter installed — automatic disposal is off. ' +
          'Import a framework adapter (e.g. "@package/logic/svelte") or call dispose() yourself.'
      );
    }
    return false;
  }
  return current.onScopeDispose(cleanup);
}
