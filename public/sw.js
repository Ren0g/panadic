// public/sw.js – minimalni SW samo da PWA prođe provjeru

self.addEventListener("install", (event) => {
  // odmah aktiviraj novu verziju
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ništa ne cacheamo posebno, samo propuštamo mrežni promet
self.addEventListener("fetch", () => {
  // network-only
});
