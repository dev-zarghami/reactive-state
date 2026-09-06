"use client";

import {useEffect} from "react";
import {useCurrenciesQuery} from "../../queries/currencies/currencies.query";
import type {Currency} from "../../queries/currencies/currencies.model";
import {useStream} from "@/app/hooks/useStream";

export default function CurrenciesPage() {
    const query = useCurrenciesQuery();

    const data = useStream<Currency[] | null>(query.data$, null);
    const loading = useStream<boolean>(query.loading$, false);
    const error = useStream<Error | null>(query.error$, null);

    useEffect(() => {
        query.execute();
        return () => {
            query.cancel()
            query.sweep()
        };
    }, []);

    return (
        <main className="w-5xl mx-auto my-8 px-4 font-sans">
            <header className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">Currencies</h1>
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
                <p>Loading currencies...</p>
            ) : (
                <table className="w-full border-collapse">
                    <thead>
                    <tr className="border-b border-zinc-300 text-left">
                        <th className="py-2 px-2">Symbol</th>
                        <th className="py-2 px-2">Name</th>
                        <th className="py-2 px-2">Decimal</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data?.map((row) => (
                        <tr key={row.symbol} className="border-b border-zinc-200">
                            <td className="py-2 px-2">{row.symbol}</td>
                            <td className="py-2 px-2">{row.nameEn}</td>
                            <td className="py-2 px-2">{row.decimal}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </main>
    );
}
