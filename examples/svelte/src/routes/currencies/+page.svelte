<script lang="ts">
	import { onMount } from 'svelte';
	import { useCurrenciesQuery } from '../../../../queries/currencies/currencies.query';

	const currenciesQuery = useCurrenciesQuery();

	const currenciesLoading$ = currenciesQuery.loading$;
	const currenciesError$ = currenciesQuery.error$;
	const currenciesData$ = currenciesQuery.data$;

	onMount(() => {
		currenciesQuery.execute();
		return () => currenciesQuery.cancel();
	});
</script>

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
			disabled={$currenciesLoading$}
			onclick={() => currenciesQuery.execute()}
		>
			{$currenciesLoading$ ? 'Loading…' : 'Refresh'}
		</button>
	</section>

	{#if $currenciesError$}
		<p class="status error" role="alert">{$currenciesError$.message}</p>
	{:else if $currenciesLoading$ && !$currenciesData$?.length}
		<p class="status">Loading currencies…</p>
	{:else if !$currenciesData$?.length}
		<p class="status">No currencies returned.</p>
	{:else}
		<div class="table-shell" aria-busy={$currenciesLoading$}>
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
					{#each $currenciesData$ as currency (currency.symbol)}
						<tr>
							<td>
								<span class="primary-cell">{currency.symbol}</span>
							</td>
							<td>{currency.nameEn || '—'}</td>
							<td lang="fa" dir="rtl">{currency.nameFa || '—'}</td>
							<td>{currency.decimal}</td>
							<td>
								<span class="visibility" class:visible={currency.isVisible}>
									{currency.isVisible ? 'Visible' : 'Hidden'}
								</span>
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
		min-width: 760px;
	}

	.visibility {
		display: inline-flex;
		padding: 0.3rem 0.55rem;
		border-radius: 999px;
		color: #7b8499;
		background: #eef0f4;
		font-size: 0.75rem;
		font-weight: 750;
	}

	.visibility.visible {
		color: #16794b;
		background: #e5f6ee;
	}
</style>
