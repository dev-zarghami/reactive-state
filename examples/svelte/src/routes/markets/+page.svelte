<script lang="ts">
	import { onMount } from 'svelte';
	import { useMarketsQuery } from '../../../../queries/markets/markets.query';

	const marketsQuery = useMarketsQuery();

	const marketsLoading$ = marketsQuery.loading$;
	const marketsError$ = marketsQuery.error$;
	const marketsData$ = marketsQuery.data$.with(['baseCurrency', 'quoteCurrency']);

	onMount(() => {
		marketsQuery.execute();
		return () => marketsQuery.cancel();
	});
</script>

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
			disabled={$marketsLoading$}
			onclick={() => marketsQuery.execute()}
		>
			{$marketsLoading$ ? 'Loading…' : 'Refresh'}
		</button>
	</section>

	{#if $marketsError$}
		<p class="status error" role="alert">{$marketsError$.message}</p>
	{:else if $marketsLoading$ && !$marketsData$?.length}
		<p class="status">Loading markets…</p>
	{:else if !$marketsData$?.length}
		<p class="status">No markets returned.</p>
	{:else}
		<div class="table-shell" aria-busy={$marketsLoading$}>
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
					{#each $marketsData$ as market (market.id)}
						<tr>
							<td class="primary-cell">{market.symbol}</td>
							<td>{market.price}</td>
							<td>{market.price24h}</td>
							<td>{market.volume24h}</td>
							<td>
								<span class="primary-cell"
									>{market.baseCurrency?.nameEn ?? market.baseCurrencyId}</span
								>
								<span class="secondary-label">{market.baseCurrencyId}</span>
							</td>
							<td>
								<span class="primary-cell"
									>{market.quoteCurrency?.nameEn ?? market.quoteCurrencyId}</span
								>
								<span class="secondary-label">{market.quoteCurrencyId}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</main>

<style>
	table {
		min-width: 920px;
	}
</style>
