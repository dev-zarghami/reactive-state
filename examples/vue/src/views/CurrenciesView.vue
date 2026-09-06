<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Currency } from '@/queries/currencies/currencies.model'
import { useCurrenciesQuery } from '@/queries/currencies/currencies.query'

const query = useCurrenciesQuery()
const currencies = ref<Currency[]>([])
const loading = ref(false)
const error = ref<Error | null>(null)
const subscriptions: Array<{ unsubscribe(): void }> = []
const failedIcons = ref(new Set<string>())

const hasCurrencies = computed(() => currencies.value.length > 0)

function subscribeToQuery() {
  subscriptions.push(
    query.data$.subscribe((value) => {
      currencies.value = value ?? []
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

function hideBrokenIcon(symbol: string) {
  failedIcons.value = new Set(failedIcons.value).add(symbol)
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
        <p class="eyebrow">Live query</p>
        <h1>Currencies</h1>
        <p class="description">
          Currency payloads validated with Valibot and published through a shared query container.
        </p>
      </div>

      <button class="action-button" type="button" :disabled="loading" @click="refresh">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </section>

    <p v-if="error" class="status error" role="alert">{{ error.message }}</p>
    <p v-else-if="loading && !hasCurrencies" class="status">Loading currencies…</p>
    <p v-else-if="!hasCurrencies" class="status">No currencies returned.</p>

    <div v-else class="table-shell" :aria-busy="loading">
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
          <tr v-for="currency in currencies" :key="currency.symbol">
            <td>
              <span class="currency-cell">
                <img
                  v-if="currency.icon && !failedIcons.has(currency.symbol)"
                  :src="currency.icon"
                  :alt="`${currency.symbol} icon`"
                  @error="hideBrokenIcon(currency.symbol)"
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
