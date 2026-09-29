import {Subject, timer} from 'rxjs';
import {filter, takeUntil, map, mergeMap} from 'rxjs/operators';
import {onScopeDispose} from './lifecycle';
import {useQuery, type UseQueryResult} from './useQuery';

type QueryFactory<TData, TError, TResult extends object> = (
    query: UseQueryResult<TData, TError>
) => TResult;

type RegistryEntry<T extends object> = {
    instance: T & { dispose?: () => void };
    /** Cached `{...instance, sweep}` handed to accessor callers — built once. */
    facade?: object;
    refCount: number;
    createdAt: number;
    lastUsed: number;
    usageCount: number;
};

type DisposalRequest = {
    key: string;
    entry: RegistryEntry<object>;
    delay: number;
};

type DefinedQueryResult<T extends object> =
    Omit<T, 'handler' | 'setRelations' | 'dispose'> & {
    sweep: () => void;
};


let debugEnabled = true;

/**
 * Configuration options for the query container.
 *
 * @example
 * ```ts
 * configureContainer({
 *   debug: true,
 *   maxEntries: 200,
 *   baseDisposalDelay: 10_000,
 * });
 * ```
 */
export type ContainerConfig = {
    /** Enable diagnostic logging (INIT/REUSE/REF±/DISPOSE/TRIM). Defaults to `false`. */
    debug?: boolean;
    /** Disposal delay (ms) for low-usage entries. Defaults to `5000`. */
    baseDisposalDelay?: number;
    /** Disposal delay (ms) for moderately-used entries (usageCount >= hotThreshold). Defaults to `10000`. */
    hotDisposalDelay?: number;
    /** Disposal delay (ms) for heavily-used entries (usageCount >= veryHotThreshold). Defaults to `30000`. */
    veryHotDisposalDelay?: number;
    /** Usage count at which an entry is considered "hot". Defaults to `5`. */
    hotThreshold?: number;
    /** Usage count at which an entry is considered "very hot". Defaults to `10`. */
    veryHotThreshold?: number;
    /** Soft cap on the number of cached entries. LRU trimming evicts unused entries above this limit. Defaults to `100`. */
    maxEntries?: number;
};

/**
 * Configure the query container's debug logging, disposal delays, and LRU
 * trimming thresholds. All options are optional and merged into the current
 * config. Call once at app startup (e.g. in a root layout).
 *
 * @param options - Partial {@link ContainerConfig}.
 *
 * @example
 * ```ts
 * import { configureContainer } from '@reactive/state';
 *
 * // Enable debug logging in development
 * configureContainer({ debug: import.meta.env.DEV });
 *
 * // Customize disposal timing
 * configureContainer({
 *   baseDisposalDelay: 10_000,
 *   hotDisposalDelay: 30_000,
 *   maxEntries: 200,
 * });
 * ```
 */
export function configureContainer(options: ContainerConfig): void {
    if (typeof options.debug === 'boolean') debugEnabled = options.debug;
    if (typeof options.baseDisposalDelay === 'number') CONFIG.BASE_DISPOSAL_DELAY = options.baseDisposalDelay;
    if (typeof options.hotDisposalDelay === 'number') CONFIG.HOT_DISPOSAL_DELAY = options.hotDisposalDelay;
    if (typeof options.veryHotDisposalDelay === 'number') CONFIG.VERY_HOT_DISPOSAL_DELAY = options.veryHotDisposalDelay;
    if (typeof options.hotThreshold === 'number') CONFIG.HOT_THRESHOLD = options.hotThreshold;
    if (typeof options.veryHotThreshold === 'number') CONFIG.VERY_HOT_THRESHOLD = options.veryHotThreshold;
    if (typeof options.maxEntries === 'number') CONFIG.MAX_ENTRIES = options.maxEntries;
}

// ======================================================
// GLOBAL CACHE REGISTRY + DISPOSAL SIGNALING PIPELINE
// ======================================================

