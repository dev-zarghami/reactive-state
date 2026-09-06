import { type MarketDto, parseMarketDto } from './markets.dto';
import { type Market, toDomainModel } from './markets.model';
import { type FetchContext, requestJson } from 'examples/queries/api';

export async function fetchMarkets(context: FetchContext = {}): Promise<Market[]> {
	const payload = await requestJson<{ status: string; data: MarketDto[] }>('/v2/market', context);

	const markets: Market[] = [];

	for (const dto of payload.data) {
		const parsed = parseMarketDto(dto);
		if (parsed.success) {
			markets.push(toDomainModel(parsed.output));
		} else {
			console.error('market dto rejected:', parsed.issues);
		}
	}

	return markets;
}
