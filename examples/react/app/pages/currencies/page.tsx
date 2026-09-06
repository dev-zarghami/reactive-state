"use client";

import {useEffect} from "react";
import {useCurrenciesQuery} from "../../../../queries/currencies/currencies.query";
import {useStream} from "@/app/hooks/useStream";

export default function CurrenciesPage() {
    const currenciesQuery = useCurrenciesQuery();

    const currenciesLoading = useStream(currenciesQuery.loading$, false);
    const currenciesError = useStream(currenciesQuery.error$, null);
    const currenciesData = useStream(currenciesQuery.data$, []);

    useEffect(() => {
        currenciesQuery.execute();

        return () => {
            currenciesQuery.cancel()
            currenciesQuery.sweep()
        };
    }, []);

    return (
        <main className="page-shell">
            <section className="page-header">
                <div>
                    <p className="eyebrow">Live query</p>
                    <h1>Currencies</h1>
                    <p className="description">
                        Currency payloads validated with Valibot and published through a shared query container.
                    </p>
                </div>

                <button
                    className="action-button"
                    type="button"
                    disabled={currenciesLoading}
                    onClick={() => currenciesQuery.execute()}
                >
                    {currenciesLoading ? "Loading…" : "Refresh"}
                </button>
            </section>

            {currenciesError ? (
                <p className="status error" role="alert">{currenciesError.message}</p>
            ) : currenciesLoading && !currenciesData?.length ? (
                <p className="status">Loading currencies…</p>
            ) : !currenciesData?.length ? (
                <p className="status">No currencies returned.</p>
            ) : (
                <div className="table-shell table-currencies" aria-busy={currenciesLoading}>
                    <table>
                        <thead>
                        <tr>
                            <th>Currency</th>
                            <th>English name</th>
                            <th>Persian name</th>
                            <th>Precision</th>
                            <th>Visibility</th>
                        </tr>
                        </thead>
                        <tbody>
                        {currenciesData.map((currency) => (
                            <tr key={currency.symbol}>
                                <td>
                                    <span className="primary-cell">{currency.symbol}</span>
                                </td>
                                <td>{currency.nameEn || "—"}</td>
                                <td lang="fa" dir="rtl">{currency.nameFa || "—"}</td>
                                <td>{currency.decimal}</td>
                                <td>
                                    <span className={currenciesVisibilityClass(currency.isVisible)}>
                                        {currency.isVisible ? "Visible" : "Hidden"}
                                    </span>
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

function currenciesVisibilityClass(isVisible: boolean): string {
    return isVisible ? "visibility visible" : "visibility";
}
