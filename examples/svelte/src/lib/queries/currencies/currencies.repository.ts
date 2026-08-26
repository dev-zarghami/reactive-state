import {type CurrencyDto, parseCurrencyDto} from './currencies.dto';
import {type Currency, toCurrenciesModel} from './currencies.model';

export async function fetchCurrencies(context?: {
    signal?: AbortSignal,
    params?: Record<string, string>,
    headers?: Headers
}) {
    try {
        const url = new URL('/v3/currencies')

        Object.keys(context?.params).forEach((value) => {
            url.searchParams.set(value, context?.params[value])
        })

        const response = await fetch(url, {
            headers: context?.headers,
            signal: context?.signal
        });

        if (!response.ok) throw response.statusText

        const data: Array<CurrencyDto> = await response.json()

        const currencies: Array<Currency> = [];

        for (const item of data) {
            const parsed = parseCurrencyDto(item);
            if (parsed.success) {
                currencies.push(toCurrenciesModel(parsed.output));
            } else {
                console.error(parsed.issues);
            }
        }

        return currencies;
    } catch (e) {
        console.error(e);
        return e
    }
}