const _registry = new Map<string, RegistryEntry<object>>();
const disposalRequests = new Subject<DisposalRequest>();
const cancelDisposal = new Subject<string>();

const CONFIG = {
    BASE_DISPOSAL_DELAY: 5000,
    HOT_DISPOSAL_DELAY: 10000,
    VERY_HOT_DISPOSAL_DELAY: 30000,
    HOT_THRESHOLD: 5,
    VERY_HOT_THRESHOLD: 10,
    MAX_ENTRIES: 100
};

function getDisposalDelay(entry: RegistryEntry<object>): number {
    if (entry.usageCount >= CONFIG.VERY_HOT_THRESHOLD) return CONFIG.VERY_HOT_DISPOSAL_DELAY;
    if (entry.usageCount >= CONFIG.HOT_THRESHOLD) return CONFIG.HOT_DISPOSAL_DELAY;
    return CONFIG.BASE_DISPOSAL_DELAY;
}

function trimRegistry() {
    if (_registry.size <= CONFIG.MAX_ENTRIES) return;

    const candidates: Array<{ key: string; entry: RegistryEntry<object> }> = [];

    for (const [key, entry] of _registry.entries()) {
        if (entry.refCount <= 0) candidates.push({key, entry});
    }

    if (candidates.length === 0) return;

    candidates.sort((a, b) => a.entry.lastUsed - b.entry.lastUsed);

    for (const {key, entry} of candidates) {
        if (_registry.size <= CONFIG.MAX_ENTRIES) break;

        try {
            entry.instance.dispose?.();
        } catch { /* intentionally empty */
        }

        _registry.delete(key);

        if (debugEnabled) console.log(`[TRIM] LRU evicted: ${key}`);
    }
}

disposalRequests
    .pipe(
        mergeMap(({key, entry, delay}) =>
            timer(delay).pipe(
                takeUntil(cancelDisposal.pipe(filter((k) => k === key))),
                map(() => ({key, entry}))
            )
        )
    )
    .subscribe(({key, entry}) => {
        // entry identity (not just key) must match — a stale timer from a
        // previously-evicted entry at the same key must never dispose a
        // newer entry that has since taken that key's place.
        const current = _registry.get(key);
        if (!current || current !== entry || current.refCount > 0) return;

        try {
            current.instance.dispose?.();
        } catch {
            if (debugEnabled) console.warn(`[DISPOSE-ERROR] ${key}`);
        }

        _registry.delete(key);

        if (debugEnabled) console.log(`[DISPOSE] ${key}`);
    });

function groupLog(event: string, key: string, entry: RegistryEntry<object>) {
    if (!debugEnabled) return;
    console.groupCollapsed(`[${event}] ${key}`);
    console.table({
        event,
        key,
        refCount: entry.refCount,
        usageCount: entry.usageCount,
        createdAt: new Date(entry.createdAt).toLocaleString(),
        lastUsed: new Date(entry.lastUsed).toLocaleString()
    });
    console.groupEnd();
}

function getOrCreateEntry<TData, TError, TResult extends object>(
    key: string,
    create: (query: UseQueryResult<TData, TError>) => TResult
): RegistryEntry<TResult> {
    let entry = _registry.get(key) as RegistryEntry<TResult> | undefined;

    if (!entry) {
        const query = useQuery(async () => null) as unknown as UseQueryResult<TData, TError>;
        const instance = create(query);
        const now = Date.now();

        entry = {
            instance,
            refCount: 0,
            createdAt: now,
            lastUsed: now,
            usageCount: 0
        };

        _registry.set(key, entry);
        trimRegistry();

        groupLog('INIT', key, entry);
    } else {
        groupLog('REUSE', key, entry);
    }

    return entry;
}

function useEntry<T extends object>(key: string, entry: RegistryEntry<T>) {
    const now = Date.now();

    entry.refCount++;
    entry.usageCount++;
    entry.lastUsed = now;

    cancelDisposal.next(key);

    groupLog('REF++', key, entry);
}

