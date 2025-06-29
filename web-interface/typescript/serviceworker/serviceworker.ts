const CACHE_NAME = 'BLERemote';
const FILES_TO_CACHE = [
	'index.html',
	'ble.js',
	'style.css',
	'manifest.json',
	'icons/192.png',
	'icons/512.png'
];

self.addEventListener('install', (ev: Event) => {
	const event = ev as ExtendableEvent;

	event.waitUntil(
		caches.open(CACHE_NAME).then(cache => {
			return cache.addAll(FILES_TO_CACHE);
		})
	);
});

self.addEventListener('activate', (ev: Event) => {
	const event = ev as ExtendableEvent;

	let s: ServiceWorkerGlobalScope = <ServiceWorkerGlobalScope><unknown>self;
	event.waitUntil(s.clients.claim()); // sofort Kontrolle übernehmen
});


self.addEventListener('fetch', (ev: Event) => {
	const event = ev as FetchEvent;

	event.respondWith(
		caches.match(event.request).then(response => {
			if (response) {
				console.log("Cached result for " + event.request.url);
			} else {
				console.log("Cache miss for " + event.request.url)
			}

			return response || fetch(event.request);
		})
	);
});


self.addEventListener('message', (ev: Event) => {
	const event = ev as ExtendableMessageEvent;

	if (event.data === 'clearCacheAndReload') {
		console.log("ServiceWorker: Perforce cache invalidation and reload.")
		event.waitUntil(
			caches.delete(CACHE_NAME).then(() => {
				// Nach dem Löschen direkt neu cachen
				return caches.open(CACHE_NAME).then(cache => {
					return cache.addAll(FILES_TO_CACHE);
				});
			})
		);

		// Workaround for typescript 4.8.4 on Debian 12
		let s: ServiceWorkerGlobalScope = <ServiceWorkerGlobalScope><unknown>self;

		s.clients.matchAll({ type: 'window' }).then((clients) => {
			for (const client of clients) {
				client.postMessage('reload');
			}
		});
	}
});
