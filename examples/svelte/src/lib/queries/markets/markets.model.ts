import {type MarketDto, MarketStatus} from './markets.dto';

/*
* ==================================================
* Types
* ==================================================
*/
export interface Market {
    id: number;
    price: number;
    price24h: number;
    minPrice24h: number;
    maxPrice24h: number;
    volume24h: number;
    baseCurrencyId: string;
    quoteCurrencyId: string;
    symbol: string;
    baseCurrencyPrecision: number;
    quoteCurrencyPrecision: number;
    tvSymbol: string;
    isVisible: boolean;
    status: MarketStatus;
    listedAt: string | null;
    marketIcon: string | null;
    delistedAt: string | null;
}

/*
* ==================================================
* Methods
* ==================================================
*/
export function toDomainModel(dto: MarketDto): Market {
    return {
        id: dto.id,
        baseCurrencyPrecision: dto.baseCurrencyPrecision,
        quoteCurrencyPrecision: dto.quoteCurrencyPrecision,
        baseCurrencyId: dto.baseCurrencyId.toUpperCase(),
        quoteCurrencyId: dto.quoteCurrencyId.toUpperCase(),
        maxPrice24h: dto.maxPrice24h,
        minPrice24h: dto.minPrice24h,
        price: dto.price,
        price24h: dto.price24h,
        volume24h: dto.volume24h,
        symbol: dto.symbol,
        delistedAt: dto.delistedAt,
        listedAt: dto.listedAt,
        marketIcon: dto.marketIcon,
        isVisible: dto.isVisible,
        status: dto.status,
        tvSymbol: dto.tvSymbol
    };
}
