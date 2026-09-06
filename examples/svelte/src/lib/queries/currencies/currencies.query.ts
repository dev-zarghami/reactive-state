import { defineQuery, type UseQueryResult } from '../../../../../../src';
import { type Currency } from './currencies.model';
import { fetchCurrencies } from './currencies.repository';

export const useCurrenciesQuery = defineQuery('currencies', (query: UseQueryResult<Currency[], Error>) => {
	query.handler(async ({ signal }) => await fetchCurrencies({ signal }), 'FIFO');
	return query;
});
