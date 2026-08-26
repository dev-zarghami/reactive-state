import { Subject, timer } from 'rxjs';
import { filter, takeUntil, map, mergeMap } from 'rxjs/operators';
import { onScopeDispose } from './lifecycle';

type QueryFactory<T extends object> = () => T;

/**
 * Internal registry entry storing:
 * - instance       → the created query object
 * - refCount       → number of active consumers currently using it
 * - createdAt      → timestamp when entry was created
 * - lastUsed       → timestamp of most recent usage
 * - usageCount     → total usage count used for adaptive disposal delay
 */
type RegistryEntry<T extends object> = {
  instance: T & { dispose?: () => void };
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

// ======================================================
// DEBUG (opt-in)
// ======================================================

let debugEnabled = false;

/** Toggle the container's diagnostic logging (INIT/REUSE/REF±/DISPOSE/TRIM). */
export function configureContainer(options: { debug?: boolean }): void {
  if (typeof options.debug === 'boolean') debugEnabled = options.debug;
}

// ======================================================
// GLOBAL CACHE REGISTRY + DISPOSAL SIGNALING PIPELINE
// ======================================================

/**
 * Main in-memory registry:
 * key → { instance, metadata }
 */
const _registry = new Map<string, RegistryEntry<object>>();

/**
 * RxJS subjects:
 * - disposalRequests → entries scheduled for disposal
 * - cancelDisposal   → signals that a previously scheduled disposal must be cancelled
 */
const disposalRequests = new Subject<DisposalRequest>();
const cancelDisposal = new Subject<string>();

/**
 * Centralized configuration for adaptive disposal and LRU trimming.
 */
const CONFIG = {
  BASE_DISPOSAL_DELAY: 5000, // default disposal delay for low-usage entries
  HOT_DISPOSAL_DELAY: 10000, // delay for moderately-used entries
  VERY_HOT_DISPOSAL_DELAY: 30000, // delay for heavily-used entries

  HOT_THRESHOLD: 5, // usageCount >= 5 → hot
  VERY_HOT_THRESHOLD: 10, // usageCount >= 10 → very hot

  MAX_ENTRIES: 100 // soft limit for registry size
} as const;

// ======================================================
// ADAPTIVE DISPOSAL DELAY + LRU-STYLE TRIMMING
// ======================================================

/**
 * Determines disposal delay based on usageCount.
 * The more frequently an instance is used, the longer we keep it alive.
 */
function getDisposalDelay(entry: RegistryEntry<object>): number {
  if (entry.usageCount >= CONFIG.VERY_HOT_THRESHOLD) return CONFIG.VERY_HOT_DISPOSAL_DELAY;
  if (entry.usageCount >= CONFIG.HOT_THRESHOLD) return CONFIG.HOT_DISPOSAL_DELAY;
  return CONFIG.BASE_DISPOSAL_DELAY;
}

/**
 * LRU trimming to keep registry size under MAX_ENTRIES.
 * Removes the least recently used entries *only if* they have no active users.
 */
function trimRegistry() {
  if (_registry.size <= CONFIG.MAX_ENTRIES) return;

  const candidates: Array<{ key: string; entry: RegistryEntry<object> }> = [];

  for (const [key, entry] of _registry.entries()) {
    if (entry.refCount <= 0) candidates.push({ key, entry });
  }

  if (candidates.length === 0) return;

  // Sort unused entries by lastUsed (oldest first)
  candidates.sort((a, b) => a.entry.lastUsed - b.entry.lastUsed);

  // Remove until registry is back under limit
  for (const { key, entry } of candidates) {
    if (_registry.size <= CONFIG.MAX_ENTRIES) break;

    try {
      entry.instance.dispose?.();
    } catch { /* intentionally empty */ }

    _registry.delete(key);

    if (debugEnabled) console.log(`[TRIM] LRU evicted: ${key}`);
  }
}

// ======================================================
// CENTRAL DISPOSAL PIPELINE (RxJS)
// ------------------------------------------------------
// Each disposal request schedules a timer.
// If cancelDisposal emits the same key before the timer ends,
// the disposal is aborted.
// ======================================================

disposalRequests
  .pipe(
    mergeMap(({ key, entry, delay }) =>
      timer(delay).pipe(
        takeUntil(cancelDisposal.pipe(filter((k) => k === key))),
        map(() => ({ key, entry }))
      )
    )
  )
  .subscribe(({ key }) => {
    // Only dispose if the entry still exists and is unused
    if (!_registry.has(key)) return;

    const current = _registry.get(key);
    if (!current || current.refCount > 0) return;

    try {
      current.instance.dispose?.();
    } catch { /* intentionally empty */ }

    _registry.delete(key);

    if (debugEnabled) console.log(`[DISPOSE] ${key}`);
  });

// ======================================================
// DEBUG LOGGING
// ======================================================

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

// ======================================================
// CORE REGISTRY OPERATIONS
// ======================================================

/**
 * Retrieves an entry by key or creates a new instance via factory().
 */
function getOrCreateEntry<T extends object>(key: string, create: () => T): RegistryEntry<T> {
  let entry = _registry.get(key) as RegistryEntry<T> | undefined;

  if (!entry) {
    const instance = create();
    const now = Date.now();

    entry = {
      instance,
      refCount: 0,
      createdAt: now,
      lastUsed: now,
      usageCount: 0
    };

    _registry.set(key, entry);
    trimRegistry(); // ensure registry stays bounded

    groupLog('INIT', key, entry);
  } else {
    groupLog('REUSE', key, entry);
  }

  return entry;
}

/**
 * Marks the entry as actively used.
 * - increments refCount
 * - increments usageCount
 * - refreshes lastUsed timestamp
 * - cancels any ongoing disposal timer
 */
function useEntry<T extends object>(key: string, entry: RegistryEntry<T>) {
  const now = Date.now();

  entry.refCount++;
  entry.usageCount++;
  entry.lastUsed = now;

  cancelDisposal.next(key);

  groupLog('REF++', key, entry);
}

// ======================================================
// defineQuery: keyed, refcounted, auto-disposed query factory
// ------------------------------------------------------
// Returns an accessor that yields a shared instance, increments usage/refCount,
// and wires disposal into the active consumer scope via the lifecycle adapter.
// ======================================================

export function defineQuery<T extends object>(key: string, factory: QueryFactory<T>): () => T {
  return () => {
    const entry = getOrCreateEntry<T>(key, factory);
    useEntry(key, entry);

    // Release the ref when the active consumer scope tears down.
    onScopeDispose(() => {
      entry.refCount--;
      groupLog('REF--', key, entry);

      if (entry.refCount <= 0) {
        const delay = getDisposalDelay(entry);
        disposalRequests.next({ key, entry, delay });
        groupLog('WILL-DISPOSE', key, entry);
      }
    });

    return entry.instance;
  };
}
