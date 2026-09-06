# AGENTS.md

## What this is

`@reactive/state` — private npm package: RxJS-based reactive query engine (`useQuery`) with a keyed singleton container and a relation system. **No framework adapters ship anymore** — `src/adapters/` was deleted; the lifecycle adapter is user-supplied via `setLifecycleAdapter()` (see the examples' root layouts for the pattern).

- `package.json` exports only `"."` — no `./svelte` / `./vue` subpaths, and tsup builds only `src/index.ts`. Keep that alignment if adding entries.
- `peerDependencies` (svelte non-optional, vue optional) are stale — `src/` imports no framework. `decimal.js`/`valibot` are unused by root `src` (valibot only in examples); `fake-indexeddb` devDep is a leftover.
- No CI — verification is local only. No git repo either.

## Known-broken right now (pre-existing, not your doing)

- `src/core/lifecycle.test.ts` imports `reactAdapter` from `../adapters/react`, which no longer exists → that test file fails to load and `pnpm check-types` fails (TS2307).
- `queryContainer.test.ts` "returns the same instance for the same key" fails: `defineQuery` accessors return a fresh `{...instance, sweep}` wrapper object per call, so `toBe` identity fails across calls even though the registry entry is shared.

## Commands

Use pnpm (root `pnpm-lock.yaml` is authoritative). If `pnpm` isn't on PATH, `corepack pnpm` works. Full verification:

```bash
pnpm lint && pnpm check-types && pnpm test && pnpm build
```

```bash
pnpm test src/core/useQuery.test.ts -t "executes tasks in order"   # single file / test
```

Tests are colocated in `src/core/*.test.ts` (queue strategies, relation basics, container refcounting, lifecycle delegation). Delayed disposal, LRU trimming, and full relation joining lack direct tests.

### Examples (`examples/`, three independent npm projects)

Shared query modules live in `examples/queries/` (imported by all three apps via relative paths); the apps are svelte (SvelteKit), react (Next.js 16), and vue (Vite + vue-router). None depends on the package: all import the root package via **relative source paths** (`'../../../src'`) — no root build needed; source changes take effect directly. Keep them compiling when the API changes; they are the working reference. Only react/vue have typecheck scripts (`vue-tsc --build`, `tsc --noEmit`); svelte uses `check`.

- `examples/svelte/` — npm lockfile. Run from inside the dir: `dev` / `check` / `lint` (prettier check first) / `build`. Manual adapter install in `+layout.svelte`; queries via `defineQuery<T,E>(key)(factory)`; joins via `data$.with([...])`.
- `examples/react/` — Next.js 16 App Router, `next dev -p 4100`. It has its own Next-generated `AGENTS.md`: this Next version is newer than training data — consult `node_modules/next/dist/docs/` in that dir before editing it. React has no scope model; pages call `query.sweep()` manually.
- `examples/vue/` — npm; `type-check` runs `vue-tsc --build`. Adapter installed in `main.ts` via `getCurrentScope`/`onScopeDispose`.

**Lockfile hazard**: the repo root has *both* `pnpm-lock.yaml` (authoritative; node_modules is pnpm-managed) and a stray npm `package-lock.json`. The examples are npm-only. Never regenerate one lockfile with the other package manager. `pnpm-workspace.yaml` is **not** a workspace — it only contains esbuild build approval.

## Core architecture

- `src/core/useQuery.ts` — the whole engine: `useQuery(executor, strategy)` with `'FIFO' | 'LIFO' | 'WAIT'` (LIFO aborts pending work and runs newest; WAIT ignores new work while busy), per-task AbortControllers (signal passed to executor), `data$`/`error$`/`loading$` subjects plus manual setters `setData`/`setError`/`setLoading`, `handler(executor, strategy?)` to swap executor, `execute([input][, {next,error,complete}])/cancel/reset/dispose`. **Always dispose on teardown** — it aborts current work and completes all subjects.
- Stream identity matters for React: `data$.with(keys)` results are cached per relation controller (stable references across calls; key order irrelevant; `setRelations` replaces the controller and with it the streams). A stream object built per render (e.g. via `.pipe(...)`) passed to `useStream` loops ("Maximum update depth exceeded") — memoize it.
- Relations also live in useQuery.ts: `setRelations()` attaches enumerable lazy getters resolved against latest emissions; join via `data$.with(keys)` (`DataSubject`, exported); `sourceQuery` factories are cached by function identity and auto-executed once when empty; `includeDefault` folds a relation into plain `data$`.
- `src/core/queryContainer.ts` / `defineQuery<TData, TError>(key)(factory)` — process-global keyed singleton registry, **curried on purpose**: a single-call `defineQuery(key, factory)` with a defaulted `TResult` generic swallows inference of the relation map from the factory return (zustand `create<T>()(...)` pattern). The factory receives a pre-created `useQuery(async () => null)` instance typed `UseQueryResult<TData, TError>` (configure via `.handler()` / `.setRelations()`, then return it); each accessor call refcounts++ and returns `{...instance, sweep}` typed as `Omit<TResult, 'handler' | 'setRelations' | 'dispose'>` — `sweep()` decrements the refcount manually (the React-example pattern). Disposal scheduled adaptively after 5/10/30 s by usage tier; best-effort LRU trim above 100 entries; `configureContainer({debug, ...delays/thresholds/maxEntries})`.
- `src/core/lifecycle.ts` — one process-global `LifecycleAdapter`; `onScopeDispose(cb)` returns `false` when no adapter/scope is active and retains no fallback → caller owns `dispose()`.
- `src/example.ts` is a commented design sketch, not executable code. `CLAUDE.md` exists but is partially stale (references the deleted `src/adapters/*`); trust source over it.

## Packaging gotchas

- tsup emits CJS as `dist/*.js`, but package.json maps `require` to `dist/*.cjs`. The CJS entry is broken; reconcile before relying on `require()` or publishing.
- `queryContainer.ts` runs a module-level RxJS pipeline (disposal-timer subject) at import — relevant with `"sideEffects": false` and tree-shaking.

## Conventions

- ESLint errors on unused vars except `_`-prefixed args. TypeScript strict, ES2022 target, bundler moduleResolution.
