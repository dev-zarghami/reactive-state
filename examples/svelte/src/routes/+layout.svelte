<script lang="ts">
	import '@reactive/state/svelte';

	let { children } = $props();
</script>

{@render children()}
