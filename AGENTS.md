# AGENTS.md

## What this is

`@reactive/state` — private npm package: RxJS-based reactive query engine with a relation system and framework lifecycle adapters. Svelte + Vue adapters work; React adapter is a stub that always declines scope binding.

**Naming is stale everywhere**: package.json says `@reactive/state`, README says `@omp/core` and documents APIs that don't exist (`useApi`, `useSse`, `useWebsocket`, `fetchCurrencies`), source comments/warnings still say `@package/logic`. Trust `package.json`, `src/index.ts`, and actual source behavior over prose.

No CI exists — verification is local only.

## Commands

Use pnpm; root `pnpm-lock.yaml` is authoritative. Full verification:

```bash
pnpm lint && pnpm check-types && pnpm test && pnpm build
```

```bash
pnpm dev          # tsup --watch
pnpm test         # vitest run, src/**/*.test.ts
pnpm test src/core/useQuery.test.ts -t "executes tasks in order"   # single file / test
```

Tests are colocated in `src/core/*.test.ts` (queue strategies, relation basics, container refcounting, lifecycle delegation). Delayed disposal, LRU trimming, full relation joining, and adapter framework scopes lack direct tests.

`examples/svelte/` is a separate SvelteKit app with its own **npm** lockfile — run its commands from inside that dir (`dev`/`check`/`lint`/`build`). It imports the root package via an absolute `file:/…/reactive-state/dist` path, so **build the root package first**. Never regenerate one lockfile with the other package manager. The example is unfinished and does not match the root API — not a reference implementation.

## Packaging gotchas

- tsup emits CJS as `dist/*.js`, but package.json maps `require` to `dist/*.cjs`. The CJS entry is broken; reconcile before relying on `require()` or publishing.
- Root barrel (`src/index.ts`) exports all adapter modules → importing `@reactive/state` evaluates them at import time, leaving the **Vue adapter installed last**. Adapters self-install on import (side effect), which conflicts with `"sideEffects": false` — bundlers may tree-shake them.
- Keep `src/index.ts` exports, `tsup.config.ts` entries, and `package.json` subpath exports aligned when changing either side.
- `decimal.js` and `valibot` are declared deps but unused by root `src` (valibot appears only in the example). `fake-indexeddb` devDep is a leftover — the old IndexedDB store module was removed.

## Core architecture

- `src/core/useQuery.ts` — the whole engine: `useQuery(executor, strategy)` with `'FIFO' | 'LIFO' | 'WAIT'`, per-task AbortControllers (signal passed to executor), `data$`/`error$`/`loading$` subjects, `execute/cancel/reset/dispose`. **Always dispose on teardown** — it aborts current work and completes all subjects.
- Relations also live in useQuery.ts: `setRelations()` attaches enumerable lazy getters resolved against latest emissions; join via `data$.with(keys)`; `sourceQuery` factories are cached by function identity and auto-executed once when empty; `includeDefault` folds a relation into plain `data$`.
- `queryContainer.ts` / `defineQuery(key, factory)` — process-global keyed singleton registry with refcounting; disposal scheduled adaptively after 5/10/30 s by usage tier; best-effort LRU trim above 100 entries; `configureContainer({debug})` toggles logs.
- `lifecycle.ts` — one process-global `LifecycleAdapter`; `onScopeDispose(cb)` returns `false` when no adapter/scope is active and retains no fallback → caller owns `dispose()`.
- `src/example.ts` is a commented design sketch, not executable code.

## Conventions

- ESLint errors on unused vars except `_`-prefixed args. TypeScript strict, ES2022 target, bundler moduleResolution.
- No comments in code unless asked.
