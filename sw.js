const CACHE_NAME = 'health-tourism-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/connections.html',
  '/dashboard-admin.html',
  '/dashboard-doctor.html',
  '/dashboard-representative.html',
  '/dashboard-tourist.html',
  '/doctor-specialty.html',
  '/doctors.html',
  '/messages.html',
  '/representative-email.html',
  '/requests.html',
  '/role-selection.html',
  '/select-representative.html',

  '/styles.css',

  '/doctor-script.js',
  '/rep-script.js',
  '/role-script.js',
  '/script.js',
  '/select-rep-script.js',
  '/tourist-script.js',

  '/icon.png',
  '/icon-512.png',

  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
