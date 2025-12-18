const CACHE_NAME = 's1a-ai-v5';
const ASSETS = [
  './index.html',
  './manifest.json',
  './index.tsx',
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Thêm cả các biến thể của trang chủ vào cache
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
  // Chiến lược cho yêu cầu điều hướng (Navigate requests - khi người dùng mở trang/app)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Nếu mạng lỗi hoặc không tìm thấy trang (404), trả về index.html từ cache
          return caches.match('index.html') || caches.match('./');
        })
    );
    return;
  }

  // Chiến lược cho các tài nguyên khác (ảnh, script, css)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).then((networkResponse) => {
        // Nếu là yêu cầu hợp lệ, trả về kết quả mạng
        if (networkResponse && networkResponse.status === 200) {
          return networkResponse;
        }
        // Nếu mạng trả về lỗi (như 404), và là yêu cầu tài liệu, trả về index.html
        if (event.request.destination === 'document') {
          return caches.match('index.html');
        }
        return networkResponse;
      }).catch(() => {
        // Dự phòng cuối cùng cho tài liệu khi offline hoàn toàn
        if (event.request.destination === 'document') {
          return caches.match('index.html');
        }
      });
    })
  );
});