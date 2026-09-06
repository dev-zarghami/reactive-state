<script lang="ts">
	import '../app.css';
	import { configureContainer, setLifecycleAdapter } from '../../../../src';
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	configureContainer({
		debug: import.meta.env.DEV,
		baseDisposalDelay: 10_000,
		hotDisposalDelay: 30_000,
		veryHotDisposalDelay: 60_000,
		maxEntries: 50,
		hotThreshold: 7,
		veryHotThreshold: 15
	});

	setLifecycleAdapter({
		onScopeDispose(cleanup) {
			try {
				onDestroy(cleanup);
				return true;
			} catch {
				return false;
			}
		}
	});

	let { children } = $props();
</script>

<div class="app-shell">
	<header class="site-header">
		<a class="brand" href={resolve('/')}>Home</a>
		<nav aria-label="Example pages">
			<a href={resolve('/currencies')} class:active={page.url.pathname === resolve('/currencies')}>
				Currencies</a
			>
			<a href={resolve('/markets')} class:active={page.url.pathname === resolve('/markets')}
				>Markets</a
			>
		</nav>
	</header>

	{@render children()}
</div>
