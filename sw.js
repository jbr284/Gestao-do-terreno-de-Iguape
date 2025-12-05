const CACHE_NAME = 'terreno-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// 1. Instalação: Salva os arquivos estáticos (HTML, CSS, JS)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Ativação: Limpa caches antigos se você mudar a versão
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. Interceptação (Fetch): A mágica acontece aqui
self.addEventListener('fetch', (event) => {
  // REGRA IMPORTANTE: Ignorar requisições do Firebase/Google (Firestore)
  // Deixamos o Firebase cuidar da própria conexão e cache de dados
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebase')) {
    return; // Sai da função e deixa a internet funcionar normal
  }

  // Para os nossos arquivos (HTML, CSS), tenta pegar do cache primeiro
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});