// Fake backend shipped with the examples — run `npm start` in `examples/server/`.
// Swap back to the real API by uncommenting the line below.
// export const BASE_URL = 'https://api.ompfinex.com';
export const BASE_URL = 'http://localhost:4000';

export type FetchContext = {
	signal?: AbortSignal;
	params?: Record<string, string>;
	headers?: Record<string, string>;
};

export async function requestJson<T>(path: string, context: FetchContext = {}): Promise<T> {
	const url = new URL(path, BASE_URL);

	for (const [key, value] of Object.entries(context.params ?? {})) {
		url.searchParams.set(key, value);
	}

	const response = await fetch(url, {
		headers: context.headers,
		signal: context.signal
	});

	if (!response.ok) {
		throw new Error(`${path} failed with ${response.status} ${response.statusText}`);
	}

	return (await response.json()) as T;
}
