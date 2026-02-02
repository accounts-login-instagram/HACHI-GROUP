// Konfigurasi Versi Cache
const CACHE_NAME = 'app-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/unnamed_copy_512x512.png'
];

// --- 1. LIFECYCLE: INSTALL & OFFLINE SUPPORT (PRE-CACHING) ---
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  // Paksa SW baru untuk segera aktif tanpa menunggu tab ditutup
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// --- 2. LIFECYCLE: ACTIVATE (CLEANUP) ---
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  // Agar SW segera mengontrol semua tab yang terbuka
  event.waitUntil(clients.claim());

  // Hapus cache versi lama jika ada update
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// --- 3. FETCH: OFFLINE LOGIC (Cache First, Network Fallback) ---
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Jika ada di cache, gunakan cache. Jika tidak, fetch dari network.
      return response || fetch(event.request).catch(() => {
        // Jika fetch network gagal (offline) dan request adalah navigasi halaman (HTML)
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// --- 4. PUSH NOTIFICATIONS ---
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');

  let data = { title: 'Notifikasi Baru', body: 'Ada pesan baru untuk Anda!' };

  if (event.data) {
    try {
      data = event.data.json(); // Mengasumsikan payload JSON
    } catch (e) {
      data.body = event.data.text(); // Fallback jika string biasa
    }
  }

  const options = {
    body: data.body,
    icon: '/unnamed_copy_512x512.png',
    badge: '/unnamed_copy_512x512.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' } // URL tujuan saat diklik
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle klik pada notifikasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// --- 5. BACKGROUND SYNC ---
// Berguna untuk mengirim data (misal: formulir) saat koneksi kembali online
self.addEventListener('sync', (event) => {
  if (event.tag === 'kirim-data-pending') {
    console.log('[Service Worker] Background Syncing data...');
    event.waitUntil(syncDataPending());
  }
});

function syncDataPending() {
  // Logika untuk mengambil data dari IndexedDB dan mengirim ke Server
  return new Promise((resolve) => {
    console.log('Mengirim data pending ke server...');
    // Contoh simulasi fetch
    setTimeout(resolve, 1000); 
  });
}

// --- 6. PERIODIC SYNC ---
// Berguna untuk update konten di background (misal: berita) secara berkala
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-konten-berkala') {
    console.log('[Service Worker] Periodic Sync triggered');
    event.waitUntil(updateContent());
  }
});

async function updateContent() {
  console.log('Mengambil konten terbaru di background...');
  // Logika update cache dengan data baru dari API
  const cache = await caches.open(CACHE_NAME);
  await cache.add('/berita-terbaru.json');
}
