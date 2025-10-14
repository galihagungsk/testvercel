const CACHE_NAME = "simulasi-kredit-online-v3";
const FILES_TO_CACHE = [
  "./", // index.html
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
];

// Saat install: cache semua file statis
self.addEventListener("install", (event) => {
  console.log("📦 Service Worker: Install");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Saat activate: hapus cache lama
self.addEventListener("activate", (event) => {
  console.log("🔁 Service Worker: Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🧹 Menghapus cache lama:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Saat fetch: ambil dari cache dulu, baru jaringan
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request)
          .then((fetchRes) => {
            // Simpan hasil fetch baru ke cache
            return caches.open(CACHE_NAME).then((cache) => {
              // ❌ Abaikan request dari ekstensi Chrome
              if (event.request.url.startsWith("chrome-extension://")) {
                return fetchRes;
              }

              // ✅ Simpan hanya file dari web kamu
              cache.put(event.request, fetchRes.clone());
              return fetchRes;
            });
          })
          .catch(() => caches.match("./index.html"))
      ); // fallback kalau offline
    })
  );
});
