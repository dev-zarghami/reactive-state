/**
 * Framework-agnostic lifecycle binding.
 *
 * The core (query engine + container) never imports a UI framework. Instead a
 * consumer installs a `LifecycleAdapter` once at startup — the adapter knows how
 * to run a cleanup callback when the *current consumer scope* (a Svelte
 * component, a Vue effect scope, …) tears down. Ship-in adapters live under
 * `src/adapters/*`.
 */

/**
 * A cleanup function to be called when a scope is destroyed.
 */
export type Cleanup = () => void;

/**
 * Interface for framework-specific lifecycle adapters. Implementations bridge
 * the gap between the framework's component lifecycle and the query container's
 * ref-counting system.
 */
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

/**
 * Install a lifecycle adapter. Call once at app startup (typically done
 * automatically by importing a framework adapter like `@reactive/state/svelte`).
 *
 * @param adapter - The adapter to install, or `null` to uninstall.
 *
 * @example
 * ```ts
 * import { setLifecycleAdapter } from '@reactive/state';
 *
 * setLifecycleAdapter({
 *   onScopeDispose(cleanup) {
 *     // Wire cleanup to your framework's scope destruction
 *     onDestroy(cleanup);
 *     return true;
 *   },
 * });
 * ```
 */
export function setLifecycleAdapter(adapter: LifecycleAdapter | null): void {
  current = adapter;
}

/**
 * Get the currently installed lifecycle adapter, or `null` if none is set.
 *
 * @returns The active {@link LifecycleAdapter}, or `null`.
 */
export function getLifecycleAdapter(): LifecycleAdapter | null {
  return current;
}

/**
 * Bind `cleanup` to the active scope via the installed adapter. Returns `true`
 * when it was registered, `false` when no adapter/scope is available (in which
 * case the caller owns disposal).
 *
 * @param cleanup - Function to call when the scope is destroyed.
 * @returns `true` if registered, `false` if no adapter is available.
 *
 * @example
 * ```ts
 * import { onScopeDispose } from '@reactive/state';
 *
 * // Manual disposal when no adapter is installed
 * const query = useQuery(fetchData);
 * if (!onScopeDispose(() => query.dispose())) {
 *   // No scope — clean up manually later
 *   window.addEventListener('beforeunload', () => query.dispose());
 * }
 * ```
 */
export function onScopeDispose(cleanup: Cleanup): boolean {
  if (!current) {
    if (!warnedMissing && typeof console !== 'undefined') {
      warnedMissing = true;
      console.warn(
        '[reactive-state] No lifecycle adapter installed — automatic disposal is off. ' +
          'Import a framework adapter (e.g. "@reactive/state/svelte") or call dispose() yourself.'
      );
    }
    return false;
  }
  return current.onScopeDispose(cleanup);
}
