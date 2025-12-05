const CACHE_NAME = 'terreno-v4'; // Mudei a versão para limpar erros antigos
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições do Firebase e externas
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebase') ||
      event.request.url.includes('storage')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});
