/**
 * Fake currency fixtures.
 *
 * Shape must satisfy `CurrencyDto` in `../queries/currencies/currencies.dto.ts`
 * (`valibot` — every field has a `fallback`, so a bad value degrades silently
 * instead of throwing; verify with `npm test` in that folder if you change this).
 *
 * Two details that are easy to get wrong:
 *
 * 1. `color` must be `#`-prefixed. `v.hexColor()` requires the hash, so the
 *    upstream `https://api.ompfinex.com/v3/currencies` payload (which returns
 *    bare `d92323`) is rejected by the DTO and silently falls back to `#000000`.
 * 2. `id` is uppercase. `toCurrenciesModel` does `dto.id.toUpperCase()` and the
 *    market relations join on `currency.symbol`, so `id` has to line up with the
 *    uppercased `baseCurrencyId` / `quoteCurrencyId` of the market fixtures.
 */

/** @type {Array<import('../queries/currencies/currencies.dto').CurrencyDto>} */
export const currencies = [
	{
		id: 'BTC',
		name: { en: 'Bitcoin', fa: 'بیت‌کوین' },
		icon: 'btc.svg',
		decimalPrecision: 8,
		color: '#f7931a',
		category: { slug: 'coin' },
		isVisible: true
	},
	{
		id: 'ETH',
		name: { en: 'Ethereum', fa: 'اتریوم' },
		icon: 'eth.svg',
		decimalPrecision: 6,
		color: '#627eea',
		category: { slug: 'coin' },
		isVisible: true
	},
	{
		id: 'BNB',
		name: { en: 'BNB', fa: 'بی‌ان‌بی' },
		icon: 'bnb.svg',
		decimalPrecision: 6,
		color: '#f0b90b',
		category: { slug: 'coin' },
		isVisible: true
	},
	{
		id: 'SOL',
		name: { en: 'Solana', fa: 'سولانا' },
		icon: 'sol.svg',
		decimalPrecision: 6,
		color: '#9945ff',
		category: { slug: 'coin' },
		isVisible: true
	},
	{
		id: 'XRP',
		name: { en: 'XRP', fa: 'ریپل' },
		icon: 'xrp.svg',
		decimalPrecision: 3,
		color: '#23292f',
		category: { slug: 'coin' },
		isVisible: true
	},
	{
		id: 'TRX',
		name: { en: 'TRON', fa: 'ترون' },
		icon: 'trx.svg',
		decimalPrecision: 2,
		color: '#eb0029',
		category: { slug: 'coin' },
		isVisible: true
	},
	{
		id: 'USDT',
		name: { en: 'Tether', fa: 'تتر' },
		icon: 'usdt.svg',
		decimalPrecision: 8,
		color: '#26a17b',
		category: { slug: 'stablecoin' },
		isVisible: true
	},
	{
		id: 'USDC',
		name: { en: 'USD Coin', fa: 'یواس‌دی کوین' },
		icon: 'usdc.svg',
		decimalPrecision: 8,
		color: '#2775ca',
		category: { slug: 'stablecoin' },
		isVisible: true
	},
	{
		id: 'USD',
		name: { en: 'US Dollar', fa: 'دلار آمریکا' },
		icon: 'usd.svg',
		decimalPrecision: 2,
		color: '#3a6ea5',
		category: { slug: 'fiat' },
		isVisible: true
	},
	{
		id: 'EUR',
		name: { en: 'Euro', fa: 'یورو' },
		icon: 'eur.svg',
		decimalPrecision: 2,
		color: '#0e6ba8',
		category: { slug: 'fiat' },
		isVisible: true
	},
	{
		id: 'IRR',
		name: { en: 'Iranian Rial', fa: 'ریال ایران' },
		icon: 'irr.svg',
		decimalPrecision: 0,
		color: '#239f40',
		category: { slug: 'fiat' },
		isVisible: true
	},
	{
		// Deliberately hidden so the examples exercise the `isVisible` flag.
		id: 'IRT',
		name: { en: 'Iranian Toman', fa: 'تومان ایران' },
		icon: 'irt.svg',
		decimalPrecision: 0,
		color: '#0f9d58',
		category: { slug: 'fiat' },
		isVisible: false
	}
];

/** `id` -> `decimalPrecision`, used to derive market price scaling. */
export const currencyPrecision = Object.fromEntries(
	currencies.map((currency) => [currency.id, currency.decimalPrecision])
);
