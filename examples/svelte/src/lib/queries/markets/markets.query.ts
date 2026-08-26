import {useQuery} from '@reactive/state';
import {type Market} from './markets.model';
import {fetchMarkets} from './markets.repository';
import {useCurrenciesQuery} from '../currencies/currencies.query';

export const useMarketsQuery = () => {
    const query = useQuery<Market[]>(async ({signal}) => {
        return await fetchMarkets({signal});
    }, 'FIFO');

    query.setRelations({
        baseCurrency: {
            sourceQuery: useCurrenciesQuery,
            foreignKey: (market) => market.baseCurrencyId,
            keySelector: (currency) => currency.symbol
        },
        quoteCurrency: {
            sourceQuery: useCurrenciesQuery,
            foreignKey: (market) => market.quoteCurrencyId,
            keySelector: (currency) => currency.symbol
        },
    });

    return query;
};
