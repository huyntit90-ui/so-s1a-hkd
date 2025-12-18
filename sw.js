const CACHE_NAME = 's1a-ai-v7';
const ASSETS = [
  './index.html',
  './manifest.json',
  './index.tsx',
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Lưu tệp index.html với nhiều khóa khác nhau để đảm bảo luôn tìm thấy
      return cache.addAll([...ASSETS, './', 'index.html']);
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
  // CHIẾN LƯỢC QUAN TRỌNG: Đánh chặn mọi yêu cầu trang web (navigate)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cachedResponse) => {
        // Luôn ưu tiên trả về index.html từ cache trước để tránh 404 từ server
        const networkFetch = fetch(event.request).catch(() => null);
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // Với các tài nguyên khác (ảnh, script)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((response) => {
      return response || fetch(event.request);
    })
  );
});