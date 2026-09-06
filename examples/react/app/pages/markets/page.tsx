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
        console.log('useEffect-------');
        marketsQuery.execute();

        return () => {
            marketsQuery.cancel()
            marketsQuery.sweep()
        };
    }, []);

    return (
        <main className="page-shell">
            <section className="page-header">
                <div>
                    <p className="eyebrow">Relation query</p>
                    <h1>Markets</h1>
                    <p className="description">
                        Live markets joined with shared base and quote currency queries through RxJS relations.
                    </p>
                </div>

                <button
                    className="action-button"
                    type="button"
                    disabled={marketsLoading}
                    onClick={() => marketsQuery.execute()}
                >
                    {marketsLoading ? "Loading…" : "Refresh"}
                </button>
            </section>

            {marketsError ? (
                <p className="status error" role="alert">{marketsError.message}</p>
            ) : marketsLoading && !marketsData?.length ? (
                <p className="status">Loading markets…</p>
            ) : !marketsData?.length ? (
                <p className="status">No markets returned.</p>
            ) : (
                <div className="table-shell table-markets" aria-busy={marketsLoading}>
                    <table>
                        <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Price</th>
                            <th>24h price</th>
                            <th>Volume</th>
                            <th>Base currency</th>
                            <th>Quote currency</th>
                        </tr>
                        </thead>
                        <tbody>
                        {marketsData.map((market) => (
                            <tr key={market.id}>
                                <td className="primary-cell">{market.symbol}</td>
                                <td>{market.price}</td>
                                <td>{market.price24h}</td>
                                <td>{market.volume24h}</td>
                                <td>
                                    <span className="primary-cell">
                                        {market.baseCurrency?.nameEn ?? market.baseCurrencyId}
                                    </span>
                                    <span className="secondary-label">{market.baseCurrencyId}</span>
                                </td>
                                <td>
                                    <span className="primary-cell">
                                        {market.quoteCurrency?.nameEn ?? market.quoteCurrencyId}
                                    </span>
                                    <span className="secondary-label">{market.quoteCurrencyId}</span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
