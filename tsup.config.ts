import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts'
  ],
  format: ['cjs', 'esm'],
  // Emit `index.cjs` / `index.mjs` so the `main` + `exports.require` paths in
  // package.json resolve. tsup's default for CJS is `index.js`, which does not.
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.mjs' };
  },
  dts: true,
  splitting: true,
  sourcemap: true,
  bundle: true,
  clean: true,
  outDir: 'dist',
  external: ['rxjs', 'valibot']
});
