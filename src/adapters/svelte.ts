import { onDestroy } from 'svelte';
import { setLifecycleAdapter, type LifecycleAdapter } from '../core/lifecycle';

/**
 * Svelte binding: cleanups run on component `onDestroy`. `onDestroy` throws when
 * called outside component init, so we treat that as "no active scope".
 */
export const svelteAdapter: LifecycleAdapter = {
  onScopeDispose(cleanup) {
    try {
      onDestroy(cleanup);
      return true;
    } catch {
      return false;
    }
  }
};

export function useSvelteAdapter(): void {
  setLifecycleAdapter(svelteAdapter);
}

// Installing on import lets consumers just `import '@package/logic/svelte'`.
useSvelteAdapter();
