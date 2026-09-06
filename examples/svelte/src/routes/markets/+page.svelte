<script lang="ts">
    import {onMount} from 'svelte';
    import {useMarketsQuery} from '../../../../queries/markets/markets.query';

    const marketsQuery = useMarketsQuery();

    const marketsLoading$ = marketsQuery.loading$;
    const marketsError$ = marketsQuery.error$;
    const marketsData$ = marketsQuery.data$.with(['baseCurrency', 'quoteCurrency']);

    onMount(() => {
        marketsQuery.execute()
        return () => marketsQuery.cancel()
    });
</script>

<main>
    <header>
        <h1>Markets</h1>
        <button onclick={() => marketsQuery.execute()} disabled={$marketsLoading$}>Refresh</button>
    </header>
    {#if $marketsError$}
        <p class="error">{$marketsError$}</p>
    {:else if $marketsLoading$ && !$marketsData$.length}
        <p>Loading markets...</p>
    {:else}
        <table>
            <thead>
            <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>24h change</th>
                <th>Base currency</th>
                <th>Quote currency</th>
            </tr>
            </thead>
            <tbody>
            {#each $marketsData$ as row (row.id)}
                <tr>
                    <td>{row.symbol}</td>
                    <td>{row.price}</td>
                    <td>{row.price24h}</td>
                    <td>{row.baseCurrency?.nameEn ?? row.baseCurrencyId}</td>
                    <td>{row.quoteCurrency?.nameEn ?? row.quoteCurrencyId}</td>
                </tr>
            {/each}
            </tbody>
        </table>
    {/if}
</main>

<style>
    main {
        max-width: 960px;
        margin: 2rem auto;
        padding: 0 1rem;
        font-family: system-ui, sans-serif;
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .error {
        color: #c0392b;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th,
    td {
        padding: 0.5rem;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
</style>
