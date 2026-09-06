# @reactive/state Vue example

Vue 3 example for `@reactive/state`. It loads live OMPFinex markets and currencies, joins base/quote currencies through query relations, and bridges package RxJS streams into Vue refs.

## Run

Build package from repository root first:

```sh
pnpm build
```

Then run example:

```sh
cd examples/vue
pnpm install
pnpm dev
```

## Verify

```sh
pnpm type-check
pnpm build
```

`App.vue` owns its `useQuery` instances. Vue subscriptions are unsubscribed and both market and currency queries are disposed in `onUnmounted`; no framework lifecycle adapter is required.
