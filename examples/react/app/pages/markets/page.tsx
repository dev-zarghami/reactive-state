"use client";

import { useEffect, useState } from "react";
import type { Subscription } from "rxjs";
import { useMarketsQuery } from "../../queries/markets/markets.query";
import type { Market } from "../../queries/markets/markets.model";
import type { Currency } from "../../queries/currencies/currencies.model";

type MarketRow = Market & { baseCurrency: Currency | null; quoteCurrency: Currency | null };

function useStream<T>(stream: { subscribe: (next: (value: T) => void) => Subscription }, initial: T): T {
    const [value, setValue] = useState(initial);
    useEffect(() => {
        const sub = stream.subscribe(setValue);
        return () => sub.unsubscribe();
    }, [stream]);
    return value;
}

export default function MarketsPage() {
    const query = useMarketsQuery();

    const joined = query.data$.with(["baseCurrency", "quoteCurrency"]);
    const data = useStream<MarketRow[] | null>(joined as any, null);
    const loading = useStream<boolean>(query.loading$, false);
    const error = useStream<Error | null>(query.error$, null);

    useEffect(() => {
        query.execute();
        return () => query.dispose();
    }, []);

    return (
        <main className="w-5xl mx-auto my-8 px-4 font-sans">
            <header className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">Markets</h1>
                <button
                    className="px-4 py-2 rounded bg-foreground text-background disabled:opacity-50"
                    onClick={() => query.execute()}
                    disabled={loading}
                >
                    Refresh
                </button>
            </header>
            {error ? (
                <p className="text-red-600">{error.message}</p>
            ) : loading && !data?.length ? (
                <p>Loading markets...</p>
            ) : (
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-300 text-left">
                            <th className="py-2 px-2">Symbol</th>
                            <th className="py-2 px-2">Price</th>
                            <th className="py-2 px-2">24h change</th>
                            <th className="py-2 px-2">Base currency</th>
                            <th className="py-2 px-2">Quote currency</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.map((row) => (
                            <tr key={row.id} className="border-b border-zinc-200">
                                <td className="py-2 px-2">{row.symbol}</td>
                                <td className="py-2 px-2">{row.price}</td>
                                <td className="py-2 px-2">{row.price24h}</td>
                                <td className="py-2 px-2">
                                    {row.baseCurrency?.nameEn ?? row.baseCurrencyId}
                                </td>
                                <td className="py-2 px-2">
                                    {row.quoteCurrency?.nameEn ?? row.quoteCurrencyId}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </main>
    );
}
