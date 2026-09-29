# AGENTS.md

## What this is

`@reactive/state` — private npm package (`version 0.0.1`, `"private": true`, `publishConfig.access: public`): an RxJS reactive query engine (`useQuery`) plus a keyed singleton container (`defineQuery`) and a relation/join system.

- **No framework adapters ship.** `src/adapters/` was deleted in HEAD (`remove modules`). Lifecycle is user-supplied via `setLifecycleAdapter()` — the four example apps are the reference implementations.
- Git repo **does** exist (`main`, `origin/main`), but there is **no CI** — verification is local only.
- `CLAUDE.md` is **stale** (documents the deleted `src/adapters/svelte|vue|react`, and a `file:/home/.../dist` dependency). `README.md` is current. Trust source over both.

## Commands

Root uses **pnpm** (`pnpm-lock.yaml` is authoritative). `node_modules` is not committed — run `pnpm install` first.

```bash
pnpm lint && pnpm check-types && pnpm test && pnpm build    # full verification
pnpm dev                                                      # tsup --watch
pnpm test src/core/useQuery.test.ts -t "executes tasks in order"
```

Root also drives the examples, via `npm run --prefix` (the examples are npm projects; root is pnpm):

```bash
pnpm server                 # fake API on :4000 — start this BEFORE any example app
pnpm example:react          # next dev -p 4100
pnpm example:vue            # vite
pnpm example:svelte         # vite (SvelteKit)
pnpm example:angular        # ng serve
pnpm check:examples         # typecheck all four: svelte-check -> react tsc -> vue-tsc -> ng build
pnpm install:examples       # npm install in each example (never pnpm there)
```

- `pnpm lint` = `eslint src` — examples are **not** linted.
- `pnpm check-types` = `tsc --noEmit`; `tsconfig.json` `include` is only `src/**/*` — examples are **not** typechecked from the root. Verify them from their own directories.
- Tests: `vitest run`, `include: ['src/**/*.test.ts']`, colocated in `src/core/`. Coverage: `useQuery.test.ts` (strategies, execute callbacks, cancel/reset/dispose, setters, `.with()` stream stability), `queryContainer.test.ts` (singleton, refcounting, disposal-timer race), `lifecycle.test.ts` (delegation). **No tests** for delayed disposal timing, LRU trimming, or actual relation join output.

## Pre-existing failures (verified — not caused by you)

1. `pnpm check-types` → `src/core/lifecycle.test.ts(7,30): error TS2307: Cannot find module '../adapters/react'`. That import no longer exists, so the whole file fails to load and `pnpm test` reports `Failed Suites 1`.
2. `pnpm test` → `queryContainer.test.ts` › "returns the same instance for the same key" fails. `defineQuery`'s accessor returns a **fresh spread** `{...entry.instance, sweep}` on every call (`src/core/queryContainer.ts:295`), so `toBe` identity can never hold even though the registry entry is shared. 36 tests pass, 1 fails.

`pnpm build` succeeds.

## Gotchas an agent will hit

- **Container debug logging is ON by default** — `let debugEnabled = true` (`src/core/queryContainer.ts:30`), contradicting both the JSDoc and the README table (which say `false`). This floods `pnpm test` output with `console.table` blocks. Every example calls `configureContainer({ debug: ... })` explicitly at startup; do the same or flip the source default.
- **CJS entry is broken.** `package.json` `require` → `./dist/index.cjs`, but tsup emits `dist/index.js` (verified). Fix before relying on `require()` or publishing.
- **There is no root `.gitignore`.** `node_modules/` and `dist/` show up as untracked; never `git add .`. Each `examples/*/` has its own.
- **`pnpm-workspace.yaml` is not a workspace** — it only contains `allowBuilds: { esbuild: true }`. The five example projects are independent npm projects, not members.
- **Lockfile hazard:** root has both `pnpm-lock.yaml` (authoritative) and a stray npm `package-lock.json`. Examples are npm-only. Never regenerate one lockfile with the other package manager.
- **Stale manifest entries:** `svelte` is a non-optional `peerDependency` and `vue` optional, but `src/` imports no framework. `decimal.js` and `valibot` are declared `dependencies` yet unused by `src/` (valibot is only used in `examples/`, and is tsup-`external`). `fake-indexeddb` is an unused devDep. Fixing these changes the published surface.
- `"sideEffects": false` conflicts with `queryContainer.ts`, which runs a module-level RxJS disposal-timer pipeline at import time.
- `src/example.ts` is a commented design sketch, not executable code.
- tsconfig is `strict`, ES2022, `moduleResolution: bundler`. ESLint errors on unused vars except `^_`-prefixed args.

## Architecture

