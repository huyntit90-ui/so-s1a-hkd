const CACHE_NAME = 's1a-ai-v9';
const ASSETS = [
  'index.html',
  'manifest.json',
  'index.tsx',
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Navigation fallback: Nếu là yêu cầu tải trang, luôn trả về index.html từ cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('index.html');
      })
    );
    return;
  }

  // Cache first, fallback to network cho các tài nguyên khác
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((response) => {
      return response || fetch(event.request);
    })
  );
});