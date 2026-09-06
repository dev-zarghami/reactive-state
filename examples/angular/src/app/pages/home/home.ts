import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-home',
  styles: [],
  template: `
    <main class="page-shell home-page">
      <p class="eyebrow">Angular example</p>
      <h1>Reactive queries.<br />Framework lifecycle.</h1>
      <p class="description">
        Browse live OMPFinex data through shared, relation-aware queries. Each page demonstrates
        loading, errors, refresh, and scope-driven container cleanup.
      </p>

      <section class="route-grid" aria-label="Example routes">
        <a class="route-card" routerLink="/currencies">
          <span class="card-index">01</span>
          <h2>Currencies</h2>
          <p>Inspect validated currency DTOs mapped into reactive domain models.</p>
          <span class="card-link">Open currencies →</span>
        </a>

        <a class="route-card" routerLink="/markets">
          <span class="card-index">02</span>
          <h2>Markets</h2>
          <p>Join each market with shared base and quote currency queries.</p>
          <span class="card-link">Open markets →</span>
        </a>
      </section>
    </main>
  `,
})
export class Home {}
