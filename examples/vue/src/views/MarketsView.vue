<script setup lang="ts">
import {onMounted} from 'vue'
import {useMarketsQuery} from '../../../queries/markets/markets.query'
import {useRef} from "@/hooks/useRef.ts";

const marketsQuery = useMarketsQuery()

const marketsLoading = useRef(marketsQuery.loading$, false)
const marketsError = useRef(marketsQuery.error$, null)
const marketsData = useRef(marketsQuery.data$.with(['baseCurrency', 'quoteCurrency']), [])

onMounted(() => {
  marketsQuery.execute()
  return () => marketsQuery.cancel()
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

      <button class="action-button" type="button" :disabled="marketsLoading" @click="()=>marketsQuery.execute()">
        {{ marketsLoading ? 'Loading…' : 'Refresh' }}
      </button>
    </section>

    <p v-if="marketsError" class="status error" role="alert">{{ marketsError.message }}</p>
    <p v-else-if="marketsLoading && !marketsData?.length" class="status">Loading markets…</p>
    <p v-else-if="!marketsData?.length" class="status">No markets returned.</p>

    <div v-else class="table-shell" :aria-busy="marketsLoading">
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
        <tr v-for="market in marketsData" :key="market.id">
          <td class="primary-cell">{{ market.symbol }}</td>
          <td>{{ market.price }}</td>
          <td>{{ market.price24h }}</td>
          <td>{{ market.volume24h }}</td>
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
