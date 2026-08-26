import {useQuery} from '@reactive/state';
import {type Currency} from './currencies.model';
import {fetchCurrencies} from './currencies.repository';

export function useCurrenciesQuery() {
    return useQuery<Currency[]>(async ({signal, params, headers}) => {
        return await fetchCurrencies({signal, params, headers});
    }, 'FIFO');
};
