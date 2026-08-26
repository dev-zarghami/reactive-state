# @omp/core

Core data and transport utilities for the OMP frontend.

## Imports

```ts
import {
  fetchCurrencies,
  fetchMarkets,
  useCurrencies,
  useMarkets,
  type Currency,
  type Market
} from '@omp/core';

import { useApi, useQuery, useSse, useWebsocket } from '@omp/core/hooks';
```

## Usage

### Repository functions (one-off calls)

```ts
const controller = new AbortController();
const currencies = await fetchCurrencies({ signal: controller.signal });
```

### Query hooks (reactive + relation-aware)

Queries return reactive streams plus execute/reset/cancel/dispose controls.
Call `dispose()` when a consumer is torn down (for example, a Svelte unmount).

```ts
const marketsQuery = useMarkets();
const unsubscribe = marketsQuery.data$.subscribe((markets) => {
  if (!markets) return;
  // Each market has lazy relation getters:
  // market.baseCurrency and market.quoteCurrency
  console.log(markets[0]?.baseCurrency);
});

marketsQuery.execute();
marketsQuery.currencies.execute();

// Later (component destroy)
unsubscribe();
marketsQuery.dispose();
marketsQuery.currencies.dispose();
```

### useQuery (queue + retry control)

```ts
const query = useQuery(async ({ signal }) => fetchCurrencies({ signal }), 'FIFO');

const sub = query.data$.subscribe((data) => console.log(data));
query.execute();

// Cleanup
query.dispose();
sub.unsubscribe();
```

### useApi (custom HTTP client)

```ts
const api = useApi({ baseURL: 'https://api.ompfinex.com' });
const { data, error } = await api.request<{ data: Currency[] }>('/v3/currencies', {
  signal: new AbortController().signal
});
```

### useSse / useWebsocket

```ts
const sse = useSse({ baseURL: 'https://example.com/sse' });
sse.on('message').subscribe((payload) => console.log(payload));
sse.connect();

const ws = useWebsocket({
  baseURL: 'wss://example.com/socket',
  heartbeatEvent: ({ index }) => ({ type: 'ping', index })
});
ws.on('price').subscribe((msg) => console.log(msg));
ws.connect();
```
