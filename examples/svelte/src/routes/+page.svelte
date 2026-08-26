<script lang="ts">
    import {useMarketsQuery} from "$lib/queries/markets/markets.query";
    import {onDestroy, onMount} from "svelte";

    const marketsService = useMarketsQuery()

    const loading = marketsService.loading$
    const error = marketsService.error$
    const data = marketsService.data$

    const dataWithCurrencies = data.with(['currencies'])

    loading.subscribe((value) => {
        console.log(value)
    });

    error.subscribe((value) => {
        console.log(value)
    });

    onMount(() => {
        marketsService.execute({
            headers: {},
            query: {}
        })

        /* OR */

        marketsService.execute({
            headers: {},
            query: {}
        }, {
            next: (data) => {
                console.log(data)
            },
            error: (error) => {
                console.error(error)
            },
        })
    })


    onDestroy(() => {
        marketsService.dispose()
    })

</script>