import { defineQuery, useQuery } from '@reactive/state';
import { type Currency } from './currencies.model';
import { fetchCurrencies } from './currencies.repository';

export const useCurrenciesQuery = defineQuery('currencies', () =>
	useQuery<Currency[]>(async ({ signal }) => await fetchCurrencies({ signal }), 'FIFO')
);
