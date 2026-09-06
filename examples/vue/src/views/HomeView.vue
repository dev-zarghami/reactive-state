<template>
  <main class="page-shell home-page">
    <p class="eyebrow">Vue example</p>
    <h1>Reactive queries.<br />Framework lifecycle.</h1>
    <p class="description">
      Browse live OMPFinex data through shared, relation-aware queries. Each page demonstrates
      loading, errors, refresh, and scope-driven container cleanup.
    </p>

    <section class="route-grid" aria-label="Example routes">
      <RouterLink class="route-card" to="/currencies">
        <span class="card-index">01</span>
        <h2>Currencies</h2>
        <p>Inspect validated currency DTOs mapped into reactive domain models.</p>
        <span class="card-link">Open currencies →</span>
      </RouterLink>

      <RouterLink class="route-card" to="/markets">
        <span class="card-index">02</span>
        <h2>Markets</h2>
        <p>Join each market with shared base and quote currency queries.</p>
        <span class="card-link">Open markets →</span>
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.home-page {
  padding-top: clamp(4rem, 10vw, 8rem);
}

.home-page h1 {
  max-width: 900px;
}

.route-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 3rem;
}

.route-card {
  display: flex;
  min-height: 260px;
  padding: 1.5rem;
  border: 1px solid #dde2ee;
  border-radius: 1rem;
  background: white;
  box-shadow: 0 16px 45px rgb(45 57 94 / 6%);
  text-decoration: none;
  flex-direction: column;
  transition:
    border-color 150ms ease,
    transform 150ms ease;
}

.route-card:hover {
  border-color: #aab4ef;
  transform: translateY(-3px);
}

.card-index {
  color: #8d96aa;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

h2 {
  margin: auto 0 0.5rem;
  color: #202a44;
  font-size: 2rem;
}

.route-card p {
  max-width: 420px;
  margin: 0 0 1.5rem;
  color: #677087;
  line-height: 1.55;
}

.card-link {
  color: #4054c7;
  font-weight: 750;
}

@media (max-width: 700px) {
  .route-grid {
    grid-template-columns: 1fr;
  }
}
</style>
