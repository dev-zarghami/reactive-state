<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Currency } from '@/queries/currencies/currencies.model'
import type { Market } from '@/queries/markets/markets.model'
import { useMarketsQuery } from '@/queries/markets/markets.query'

const query = useMarketsQuery()
const markets = ref<Array<Market & Partial<Record<'baseCurrency' | 'quoteCurrency', Currency>>>>([])
const loading = ref(false)
const error = ref<Error | null>(null)
const subscriptions: Array<{ unsubscribe(): void }> = []

const hasMarkets = computed(() => markets.value.length > 0)

function subscribeToQuery() {
  subscriptions.push(
    query.data$.with(['baseCurrency', 'quoteCurrency']).subscribe((value) => {
      markets.value = value ?? []
    }),
    query.loading$.subscribe((value) => {
      loading.value = value
    }),
    query.error$.subscribe((value) => {
      error.value = value instanceof Error ? value : value ? new Error(String(value)) : null
    }),
  )
}

function refresh() {
  error.value = null
  query.execute()
}

function formatNumber(value: number, maximumFractionDigits = 8) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Math.min(Math.max(maximumFractionDigits, 0), 20),
  }).format(value)
}

onMounted(() => {
  subscribeToQuery()
  refresh()
})

onUnmounted(() => {
  subscriptions.forEach((subscription) => subscription.unsubscribe())
})
</script>

<template>
  <main class="page-shell">
    <section class="page-header">
      <div>
        <p class="eyebrow">Relation query</p>
        <h1>Markets</h1>
        <p class="description">
          Live markets joined with shared base and quote currency queries through RxJS relations.
        </p>
      </div>

      <button class="action-button" type="button" :disabled="loading" @click="refresh">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </section>

    <p v-if="error" class="status error" role="alert">{{ error.message }}</p>
    <p v-else-if="loading && !hasMarkets" class="status">Loading markets…</p>
    <p v-else-if="!hasMarkets" class="status">No markets returned.</p>

    <div v-else class="table-shell" :aria-busy="loading">
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
          <tr v-for="market in markets" :key="market.id">
            <td class="primary-cell">{{ market.symbol }}</td>
            <td>{{ formatNumber(market.price, market.quoteCurrencyPrecision) }}</td>
            <td>{{ formatNumber(market.price24h, market.quoteCurrencyPrecision) }}</td>
            <td>{{ formatNumber(market.volume24h, 2) }}</td>
            <td>
              <span class="primary-cell">
                {{ market.baseCurrency?.nameEn ?? market.baseCurrencyId }}
              </span>
              <span class="secondary-label">{{ market.baseCurrencyId }}</span>
            </td>
            <td>
              <span class="primary-cell">
                {{ market.quoteCurrency?.nameEn ?? market.quoteCurrencyId }}
              </span>
              <span class="secondary-label">{{ market.quoteCurrencyId }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<style scoped>
table {
  min-width: 920px;
}
</style>
