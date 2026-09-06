<script lang="ts">
    import {onMount} from 'svelte';
    import {useCurrenciesQuery} from "../../../../queries/currencies/currencies.query";

    const currenciesQuery = useCurrenciesQuery();

    const currenciesLoading$ = currenciesQuery.loading$;
    const currenciesError$ = currenciesQuery.error$;
    const currenciesData$ = currenciesQuery.data$;

    onMount(() => {
        currenciesQuery.execute()
        return () => currenciesQuery.cancel()
    });
</script>

<main>
    <header>
        <h1>Currencies</h1>
        <button onclick={() => currenciesQuery.execute()} disabled={$currenciesLoading$}>Refresh</button>
    </header>
    {#if $currenciesError$}
        <p class="error">{$currenciesError$}</p>
    {:else if $currenciesLoading$ && !$currenciesData$?.length}
        <p>Loading currencies...</p>
    {:else}
        <table>
            <thead>
            <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Decimal</th>
            </tr>
            </thead>
            <tbody>
            {#each $currenciesData$ as row (row.symbol)}
                <tr>
                    <td>{row.symbol}</td>
                    <td>{row.nameEn}</td>
                    <td>{row.decimal}</td>
                </tr>
            {/each}
            </tbody>
        </table>
    {/if}
</main>

<style>
    main {
        width: 960px;
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
