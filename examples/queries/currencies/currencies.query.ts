import { defineQuery } from '../../../src';
import { type Currency } from './currencies.model';
import { fetchCurrencies } from './currencies.repository';

export const useCurrenciesQuery = defineQuery<Currency[], Error>('currencies')((query) => {
	query.handler(async ({ signal }) => await fetchCurrencies({ signal }), 'FIFO');
	return query;
});
