import { type CurrencyDto, parseCurrencyDto } from './currencies.dto';
import { type Currency, toCurrenciesModel } from './currencies.model';
import { type FetchContext, requestJson } from '$lib/api';

export async function fetchCurrencies(context: FetchContext = {}): Promise<Currency[]> {
	const payload = await requestJson<{ status: string; data: CurrencyDto[] }>(
		'/v3/currencies',
		context
	);

	const currencies: Currency[] = [];

	for (const dto of payload.data) {
		const parsed = parseCurrencyDto(dto);
		if (parsed.success) {
			currencies.push(toCurrenciesModel(parsed.output));
		} else {
			console.error('currency dto rejected:', parsed.issues);
		}
	}

	return currencies;
}