/**
 * Create a keyed, ref-counted, auto-disposed query singleton. Called in two
 * steps: `defineQuery<TData, TError>(key)` returns a factory-accepting
 * function. The factory receives a pre-created query instance typed as
 * `UseQueryResult<TData, TError>` — call `.handler()` to set the executor and
 * `.setRelations()` to attach relation configs, then return the query.
 * Relation types are inferred from the factory's return value.
 *
 * (The curried form is required: a trailing defaulted generic would swallow
 * inference of the relation map from the factory's return type.)
 *
 * Subsequent calls with the same `key` return the cached instance (ref-count
 * incremented). When all consumer scopes tear down, the instance is disposed
 * after an adaptive delay (see {@link configureContainer}).
 *
 * @typeParam TData - The query's data type (e.g. `Market[]`).
 * @typeParam TError - The query's custom error type (defaults to `unknown`).
 * @param key - Unique string key for the singleton cache.
 * @returns A function that receives the configuring factory and returns an
 * accessor yielding the shared query instance.
 *
 * @example
 * ```ts
 * import { defineQuery } from '@reactive/state';
 * import { type Market } from './markets.model';
 * import { fetchMarkets } from './markets.repository';
 *
 * export const useMarketsQuery = defineQuery<Market[], Error>('markets')((query) => {
 *   query.handler(async ({ signal }) => {
 *     const res = await fetch('/api/markets', { signal });
 *     return res.json();
 *   }, 'FIFO');
 *
 *   return query.setRelations({
 *     baseCurrency: {
 *       sourceQuery: useCurrenciesQuery,
 *       foreignKey: (market) => market.baseCurrencyId,
 *       keySelector: (currency) => currency.id,
 *     },
 *   });
 * });
 *
 * // Usage in a component:
 * const marketsQuery = useMarketsQuery();
 * marketsQuery.execute();
 * marketsQuery.data$.subscribe((data) => console.log(data));
 * ```
 */
export function defineQuery<TData = unknown, TError = unknown>(key: string) {
    return <TResult extends object>(
        factory: QueryFactory<TData, TError, TResult>
    ): (() => DefinedQueryResult<TResult>) => {
        return () => {
            const entry = getOrCreateEntry<TData, TError, TResult>(key, factory);
            useEntry(key, entry);

            // The facade is built once per registry entry and then reused.
            // Spreading `entry.instance` on every accessor call would hand back
            // a brand-new object each time, breaking the documented "same key
            // returns the same instance" contract and defeating referential
            // equality checks in framework dependency arrays.
            if (!entry.facade) {
                const sweep = () => {
                    entry.refCount--;
                    groupLog('REF--', key, entry);

                    if (entry.refCount <= 0) {
                        const delay = getDisposalDelay(entry);
                        disposalRequests.next({key, entry, delay});
                        groupLog('WILL-DISPOSE', key, entry);
                    }
                };

                entry.facade = {...entry.instance, sweep};
            }

            onScopeDispose(() => (entry.facade as { sweep: () => void }).sweep());

            return entry.facade as DefinedQueryResult<TResult>;
        };
    };
}

/**
 * @internal Test-only accessor. Returns the raw registry entry for a key, or
 * `undefined` if no entry exists. Not part of the public API.
 */
export function _getRegistryEntry(key: string): {
    instance: unknown;
    refCount: number;
    usageCount: number
} | undefined {
    const entry = _registry.get(key);
    if (!entry) return undefined;
    return {instance: entry.instance, refCount: entry.refCount, usageCount: entry.usageCount};
}

/**
 * @internal Test-only. Removes and disposes the entry at `key` from the
 * registry, simulating what `trimRegistry` does. Not part of the public API.
 */
export function _evictRegistryEntry(key: string): void {
    const entry = _registry.get(key);
    if (!entry) return;
    try {
        entry.instance.dispose?.();
    } catch { /* intentionally empty */
    }
    _registry.delete(key);
}
