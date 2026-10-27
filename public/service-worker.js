const CACHE_NAME = 'wamghomschool-v7-animated-intro'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/intro/wamghomschool_intro_animatic.html',
  '/images/app-logo.png',
  '/images/school-logo.png',
  '/icons/app-favicon-64.png',
  '/icons/app-apple-touch-180.png',
  '/icons/app-icon-192.png',
  '/icons/app-icon-512.png',
  '/icons/icon-512.png',
]

async function cacheApplication() {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(APP_SHELL)
  const response = await fetch('/index.html')
  const html = await response.clone().text()
  const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path.startsWith('/'))
  await cache.addAll([...new Set(assetPaths)])
  await cache.put('/index.html', response)
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheApplication())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Les réponses de l'API sont privées et évolutives : IndexedDB gère les
  // données hors ligne, le cache du service worker ne doit jamais les figer.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
      }
      return response
    })),
  )
})
