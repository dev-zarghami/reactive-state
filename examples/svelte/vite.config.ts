import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.pr
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	server: {
		port: 4100,
		proxy: {
			'/api': {
				changeOrigin: true,
				proxyTimeout: 30_000,
				timeout: 30_000,
				target: 'https://api.ompfinex.com',
				secure: true,
				cookieDomainRewrite: 'localhost',
				rewrite: (p) => p.replace(/^\/api/, '') // Remove /features prefix
			}
		}
	}
});
