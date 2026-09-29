import express from 'express';
import cors from 'cors';

import { currencies } from './data/currencies.js';
import { buildMarkets, marketCount } from './data/markets.js';

/**
 * Fake backend for the `reactive-state` examples.
 *
 * Speaks the same envelope and paths as the upstream `api.ompfinex.com` API the
 * examples used to call, so `examples/queries/*` (DTOs -> models ->
 * repositories -> `defineQuery` factories) is unchanged — only `BASE_URL` moved.
 *
 * The four example apps each run on `http://localhost:4100`, so this listens on
 * 4000 and enables permissive CORS for every origin. That is fine for a local
 * fixture server; do not copy it into anything real.
 */

const PORT = Number(process.env.PORT ?? 4000);

/** Upstream jitter band: +/- 0.5% on price and volume. */
const JITTER_SPAN = 0.005;

const app = express();

app.use(cors());
app.use(express.json());

/** Fresh multiplier per request, so Refresh visibly moves the numbers. */
function jitterFactor() {
	return 1 + (Math.random() * 2 - 1) * JITTER_SPAN;
}

/** Upstream envelope: `{ status, data }`. */
function envelope(data) {
	return { status: 'OK', data };
}

app.get('/health', (_req, res) => {
	res.json({ status: 'OK', data: { currencies: currencies.length, markets: marketCount } });
});

app.get('/v3/currencies', (_req, res) => {
	res.json(envelope(currencies));
});

app.get('/v2/market', (_req, res) => {
	res.json(envelope(buildMarkets(jitterFactor())));
});

app.use((_req, res) => {
	res.status(404).json({ status: 'ERROR', message: 'Not found' });
});

app.listen(PORT, () => {
	console.log(`[example-server] fake ompfinex API listening on http://localhost:${PORT}`);
	console.log(`[example-server]   GET /v3/currencies  (${currencies.length} currencies)`);
	console.log(`[example-server]   GET /v2/market       (${marketCount} markets, +/-0.5% jitter)`);
});