- `src/index.ts` is the only entry; `tsup.config.ts` builds only `src/index.ts` and `package.json` exports only `"."`. Keep all three aligned if adding entries. It also exports the internal `_getRegistryEntry` / `_evictRegistryEntry` test helpers.
- **`src/core/useQuery.ts`** — the whole engine, relations included.
  - `useQuery(executor, strategy)` with `'FIFO'` (default) | `'LIFO'` (aborts queued work, runs newest) | `'WAIT'` (ignores new work while the queue is non-empty). Each task gets its own `AbortController`; the signal is spread into the executor context together with `execute()`'s input.
  - `data$` / `error$` / `loading$` (BehaviorSubjects) plus `setData` / `setError` / `setLoading`; `handler(exec, strat?)` swaps the executor and is chainable; `execute([input][, {next,error,complete}])`, `cancel`, `reset`, `dispose`. `dispose()` aborts and completes every subject — the instance is unusable afterward.
  - **Stream identity matters.** `data$.with(keys)` results are memoized per relation controller keyed by the *sorted* key set (`useQuery.ts:431`), so repeated calls return the same observable. Passing a stream built per render (e.g. `.pipe(...)` inline) into a `useStream`-style hook causes "Maximum update depth exceeded". `setRelations()` replaces the controller and therefore **invalidates all previously obtained streams**.
  - `setRelations()` attaches enumerable lazy getters resolved against the latest related emission; `sourceQuery` factories are cached by function identity and auto-executed once while empty; `includeDefault` folds a relation into plain `data$`. `DataSubject` is exported.
- **`src/core/queryContainer.ts`** — process-global keyed singleton registry.
  - `defineQuery<TData, TError>(key)(factory)` is **curried on purpose**: a single-call `defineQuery(key, factory)` with a defaulted `TResult` generic swallows inference of the relation map from the factory's return type (zustand `create<T>()(...)` pattern). Do not "simplify" it.
  - The factory receives a pre-created `useQuery(async () => null)` typed `UseQueryResult<TData, TError>` — configure via `.handler()` / `.setRelations()` and return it.
  - Each accessor call refcount++s and registers `onScopeDispose(sweep)`. When the count hits 0, disposal is scheduled after 5 s / 10 s / 30 s depending on `usageCount` (thresholds 5 / 10). Above 100 entries, `trimRegistry()` LRU-evicts only entries with `refCount <= 0`. The timer callback re-checks **entry identity**, not just key (`queryContainer.ts:156`) so a stale timer can't dispose a newer entry that took the same key.
  - `configureContainer({ debug, baseDisposalDelay, hotDisposalDelay, veryHotDisposalDelay, hotThreshold, veryHotThreshold, maxEntries })` merges into module-level config.
- **`src/core/lifecycle.ts`** — one process-global `LifecycleAdapter`. `onScopeDispose(cb)` returns `false` and `console.warn`s **once** when no adapter/scope is active, and keeps no fallback → the caller owns `dispose()` / `sweep()`.

## Examples (`examples/`, five independent npm projects)

`examples/queries/` is the shared, hand-written core: Valibot DTOs → domain models → repositories → `defineQuery` factories with market↔currency relations. All four UI apps import it, and all import the root package by relative source path (`'../../../src'`, or `'../../../../src'` in svelte) — nothing depends on `@reactive/state` or `dist/`, so no root build is needed and source edits are live.

**The examples need the fake API server running.** `examples/server/` is a local Express stand-in for `https://api.ompfinex.com` (same `/v3/currencies` + `/v2/market` paths, same `{ status, data }` envelope, open CORS). Start it with `pnpm server` from the root; it listens on **4000** (`PORT` overrides). `examples/queries/api.ts` `BASE_URL` points at it — the real URL is one commented line above. An agent changing a DTO or fixture should read `examples/server/README.md`: every DTO field is wrapped in `v.fallback(...)`, so malformed rows **silently degrade instead of throwing**, and three schema fields disagree with the real upstream payload (`color` needs a `#` prefix, `status` must be the string `"LISTED"` not `0`, `listedAt` must be `null`).

All four apps typecheck clean as of this writing (`pnpm check:examples`). Keep them compiling when the API changes; they are the working reference.

- **svelte** (`SvelteKit`, npm lockfile) — `npm run check` (svelte-check), `lint` = `prettier --check . && eslint .`, `build`, `dev`. Adapter + `configureContainer` in `src/routes/+layout.svelte` via `onDestroy`.
- **react** (`Next.js 16.3` App Router) — `next dev -p 4100`; typecheck via the `typecheck` script (`tsc --noEmit`). `next.config.ts` sets `reactStrictMode: false` deliberately — StrictMode's double-invoked effects would `sweep()` twice and corrupt the refcount, so don't turn it back on. React has no scope model: pages call `query.sweep()` in effect cleanup. This app has an auto-generated `AGENTS.md` — `next dev` rewrites it — which says this Next version has breaking changes; read `examples/react/node_modules/next/dist/docs/` before editing Next code.
- **vue** (`Vite` + `vue-router`) — `npm run type-check` (`vue-tsc --build`). Adapter in `src/main.ts` using `getCurrentScope()` / `onScopeDispose`.
- **angular** (`Angular 22`, client-only, no SSR, no `zone.js`, no test framework) — `npm run build` (`ng build`, which also typechecks). Adapter in `src/main.ts` uses `inject(DestroyRef)` in a try/catch; it resolves only because `defineQuery` accessors are called from field initializers (injection context). `angular.json` sets `ng serve` to **port 4100**.

**All four dev servers bind port 4100** (react `-p 4100`, svelte + angular in config, vue auto-increments to 4101+ when it loses the race) — run only one at a time. A stale dev server left running makes the next one silently bind a *different* port, so check `ss -ltn | grep 410` before blaming a config.

