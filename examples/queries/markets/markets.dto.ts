import * as v from 'valibot';

/*
 * ==================================================
 * Types
 * ==================================================
 */
export enum MarketStatus {
	LISTED
}

/*
 * ==================================================
 * Schema
 * ==================================================
 */
const MarketDtoSchema = v.object({
	id: v.fallback(v.pipe(v.union([v.string(), v.number()]), v.toNumber()), 0),
	symbol: v.fallback(v.string(), ''),
	baseCurrencyId: v.fallback(v.string(), ''),
	quoteCurrencyId: v.fallback(v.string(), ''),
	price: v.fallback(v.pipe(v.union([v.string(), v.number()]), v.toNumber()), 0),
	minPrice24h: v.fallback(v.pipe(v.union([v.string(), v.number()]), v.toNumber()), 0),
	maxPrice24h: v.fallback(v.pipe(v.union([v.string(), v.number()]), v.toNumber()), 0),
	volume24h: v.fallback(v.pipe(v.union([v.string(), v.number()]), v.toNumber()), 0),
	price24h: v.fallback(v.pipe(v.union([v.string(), v.number()]), v.toNumber()), 0),
	baseCurrencyPrecision: v.fallback(v.pipe(v.union([v.string(), v.number()]), v.toNumber()), 0),
	quoteCurrencyPrecision: v.fallback(v.pipe(v.union([v.string(), v.number()]), v.toNumber()), 0),
	tvSymbol: v.fallback(v.string(), ''),
	isVisible: v.fallback(v.boolean(), false),
	status: v.fallback(v.enum(MarketStatus), MarketStatus.LISTED),
	marketIcon: v.fallback(v.union([v.string(), v.null()]), ''),
	listedAt: v.fallback(v.union([v.null()]), null),
	delistedAt: v.fallback(v.union([v.string(), v.null()]), '')
});

/*
 * ==================================================
 * Types
 * ==================================================
 */
export type MarketDto = v.InferOutput<typeof MarketDtoSchema>;

/*
 * ==================================================
 * Methods
 * ==================================================
 */
export function parseMarketDto(raw: unknown) {
	return v.safeParse(MarketDtoSchema, raw);
}
