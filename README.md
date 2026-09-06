# @reactive/state

An RxJS-based reactive query engine with a keyed singleton container and a relation system for joining related data.

Built on [RxJS](https://rxjs.dev). Framework-agnostic — it integrates with a UI framework through a small, user-supplied lifecycle adapter.

## Table of contents

- [Installation](#installation)
- [Concepts](#concepts)
- [Quick start](#quick-start)
- [Core API](#core-api)
  - [`useQuery`](#usequery)
  - [`UseQueryResult`](#usequeryresult)
  - [`data$`](#data)
  - [Strategies](#strategies)
  - [Execute callbacks](#execute-callbacks)
  - [Manual setters](#manual-setters)
- [Keyed singletons with `defineQuery`](#keyed-singletons-with-definequery)
- [Relations](#relations)
  - [`setRelations`](#setrelations)
  - [`data$.with`](#datawith)
  - [`includeDefault`](#includedefault)
- [Lifecycle management](#lifecycle-management)
  - [Lifecycle adapter](#lifecycle-adapter)
  - [`onScopeDispose`](#onscopedispose)
- [Container configuration](#container-configuration)
- [Framework integration](#framework-integration)
- [Development](#development)

## Installation

```bash
npm install @reactive/state
# or
pnpm add @reactive/state
```

`rxjs` is a hard dependency.

## Concepts

The package provides three layers:

1. **`useQuery`** — a reactive primitive that runs an async function (executor), exposes its result, error, and loading state as RxJS observables, and supports an execution queue with abort control.
2. **Relations** — join related queries so each item in your data automatically carries a lazily resolved related value.
3. **`defineQuery`** — a process-global, keyed, ref-counted singleton registry that caches query instances and disposes them automatically when no scope needs them anymore.

The engine is framework-agnostic. It only needs a small **lifecycle adapter** (a function you supply that knows how to run a cleanup when your component scope tears down) to know when to release and dispose cached queries.

## Quick start

```ts
import { useQuery } from '@reactive/state';

type User = { id: string; name: string };

const users = useQuery<User[]>(async ({ signal }) => {
  const res = await fetch('/api/users', { signal });
  return res.json();
}, 'FIFO');

// Subscribe to data, error, and loading
users.data$.subscribe((data) => console.log(data));
users.error$.subscribe((err) => console.error(err));
users.loading$.subscribe((loading) => console.log('loading', loading));

// Trigger execution
users.execute();
```

## Core API

### `useQuery`

```ts
useQuery<TData, TError, TInput>(
  executor,
  strategy?
): UseQueryResult<TData, TError, Record<never, never>, TInput>
```

Creates a reactive query. `TData` is the data type returned by the executor, `TError` a custom error type, and `TInput` an optional input object spread into the executor context.

**`executor`** receives `{ signal, ...input }` and returns a `Promise<TData | null>`. Returning `null` clears the data stream. The `signal` is an `AbortController` signal that is aborted when the task is cancelled.

**`strategy`** controls how concurrent executions are queued — see [Strategies](#strategies).

Examples:

```ts
// Basic
const query = useQuery<User[]>(async ({ signal }) =>
  fetch('/api/users', { signal }).then((r) => r.json())
);

// With input and LIFO strategy
const userQuery = useQuery<User, Error, { id: string }>(
  async ({ signal, id }) =>
    fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
  'LIFO'
);
userQuery.execute({ id: '42' });
```

### `UseQueryResult`

The object returned by `useQuery` (and by calling a `defineQuery` accessor).

| Property | Type | Description |
|----------|------|-------------|
| `data$` | `QueryDataStream<TData, TRelations>` | Reactive data stream. See [data$](#data). |
| `error$` | `Observable<TError \| Error \| null>` | Emits the current error, or `null`. |
| `loading$` | `Observable<boolean>` | Emits `true` while a task is executing. |
| `execute` | `(input?, callbacks?) => void` | Enqueue a task for execution. |
| `cancel` | `() => void` | Abort the currently running task's signal. |
| `reset` | `() => void` | Clear `data$`, `error$` and set `loading$` to `false`. |
| `dispose` | `() => void` | Complete all internal subjects and abort running work. The query cannot be reused. |
| `handler` | `(executor, strategy?) => result` | Replace the executor and optionally the strategy. Chainable. |
| `setRelations` | `(relations) => result` | Attach relation configs. See [Relations](#relations). |
| `setData` | `(data) => void` | Push a value into `data$` directly. |
| `setError` | `(error) => void` | Push a value into `error$` directly. |
| `setLoading` | `(status) => void` | Push a value into `loading$` directly. |

### `data$`

`data$` is a `QueryDataStream` — a wrapper around an RxJS `Observable`.

```ts
// Subscribe to updates
query.data$.subscribe((data) => console.log(data));

// Get the current value synchronously
const current = query.data$.getValue();
const same = query.data$.value;

// Pipe like any observable
query.data$.pipe(map((d) => d?.length)).subscribe((n) => console.log(n));

// Join related data (see Relations)
query.data$.with(['baseCurrency']).subscribe((rows) => console.log(rows));
```

In Svelte, `Subscription` satisfies Svelte's store contract, so you can auto-subscribe in templates:

```svelte
{$query.data$}
```

### Strategies

| Strategy | Behavior |
|----------|----------|
| `'FIFO'` | Tasks run in submission order (default). |
| `'LIFO'` | New tasks abort all pending work and run immediately. |
| `'WAIT'` | New tasks are ignored while one is already running. |

```ts
const q1 = useQuery(fetchOne, 'FIFO');  // sequential
const q2 = useQuery(fetchLatest, 'LIFO'); // always use latest
const q3 = useQuery(fetchOnce, 'WAIT');   // don't overlap
```

### Execute callbacks

Pass callbacks to `execute` for per-task feedback:

```ts
query.execute(undefined, {
  next: (data) => console.log('loaded', data),
  error: (err) => console.error('failed', err),
  complete: () => console.log('done'),
});
```

Execute callbacks are declared by the `ExecCallbacks` type:

```ts
type ExecCallbacks<TData, TError> = {
  next?: (value: TData) => void;
  error?: (err: TError | Error) => void;
  complete?: () => void;
};
```

### Manual setters

`setData`, `setError`, and `setLoading` push values directly into the corresponding streams. Useful for optimistic updates, cache seeding, or imperative control.

## Keyed singletons with `defineQuery`

`defineQuery` returns an **accessor function**. Calling the accessor yields a shared, cached query instance — and increments a ref count. When every scope that called it tears down (via the lifecycle adapter), the instance is disposed after an adaptive delay.

```ts
import { defineQuery } from '@reactive/state';

export const useCurrenciesQuery = defineQuery<Currency[], Error>('currencies')((query) => {
    query.handler(async ({ signal }) => {
      const res = await fetch('/api/currencies', { signal });
      return res.json();
    }, 'FIFO');

    return query;
});
```

The factory receives a pre-created query instance typed from `defineQuery`'s `TData`/`TError` parameters. Use `query.handler(...)` to set the executor and `query.setRelations(...)` to attach relations, then return the query.

Usage in a component:

```ts
// Each call returns the same shared instance + increments ref count
const currencies = useCurrenciesQuery();

onMount(() => currencies.execute());
onDestroy(() => currencies.cancel()); // disposal is handled by the container
```

Key characteristics:

- **Shared**: the same `key` always yields the same instance process-wide.
- **Ref-counted**: each accessor call registers a cleanup on the active scope.
- **Auto-disposed**: when ref count reaches 0, disposal is scheduled with an adaptive delay (5 s / 10 s / 30 s based on usage, configurable).
- **LRU bounded**: the registry softly caps at 100 entries (`maxEntries`), evicting unused entries.

## Relations

Relations let you join the data of one query with the data of another, so each item lazily exposes related objects without manual lookups.

### `setRelations`

Attach relation configs. Each entry maps a relation name to its source and join keys.

```ts
export const useMarketsQuery = defineQuery<Market[], Error>('markets')((query) => {
  query.handler(async ({ signal }) => {
    const res = await fetch('/api/markets', { signal });
    return res.json();
  }, 'FIFO');

  return query.setRelations({
    baseCurrency: {
      sourceQuery: useCurrenciesQuery,
      foreignKey: (market: Market) => market.baseCurrencyId,
      keySelector: (currency: Currency) => currency.symbol,
    },
    quoteCurrency: {
      sourceQuery: useCurrenciesQuery,
      foreignKey: (market: Market) => market.quoteCurrencyId,
      keySelector: (currency: Currency) => currency.symbol,
    },
  });
});
```

- **`sourceQuery`** — an accessor to the related query (`defineQuery` result). When its data is empty, the source query is auto-executed once.
- **`foreignKey`** — given a parent item, returns the key used to find the related item.
- **`keySelector`** — given a related item, returns its key.
- **`source`** — alternatively, an explicit stream instead of / in addition to `sourceQuery`.
- **`includeDefault`** — fold this relation into the default `data$` stream (see below).

### `data$.with`

Request a joined stream that includes specific relations:

```ts
// Only join baseCurrency
const withBase = query.data$.with(['baseCurrency']);

// Join both
const withBoth = query.data$.with(['baseCurrency', 'quoteCurrency']);
```

Each item in the resulting stream carries the relation as a lazily-resolved getter:

```ts
row.baseCurrency?.nameEn ?? row.baseCurrencyId
row.quoteCurrency?.nameEn ?? row.quoteCurrencyId
```

Relations are resolved against the latest emission of the source query, so they stay reactive as the source updates.

### `includeDefault`

Set `includeDefault: true` on a relation to always include it in the default `data$` stream — no `.with()` needed:

```ts
query.setRelations({
  user: {
    sourceQuery: useUsersQuery,
    foreignKey: (post) => post.userId,
    keySelector: (user) => user.id,
    includeDefault: true,
  },
});

// `data$` already has `.user` on each post
query.data$.subscribe((posts) => console.log(posts[0].user));
```

## Lifecycle management

The engine never imports a UI framework. It relies on a **lifecycle adapter** to know when the current "scope" (a Svelte component, a Vue effect scope, …) is destroyed, so it can release ref counts and dispose cached queries.

### Lifecycle adapter

Install an adapter once at app startup. The adapter bridges your framework's component lifecycle to the container's ref-counting system.

```ts
import { setLifecycleAdapter } from '@reactive/state';
import { onDestroy } from 'svelte';

setLifecycleAdapter({
  onScopeDispose(cleanup) {
    try {
      onDestroy(cleanup);
      return true;
    } catch {
      return false; // not inside a component
    }
  },
});
```

`LifecycleAdapter`:

```ts
interface LifecycleAdapter {
  onScopeDispose(cleanup: Cleanup): boolean;
}
```

`onScopeDispose` must be called synchronously during a scope's setup and returns `false` when no active scope exists — letting callers fall back to manual disposal.

### `onScopeDispose`

```ts
const bound = onScopeDispose(() => {
  // runs when the scope is destroyed
});

// returns false when no adapter/scope is installed
if (!bound) {
  // you own disposal — call query.dispose() yourself
}
```

## Container configuration

`configureContainer` tunes the singleton registry's debug logging, disposal delays, and LRU trimming.

```ts
import { configureContainer } from '@reactive/state';

configureContainer({
  debug: import.meta.env.DEV,           // log INIT/REUSE/REF±/DISPOSE/TRIM
  baseDisposalDelay: 10_000,            // low-usage entries      (default 5000)
  hotDisposalDelay: 30_000,             // usageCount >= hotThreshold (default 10000)
  veryHotDisposalDelay: 60_000,         // usageCount >= veryHotThreshold (default 30000)
  hotThreshold: 7,                      // default 5
  veryHotThreshold: 15,                 // default 10
  maxEntries: 50,                       // default 100
});
```

`ContainerConfig`:

| Option | Default | Description |
|--------|---------|-------------|
| `debug` | `false` | Enable diagnostic logging. |
| `baseDisposalDelay` | `5000` | Disposal delay (ms) for low-usage entries. |
| `hotDisposalDelay` | `10000` | Delay for entries with `usageCount >= hotThreshold`. |
| `veryHotDisposalDelay` | `30000` | Delay for entries with `usageCount >= veryHotThreshold`. |
| `hotThreshold` | `5` | Usage count at which an entry is "hot". |
| `veryHotThreshold` | `10` | Usage count at which an entry is "very hot". |
| `maxEntries` | `100` | Soft cap on registry size; LRU trims unused entries above this. |

Call it once at app startup, typically in a root layout.

## Framework integration

Integrate with any UI framework by installing a lifecycle adapter once (usually in a root layout), then using `defineQuery` accessors in your components.

#### Svelte

```svelte
<!-- +layout.svelte -->
<script lang="ts">
	import { configureContainer, setLifecycleAdapter } from '@reactive/state';
	import { onDestroy } from 'svelte';

	configureContainer({ debug: import.meta.env.DEV });
	setLifecycleAdapter({
		onScopeDispose(cleanup) {
			try {
				onDestroy(cleanup);
				return true;
			} catch {
				return false;
			}
		},
	});
</script>
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { useMarketsQuery } from '$lib/queries/markets.query';

	const markets = useMarketsQuery();
	const marketsData$ = markets.data$.with(['baseCurrency', 'quoteCurrency']);

	onMount(() => markets.execute());
	onDestroy(() => markets.cancel()); // disposal is handled by the container
</script>

{$marketsData$?.map((row) => row.id).join(', ')}
```

In Svelte, a query's `Subscription` satisfies the Svelte store contract, so `$` auto-subscription works on `data$`, `error$`, and `loading$` directly.

#### Vue

```ts
import { setLifecycleAdapter } from '@reactive/state';
import { getCurrentScope, onScopeDispose as vueOnScopeDispose } from 'vue';

setLifecycleAdapter({
  onScopeDispose(cleanup) {
    if (!getCurrentScope()) return false;
    vueOnScopeDispose(cleanup);
    return true;
  },
});
```

#### React

React has no built-in scope model. Use the lifecycle adapter's `false` return to detect that no scope is active and dispose manually in `useEffect` cleanup / `useLayoutEffect`, or use `onScopeDispose` and handle the fallback yourself.

## Development

```bash
pnpm install
pnpm lint && pnpm check-types && pnpm test && pnpm build   # full verification
pnpm dev                                                     # tsup --watch
```

The Svelte example lives in `examples/svelte/` (separate npm package — run its commands from inside that directory).