import { bootstrapApplication } from '@angular/platform-browser';
import { DestroyRef, inject } from '@angular/core';
import { configureContainer, setLifecycleAdapter } from '../../../src';
import { appConfig } from './app/app.config';
import { App } from './app/app';

configureContainer({
  debug: !!(globalThis as { ngDevMode?: unknown }).ngDevMode,
  baseDisposalDelay: 10_000,
  hotDisposalDelay: 30_000,
  veryHotDisposalDelay: 60_000,
  maxEntries: 50,
  hotThreshold: 7,
  veryHotThreshold: 15,
});

setLifecycleAdapter({
  onScopeDispose(cleanup) {
    try {
      // `inject` only succeeds while an injection context is active — i.e. when
      // a `defineQuery` accessor is called from a component's constructor or
      // field initializer. Outside one, the caller owns disposal.
      const destroyRef = inject(DestroyRef);
      destroyRef.onDestroy(cleanup);
      return true;
    } catch {
      return false;
    }
  },
});

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
