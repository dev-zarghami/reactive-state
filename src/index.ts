export { useQuery, DataSubject } from './core/useQuery';
export type {
  UseQueryResult,
  QueryDataStream,
  RelationConfig,
  RelationSourceConfig,
  RelationMap,
  ExecCallbacks,
  ProcessStrategy
} from './core/useQuery';

export { defineQuery, configureContainer, _getRegistryEntry, _evictRegistryEntry } from './core/queryContainer';
export type { ContainerConfig } from './core/queryContainer';

export {
  setLifecycleAdapter,
  getLifecycleAdapter,
  onScopeDispose
} from './core/lifecycle';
export type { LifecycleAdapter, Cleanup } from './core/lifecycle';