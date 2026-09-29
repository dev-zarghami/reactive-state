import { currencyPrecision } from './currencies.js';

/**
 * Fake market fixtures.
 *
 * Authored as human-readable decimals and scaled to the integer strings the
 * upstream API uses (price is quoted in the *quote* currency's smallest unit,
 * i.e. `value * 10 ** quoteCurrencyPrecision`). Keep the authored precision at
 * or below 8 decimals so the scaled value stays an exact integer.
 *
 * Shape must satisfy `MarketDto` in `../queries/markets/markets.dto.ts`.
 * Note `listedAt` is `v.union([v.null()])` in that schema — it accepts *only*
 * `null`, so the upstream string timestamps are rejected and fall back to null.
 * Emit `null` here rather than an ISO string.
 */

/**
 * `price` is the live price, `price24h` the 24h-ago close, `min24h`/`max24h`
 * the 24h range, `volume24h` the 24h volume. `jitter` marks the fields the
 * server nudges on every request so the examples' Refresh button visibly
 * changes something.
 */
const SEED_MARKETS = [
	{ base: 'BTC', quote: 'USDT', price: 104325.5, price24h: 101200.4, min24h: 100150.2, max24h: 106800.9, volume24h: 1840.52 },
	{ base: 'ETH', quote: 'USDT', price: 3452.75, price24h: 3390.1, min24h: 3362.4, max24h: 3521.88, volume24h: 24117.63 },
	{ base: 'SOL', quote: 'USDT', price: 218.4, price24h: 214.05, min24h: 210.9, max24h: 222.6, volume24h: 984220.4 },
	{ base: 'BNB', quote: 'USDT', price: 712.9, price24h: 705.33, min24h: 698.1, max24h: 721.45, volume24h: 41208.19 },
	{ base: 'XRP', quote: 'USDT', price: 2.34, price24h: 2.28, min24h: 2.25, max24h: 2.39, volume24h: 6120440.87 },
	{ base: 'TRX', quote: 'USDT', price: 0.2831, price24h: 0.2794, min24h: 0.2762, max24h: 0.2877, volume24h: 28900411.5 },
	{ base: 'EUR', quote: 'USDT', price: 1.0912, price24h: 1.0871, min24h: 1.0843, max24h: 1.0948, volume24h: 90214.36 },
	{ base: 'USDC', quote: 'USDT', price: 0.9998, price24h: 0.9996, min24h: 0.9991, max24h: 1.0002, volume24h: 4410275.9 },
	{ base: 'BTC', quote: 'IRR', price: 113_200_000_000, price24h: 110_150_000_000, min24h: 109_000_000_000, max24h: 115_800_000_000, volume24h: 8_204.71 },
	{ base: 'ETH', quote: 'IRR', price: 3_745_000_000, price24h: 3_680_400_000, min24h: 3_640_000_000, max24h: 3_820_000_000, volume24h: 1_204.33 },
	{ base: 'USDT', quote: 'IRR', price: 1_085_000, price24h: 1_079_500, min24h: 1_074_000, max24h: 1_092_000, volume24h: 24_880_400.11 },
	{ base: 'USDC', quote: 'IRR', price: 1_080_000, price24h: 1_076_200, min24h: 1_071_000, max24h: 1_087_000, volume24h: 6_142_009.44 },
	{ base: 'SOL', quote: 'IRR', price: 236_800_000, price24h: 232_100_000, min24h: 229_500_000, max24h: 241_900_000, volume24h: 412.08 }
];

/** Market status. The TS enum in `markets.dto.ts` is numeric, but `v.enum()` on a
 *  numeric TS enum validates against `Object.values()` — which for
 *  `enum MarketStatus { LISTED }` is `['LISTED']`, not `[0]`. So the wire format
 *  has to be the string, matching upstream. */
const LISTED = 'LISTED';

/** Rescale an authored decimal into the quote currency's smallest unit. */
function scale(value, quotePrecision) {
	return Math.round(value * 10 ** quotePrecision);
}

/**
 * Build the wire payload for one market.
 *
 * @param {(typeof SEED_MARKETS)[number]} seed
 * @param {number} id 1-based position in the list
 * @param {number} jitter multiplier applied to `price` and `volume24h`
 */
function toMarketDto(seed, id, jitter) {
	const quotePrecision = currencyPrecision[seed.quote] ?? 2;

	return {
		id,
		symbol: `${seed.base}${seed.quote}`,
		baseCurrencyId: seed.base,
		quoteCurrencyId: seed.quote,
		price: String(scale(seed.price * jitter, quotePrecision)),
		price24h: String(scale(seed.price24h, quotePrecision)),
		minPrice24h: String(scale(seed.min24h, quotePrecision)),
		maxPrice24h: String(scale(seed.max24h, quotePrecision)),
		volume24h: String(scale(seed.volume24h * jitter, quotePrecision)),
		baseCurrencyPrecision: currencyPrecision[seed.base] ?? 2,
		quoteCurrencyPrecision: quotePrecision,
		tvSymbol: `BINANCE:${seed.base}USDT`,
		isVisible: true,
		status: LISTED,
		marketIcon: null,
		listedAt: null,
		delistedAt: null
	};
}

/** All markets at a single point in time. */
export function buildMarkets(jitter = 1) {
	return SEED_MARKETS.map((seed, index) => toMarketDto(seed, index + 1, jitter));
}

export const marketCount = SEED_MARKETS.length;
