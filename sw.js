const CACHE = 'budget-v2';
const SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Never cache: Netlify function calls, Plaid CDN, Google Fonts
  if (url.pathname.startsWith('/.netlify/') ||
      url.hostname.includes('plaid.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com')) {
    return;
  }

  // Cache-first for same-origin shell assets, network-update in background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
