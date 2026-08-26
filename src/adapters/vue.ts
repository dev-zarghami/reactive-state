import { getCurrentScope, onScopeDispose as vueOnScopeDispose } from 'vue';
import { setLifecycleAdapter, type LifecycleAdapter } from '../core/lifecycle';

/**
 * Vue binding: maps onto Vue's first-class effect-scope API. Works inside any
 * `setup()` or active `effectScope()`.
 */
export const vueAdapter: LifecycleAdapter = {
  onScopeDispose(cleanup) {
    if (!getCurrentScope()) return false;
    vueOnScopeDispose(cleanup);
    return true;
  }
};

export function useVueAdapter(): void {
  setLifecycleAdapter(vueAdapter);
}

useVueAdapter();
