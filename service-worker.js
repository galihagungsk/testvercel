const CACHE_NAME = "simulasi-kredit-v1";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
];

self.addEventListener("install", (e) => {
  console.log("📦 Service Worker: Install");
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  console.log("🔁 Service Worker: Activate");
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return (
        res ||
        fetch(e.request)
          .then((fetchRes) => {
            // Abaikan permintaan ekstensi
            if (e.request.url.startsWith("chrome-extension://"))
              return fetchRes;
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, fetchRes.clone());
              return fetchRes;
            });
          })
          .catch(() => caches.match("./index.html"))
      );
    })
  );
});
