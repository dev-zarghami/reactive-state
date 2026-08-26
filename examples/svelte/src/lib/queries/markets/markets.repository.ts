import {type MarketDto, parseMarketDto} from './markets.dto';
import {type Market, toDomainModel} from './markets.model';


export async function fetchMarkets(context?: {
    signal?: AbortSignal,
    params?: Record<string, string>,
    headers?: Headers
}) {
    try {
        const url = new URL('/v2/market')

        Object.keys(context?.params).forEach((value) => {
            url.searchParams.set(value, context?.params[value])
        })

        const response = await fetch(url, {
            headers: context?.headers,
            signal: context?.signal
        });

        if (!response.ok) throw response.statusText

        const data: Array<MarketDto> = await response.json()

        const markets: Market[] = [];

        for (const item of data) {
            const parsed = parseMarketDto(item);
            if (parsed.success) {
                markets.push(toDomainModel(parsed.output));
            } else {
                console.error(parsed.issues);
            }
        }

        return markets;
    } catch (e) {
        console.error(e);
        return e
    }
}
