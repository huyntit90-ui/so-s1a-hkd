const CACHE_NAME = 's1a-ai-v8';
const ASSETS = [
  './index.html',
  './manifest.json',
  './index.tsx',
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Lưu trữ cả ./ và index.html để đảm bảo khả năng khớp cache tối đa
      return cache.addAll([...ASSETS, './']);
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
  // Chỉ can thiệp vào các yêu cầu tải trang (navigation)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Nếu máy chủ trả về 404, dùng ngay bản index.html trong cache để cứu viện
          if (response.status === 404) {
            return caches.match('./index.html');
          }
          return response;
        })
        .catch(() => {
          // Nếu hoàn toàn không có mạng, dùng bản cache
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // Đối với các tài nguyên khác (CSS, JS, Ảnh)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});