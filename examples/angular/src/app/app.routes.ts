import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  {
    path: 'currencies',
    loadComponent: () => import('./pages/currencies/currencies').then((m) => m.Currencies),
  },
  { path: 'markets', loadComponent: () => import('./pages/markets/markets').then((m) => m.Markets) },
];
