import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  bundle: true,
  clean: true,
  outDir: 'dist',
  external: ['rxjs', 'valibot']
});
