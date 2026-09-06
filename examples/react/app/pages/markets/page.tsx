"use client";

import {useEffect} from "react";
import {useStream} from "@/app/hooks/useStream";
import {useMarketsQuery} from "../../../../queries/markets/markets.query";

export default function MarketsPage() {
    const marketsQuery = useMarketsQuery();

    const marketsLoading = useStream(marketsQuery.loading$, false);
    const marketsError = useStream(marketsQuery.error$, null);
    const marketsData = useStream(marketsQuery.data$.with(["baseCurrency", "quoteCurrency"]), []);

    useEffect(() => {
        marketsQuery.execute();

        return () => {
            marketsQuery.cancel()
            marketsQuery.sweep()
        };
    }, []);

    return (
        <main className="w-5xl mx-auto my-8 px-4 font-sans">
            <header className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">Markets</h1>
                <button
                    className="px-4 py-2 rounded bg-foreground text-background disabled:opacity-50"
                    onClick={() => marketsQuery.execute()}
                    disabled={marketsLoading}
                >
                    Refresh
                </button>
            </header>
            {marketsError ? (
                <p className="text-red-600">{marketsError.message}</p>
            ) : marketsLoading && !marketsData?.length ? (
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
                    {marketsData?.map((row) => (
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
