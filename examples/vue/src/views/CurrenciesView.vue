<script setup lang="ts">
import {onMounted} from 'vue'
import {useCurrenciesQuery} from '../../../queries/currencies/currencies.query'
import {useRef} from "@/hooks/useRef.ts";

const currenciesQuery = useCurrenciesQuery()

const currenciesLoading = useRef(currenciesQuery.loading$, false)
const currenciesError = useRef(currenciesQuery.error$, null)
const currenciesData = useRef(currenciesQuery.data$.with(['baseCurrency', 'quoteCurrency']), [])

onMounted(() => {
  currenciesQuery.execute()
  return () => currenciesQuery.cancel()
})
</script>

<template>
  <main class="page-shell">
    <section class="page-header">
      <div>
        <p class="eyebrow">Live query</p>
        <h1>Currencies</h1>
        <p class="description">
          Currency payloads validated with Valibot and published through a shared query container.
        </p>
      </div>

      <button class="action-button" type="button" :disabled="currenciesLoading" @click="currenciesQuery.execute()">
        {{ currenciesLoading ? 'Loading…' : 'Refresh' }}
      </button>
    </section>

    <p v-if="currenciesError" class="status error" role="alert">{{ currenciesError.message }}</p>
    <p v-else-if="currenciesLoading && !currenciesData?.length" class="status">Loading currencies…</p>
    <p v-else-if="!currenciesData?.length" class="status">No currencies returned.</p>

    <div v-else class="table-shell" :aria-busy="currenciesLoading">
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
        <tr v-for="currency in currenciesData" :key="currency.symbol">
          <td>
              <span class="currency-cell">
                <img
                    v-if="currency.icon"
                    :src="currency.icon"
                    :alt="`${currency.symbol} icon`"
                />
                <span v-else class="icon-fallback">{{ currency.symbol.slice(0, 1) }}</span>
                <span class="primary-cell">{{ currency.symbol }}</span>
              </span>
          </td>
          <td>{{ currency.nameEn || '—' }}</td>
          <td lang="fa" dir="rtl">{{ currency.nameFa || '—' }}</td>
          <td>{{ currency.decimal }}</td>
          <td>
              <span :class="['visibility', { visible: currency.isVisible }]">
                {{ currency.isVisible ? 'Visible' : 'Hidden' }}
              </span>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<style scoped>
table {
  min-width: 760px;
}

.currency-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.currency-cell img,
.icon-fallback {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
}

.currency-cell img {
  object-fit: cover;
}

.icon-fallback {
  display: inline-grid;
  color: #4054c7;
  background: #e8ebfb;
  font-size: 0.75rem;
  font-weight: 800;
  place-items: center;
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
