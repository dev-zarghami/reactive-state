import {Component, OnInit} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {useMarketsQuery} from '../../../../../queries/markets/markets.query';

@Component({
    selector: 'app-markets',
    styles: [],
    template: `
        <main class="page-shell">
            <section class="page-header">
                <div>
                    <p class="eyebrow">Relation query</p>
                    <h1>Markets</h1>
                    <p class="description">
                        Live markets joined with shared base and quote currency queries through RxJS relations.
                    </p>
                </div>

                <button
                        class="action-button"
                        type="button"
                        [disabled]="marketsLoading()"
                        (click)="marketsQuery.execute()"
                >
                    {{ marketsLoading() ? 'Loading…' : 'Refresh' }}
                </button>
            </section>

            @if (marketsError(); as error) {
                <p class="status error" role="alert">{{ error.message }}</p>
            } @else if (marketsLoading() && !marketsData()?.length) {
                <p class="status">Loading markets…</p>
            } @else if (!marketsData()?.length) {
                <p class="status">No markets returned.</p>
            } @else {
                <div class="table-shell table-markets" [attr.aria-busy]="marketsLoading()">
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
                            @for (market of marketsData(); track market.id) {
                                <tr>
                                    <td class="primary-cell">{{ market.symbol }}</td>
                                    <td>{{ market.price }}</td>
                                    <td>{{ market.price24h }}</td>
                                    <td>{{ market.volume24h }}</td>
                                    <td>
                                        <span class="primary-cell">{{ market.baseCurrency?.nameEn ?? market.baseCurrencyId }}</span>
                                        <span class="secondary-label">{{ market.baseCurrencyId }}</span>
                                    </td>
                                    <td>
                                        <span class="primary-cell">{{ market.quoteCurrency?.nameEn ?? market.quoteCurrencyId }}</span>
                                        <span class="secondary-label">{{ market.quoteCurrencyId }}</span>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            }
        </main>
    `,
})
export class Markets implements OnInit {
    protected readonly marketsQuery = useMarketsQuery();

    protected readonly marketsLoading = toSignal(this.marketsQuery.loading$, {
        initialValue: false,
    });
    protected readonly marketsError = toSignal(this.marketsQuery.error$, {initialValue: null});
    protected readonly marketsData = toSignal(
        this.marketsQuery.data$.with(['baseCurrency', 'quoteCurrency']),
        {initialValue: []}
    );

    ngOnInit(): void {
        this.marketsQuery.execute();
    }

    ngOnDestroy() {
        this.marketsQuery.cancel();
    }
}
