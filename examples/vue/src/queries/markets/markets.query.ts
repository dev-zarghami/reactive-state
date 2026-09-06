import { defineQuery, type UseQueryResult } from '../../../../../src';
import { type Currency } from '../currencies/currencies.model';
import { useCurrenciesQuery } from '../currencies/currencies.query';
import { type Market } from './markets.model';
import { fetchMarkets } from './markets.repository';

export const useMarketsQuery = defineQuery('markets', (query: UseQueryResult<Market[], Error>) => {
    query.handler(async ({signal}) => await fetchMarkets({signal}), 'FIFO')

    return query.setRelations({
        baseCurrency: {
            sourceQuery: useCurrenciesQuery,
            foreignKey: (market: Market) => market.baseCurrencyId,
            keySelector: (currency: Currency) => currency.symbol
        },
        quoteCurrency: {
            sourceQuery: useCurrenciesQuery,
            foreignKey: (market: Market) => market.quoteCurrencyId,
            keySelector: (currency: Currency) => currency.symbol
        }
    });
});
