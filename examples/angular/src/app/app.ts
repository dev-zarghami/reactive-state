import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink],
  selector: 'app-root',
  styles: [],
  template: `
    <div class="app-shell">
      <header class="site-header">
        <a class="brand" routerLink="/">Home</a>
        <nav aria-label="Example pages">
          <a routerLink="/currencies">Currencies</a>
          <a routerLink="/markets">Markets</a>
        </nav>
      </header>

      <router-outlet />
    </div>
  `,
})
export class App {}
