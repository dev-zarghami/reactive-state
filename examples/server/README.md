# Fake API server

A local stand-in for `https://api.ompfinex.com`, so the four `reactive-state`
example apps run with **no network access and no third-party dependency**.

It serves the same paths and the same `{ status, data }` envelope as upstream,
which means everything in `examples/queries/` — the Valibot DTOs, the domain
models, the repositories, and the `defineQuery` factories — is unchanged. Only
`BASE_URL` moved, in `examples/queries/api.ts`.

```bash
npm install
npm start          # or: npm run dev  (node --watch)
```

Listens on **http://localhost:4000** (`PORT` env var overrides). Start it before
running any of the example apps.

## Endpoints

| Method | Path             | Notes                                             |
| ------ | ---------------- | ------------------------------------------------- |
| `GET`  | `/v3/currencies` | 12 currencies, one of them `isVisible: false`      |
| `GET`  | `/v2/market`     | 13 markets, `price`/`volume24h` jittered ±0.5%     |
| `GET`  | `/health`        | Fixture counts                                     |
| `*`    | anything else    | `404`                                              |

CORS is open to every origin because the example apps are served from
`http://localhost:4100`. That is fine for a local fixture server and nowhere else.

## Editing the fixtures

- `data/currencies.js` — currency rows plus the `id -> decimalPrecision` map.
- `data/markets.js` — market rows, authored as readable decimals and scaled to
  the integer strings upstream uses.

`npm run dev` restarts on change.

## Gotchas when editing fixtures

Both DTO schemas use `v.fallback(...)` on **every** field, so a malformed row
never throws — it silently degrades to the fallback and your change looks like it
"worked" while rendering wrong data. Watch for the repositories'
`console.error('dto rejected:', ...)` lines instead.

Three schema details that differ from the real upstream payload:

1. **`color` needs a `#` prefix.** `v.hexColor()` requires it. Upstream returns
   bare `d92323`, which the DTO rejects and replaces with `#000000`.
2. **`status` must be the string `"LISTED"`.** `markets.dto.ts` declares a
   *numeric* TS enum, but `v.enum()` validates against `Object.values()`, which
   for `enum MarketStatus { LISTED }` is `['LISTED']` — not `[0]`.
3. **`listedAt` must be `null`.** The schema is `v.fallback(v.union([v.null()]), null)`,
   which accepts *only* `null`. Upstream's `"2021-01-26 14:52:51"` timestamps are
   rejected and fall back to `null`.

`id` and the `baseCurrencyId` / `quoteCurrencyId` values must agree: the join
runs on `currency.symbol` (uppercased currency `id`) against the uppercased
market currency ids. A typo shows up as a row whose relation silently resolves
to `undefined`.

## Using the real API instead

Uncomment the second line in `examples/queries/api.ts`:

```ts
// export const BASE_URL = 'https://api.ompfinex.com';
export const BASE_URL = 'http://localhost:4000';
```

Note the real API returns unprefixed `color` values and string `listedAt`
timestamps, both of which the DTOs reject — see the gotchas above.
