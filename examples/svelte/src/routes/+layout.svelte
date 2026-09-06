<script lang="ts">
    import {configureContainer, setLifecycleAdapter} from '../../../../src';
    import {onDestroy} from "svelte";

    configureContainer({
        debug: import.meta.env.DEV,
        baseDisposalDelay: 10_000,
        hotDisposalDelay: 30_000,
        veryHotDisposalDelay: 60_000,
        maxEntries: 50,
        hotThreshold: 7,
        veryHotThreshold: 15,
    });

    setLifecycleAdapter({
        onScopeDispose(cleanup) {
            try {
                onDestroy(cleanup);
                return true;
            } catch {
                return false;
            }
        },
    });

    let {children} = $props();
</script>

<div class="flex items-center justify-center gap-10">
    <a href="/">Main</a>
    <a href="/markets">Markets</a>
    <a href="/currencies">Currencies</a>
</div>
{@render children()}
