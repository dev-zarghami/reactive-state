# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package

`@reactive/state` is a private TypeScript package for framework-neutral reactive state. Core uses RxJS; optional subpath imports install Svelte or Vue lifecycle integration. React integration is currently a manual-disposal stub.

Naming and documentation are stale in places: `README.md` describes APIs that do not exist and uses `@omp/core`; source comments and warnings still mention `@package/logic`. Trust `package.json`, `src/index.ts`, and current source behavior.

## Commands

Use pnpm; root `pnpm-lock.yaml` is authoritative.

```bash
pnpm install
pnpm dev                 # tsup watch mode
pnpm build               # CJS + ESM bundles, declarations, sourcemaps in dist/
pnpm lint                # ESLint over src/
pnpm check-types         # tsc --noEmit
pnpm test                # all src/**/*.test.ts once
pnpm test:watch          # Vitest watch mode
pnpm test src/core/useQuery.test.ts
pnpm test src/core/useQuery.test.ts -t "executes tasks in order"
```

Full root verification:

```bash
pnpm lint && pnpm check-types && pnpm test && pnpm build
```

`examples/svelte` has its own manifest and lockfile; run commands from that directory:

```bash
pnpm dev
pnpm check
pnpm lint
pnpm build
```

The example depends on the root package through an absolute `file:/home/artin/Projects/packages/reactive-state/dist` path. Build the root package first. No example test script exists.

## Architecture

- `src/core/useQuery.ts` is the query engine. `useQuery(executor, strategy)` owns RxJS data/error/loading state, a task queue, per-task `AbortController`s, manual setters, and `execute`/`cancel`/`reset`/`dispose`. Strategies are `FIFO`, `LIFO` (abort queued/current work and keep newest), and `WAIT` (ignore new work while queue is nonempty). `dispose()` aborts current work and completes internal streams.
- Relations also live in `useQuery.ts`. `setRelations()` mutates relation configuration on the existing result; `data$.with(keys)` combines parent and selected related streams. Related fields are enumerable lazy getters over latest related arrays. A `sourceQuery` factory is cached by function identity and auto-executed once when its data is empty. `includeDefault` makes a relation part of ordinary `data$` subscriptions.
- `src/core/queryContainer.ts` implements `defineQuery(key, factory)`. Instances are shared in a process-global keyed registry. Each factory call increments refcount and usage metadata; lifecycle cleanup decrements refcount and schedules adaptive disposal after 5, 10, or 30 seconds. Registry uses best-effort LRU trimming above 100 entries. `configureContainer({debug})` controls diagnostic logging.
- `src/core/lifecycle.ts` holds one process-global `LifecycleAdapter`. `onScopeDispose()` delegates synchronously to it. Without an installed adapter or active framework scope, it returns `false`; no fallback cleanup is retained, so callers own disposal.
- `src/adapters/svelte.ts` and `src/adapters/vue.ts` install their adapters at module import time and bind cleanup to Svelte `onDestroy` or Vue effect scopes. Importing another adapter replaces the global adapter. `src/adapters/react.ts` exports a stub that always declines scope binding and does not auto-install itself.
- `src/index.ts` is the root public API barrel. `tsup.config.ts` builds it plus adapter entry points; keep its exports, tsup entries, and `package.json` subpath exports aligned.
- Tests are colocated in `src/core/*.test.ts`. They cover query state and queue strategies, basic relation setup, lifecycle delegation, and container singleton/refcount behavior. Delayed disposal, LRU trimming, full relation joining, and adapter framework scopes lack direct tests.
- `examples/svelte` is an unfinished SvelteKit consumer sketch. Query modules show DTO validation with Valibot, DTO-to-domain mapping, repository fetches, and market-to-currency relations. Current route/query code does not match the root `useQuery` API in several places; do not treat the example as a passing reference implementation.
- `src/example.ts` is a commented design sketch, not executable API.

## Build and packaging constraints

- TypeScript is strict, targets ES2022, and uses bundler module resolution. ESLint rejects unused variables except arguments prefixed `_`.
- RxJS and Valibot are externalized by tsup. `decimal.js` and Valibot are declared root dependencies but currently unused by root `src`; Valibot is used only in the separate Svelte example.
- `package.json` exports CommonJS files as `dist/*.cjs`, while current tsup configuration emits CommonJS `*.js`. Reconcile before publishing or relying on `require()`.
- `package.json` declares Svelte as a non-optional peer even for root/core consumers; Vue is optional. React is not declared because current adapter has no React import.
- Root barrel exports adapter modules, so importing `@reactive/state` evaluates Svelte and Vue adapter modules and leaves the Vue adapter installed last. Treat this side effect as current behavior when changing barrel exports.
- `sideEffects: false` conflicts with adapter modules whose imports intentionally install lifecycle adapters; bundlers may tree-shake those imports. Preserve or explicitly fix this behavior when changing packaging.
- Repository currently contains both root pnpm lock/workspace metadata and an example npm lockfile. Do not regenerate one package's lockfile with the other package manager accidentally.
