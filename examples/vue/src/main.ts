import { createApp, getCurrentScope, onScopeDispose } from 'vue'
import { configureContainer, setLifecycleAdapter } from '../../../src'
import App from './App.vue'
import router from './router'

configureContainer({
  debug: true,
  baseDisposalDelay: 10_000,
  hotDisposalDelay: 30_000,
  veryHotDisposalDelay: 60_000,
  maxEntries: 50,
  hotThreshold: 7,
  veryHotThreshold: 15,
})

setLifecycleAdapter({
  onScopeDispose(cleanup) {
    if (!getCurrentScope()) return false
    onScopeDispose(cleanup)
    return true
  },
})

createApp(App).use(router).mount('#app')
