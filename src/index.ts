export { useQuery, DataSubject } from './core/useQuery';
export type {
  UseQueryResult,
  QueryDataStream,
  RelationConfig,
  RelationSourceConfig,
  RelationMap,
  ExecCallbacks
} from './core/useQuery';

export { defineQuery, configureContainer } from './core/queryContainer';

export {
  setLifecycleAdapter,
  getLifecycleAdapter,
  onScopeDispose
} from './core/lifecycle';
export type { LifecycleAdapter, Cleanup } from './core/lifecycle';

export { svelteAdapter, useSvelteAdapter } from './adapters/svelte';
export { vueAdapter, useVueAdapter } from './adapters/vue';
export { reactAdapter, useReactAdapter } from './adapters/react';
