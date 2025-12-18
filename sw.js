const CACHE_NAME = 's1a-ai-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './index.tsx',
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Lưu trữ tất cả các biến thể có thể có của trang chủ
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
  // Chỉ xử lý các yêu cầu điều hướng (khi người dùng mở hoặc tải lại trang)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Nếu mạng trả về 404 (Lỗi không tìm thấy), phục hồi bằng index.html từ cache
          if (response.status === 404) {
            return caches.match('./index.html') || caches.match('./');
          }
          return response;
        })
        .catch(() => {
          // Nếu hoàn toàn mất mạng, lấy từ cache
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // Với các tài nguyên khác (ảnh, script, css)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});