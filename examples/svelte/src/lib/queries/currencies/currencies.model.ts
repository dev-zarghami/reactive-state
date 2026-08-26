import {type CurrencyDto} from './currencies.dto';

/*
* ==================================================
* Types
* ==================================================
*/
export interface Currency {
    symbol: string;
    nameEn: string;
    nameFa: string;
    icon: string;
    decimal: number;
    isVisible: boolean;
}

/*
* ==================================================
* Methods
* ==================================================
*/
export function toCurrenciesModel(dto: CurrencyDto): Currency {
    return {
        decimal: dto.decimalPrecision,
        icon: dto.icon,
        isVisible: dto.isVisible,
        nameEn: dto.name.en,
        nameFa: dto.name.fa,
        symbol: dto.id.toUpperCase()
    };
}
