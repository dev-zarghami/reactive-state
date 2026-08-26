import * as v from 'valibot';

/*
* ==================================================
* Schema
* ==================================================
*/
const CurrencyDtoSchema = v.object({
    id: v.fallback(v.string(), ''),
    name: v.fallback(v.object({ fa: v.string(), en: v.string() }), { en: '', fa: '' }),
    icon: v.fallback(v.string(), ''),
    decimalPrecision: v.fallback(v.number(), 0),
    color: v.fallback(v.pipe(v.string(), v.hexColor()), '#000000'),
    category: v.fallback(
        v.object({
            // slug can be string | null
            slug: v.nullable(v.string())
        }),
        { slug: '' }
    ),
    isVisible: v.fallback(v.boolean(), false)
});

/*
* ==================================================
* Types
* ==================================================
*/
export type CurrencyDto = v.InferOutput<typeof CurrencyDtoSchema>;

/*
* ==================================================
* Methods
* ==================================================
*/
export function parseCurrencyDto(raw: unknown) {
    return v.safeParse(CurrencyDtoSchema, raw);
}
