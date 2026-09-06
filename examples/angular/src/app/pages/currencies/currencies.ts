import {Component, OnInit} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {useCurrenciesQuery} from '../../../../../queries/currencies/currencies.query';
import {type Currency} from '../../../../../queries/currencies/currencies.model';

@Component({
    selector: 'app-currencies',
    styles: [],
    template: `
        <main class="page-shell">
            <section class="page-header">
                <div>
                    <p class="eyebrow">Live query</p>
                    <h1>Currencies</h1>
                    <p class="description">
                        Currency payloads validated with Valibot and published through a shared query container.
                    </p>
                </div>

                <button
                        class="action-button"
                        type="button"
                        [disabled]="currenciesLoading()"
                        (click)="currenciesQuery.execute()"
                >
                    {{ currenciesLoading() ? 'Loading…' : 'Refresh' }}
                </button>
            </section>

            @if (currenciesError(); as error) {
                <p class="status error" role="alert">{{ error.message }}</p>
            } @else if (currenciesLoading() && !currenciesData()?.length) {
                <p class="status">Loading currencies…</p>
            } @else if (!currenciesData()?.length) {
                <p class="status">No currencies returned.</p>
            } @else {
                <div class="table-shell table-currencies" [attr.aria-busy]="currenciesLoading()">
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
                            @for (currency of currenciesData(); track currency.symbol) {
                                <tr>
                                    <td>
                                        <span class="primary-cell">{{ currency.symbol }}</span>
                                    </td>
                                    <td>{{ currency.nameEn || '—' }}</td>
                                    <td lang="fa" dir="rtl">{{ currency.nameFa || '—' }}</td>
                                    <td>{{ currency.decimal }}</td>
                                    <td>
                    <span class="visibility" [class.visible]="currency.isVisible">
                      {{ currency.isVisible ? 'Visible' : 'Hidden' }}
                    </span>
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
export class Currencies implements OnInit {
    protected readonly currenciesQuery = useCurrenciesQuery();

    protected readonly currenciesLoading = toSignal(this.currenciesQuery.loading$, {
        initialValue: false,
    });
    protected readonly currenciesError = toSignal(this.currenciesQuery.error$, {
        initialValue: null,
    });
    protected readonly currenciesData = toSignal(this.currenciesQuery.data$, {
        initialValue: [] as Currency[],
    });

    ngOnInit(): void {
        this.currenciesQuery.execute();
    }

    ngOnDestroy() {
        this.currenciesQuery.cancel()
    }
}
