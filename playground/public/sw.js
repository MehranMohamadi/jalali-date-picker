// Build replaces these constants after Nuxt has generated every route.
const RELEASE = /* RELEASE */ null
const MANIFEST = /* MANIFEST */ []
const PREFIX = 'budgetyar-web-shell-'
const CACHE = PREFIX + RELEASE?.buildId
const HEALTH = 'budgetyar-web-health-v1'
const HEALTH_URL = new URL('/__budgetyar_health', self.location.origin).href

async function readHealth() {
  const response = await (await caches.open(HEALTH)).match(HEALTH_URL)
  return response ? response.json() : null
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    if (!RELEASE || !MANIFEST.length) throw new Error('Release has not been generated')
    const cache = await caches.open(CACHE)
    try {
      // Sequential writes bound memory on Android and guarantee completion.
      for (const asset of MANIFEST) {
        const response = await fetch(asset.url, { cache: 'no-store', credentials: 'omit' })
        if (!response.ok || new URL(response.url).origin !== self.location.origin) throw new Error(`Download failed: ${asset.url}`)
        const bytes = await response.clone().arrayBuffer()
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
        if (hash !== asset.sha256) throw new Error(`Integrity mismatch: ${asset.url}`)
        // Clean-URL hosting redirects index.html. Cache a non-redirected response
        // so a later navigation can consume it with redirect mode "manual".
        const headers = new Headers(response.headers)
        headers.delete('content-encoding')
        headers.delete('content-length')
        await cache.put(asset.url, new Response(bytes, { status: response.status, statusText: response.statusText, headers }))
      }
    } catch (error) {
      await caches.delete(CACHE)
      throw error
    }
    // A later release can recover a boot failure; this is not local rollback.
    const health = await readHealth().catch(() => null)
    if (health && !health.healthy && Date.now() - health.activatedAt > 120000) await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const previous = await readHealth().catch(() => null)
    await (await caches.open(HEALTH)).put(HEALTH_URL, new Response(JSON.stringify({
      buildId: RELEASE.buildId, activatedAt: Date.now(), healthy: false,
      previous: previous?.healthy ? previous.buildId : previous?.previous,
    })))
    // Keep the previous healthy shell; never delete other applications' caches.
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && key !== CACHE && key !== PREFIX + (previous?.healthy ? previous.buildId : previous?.previous)) await caches.delete(key)
    }
    await self.clients.claim()
  })())
})

self.addEventListener('message', event => {
  if (event.data?.type === 'upgrade') event.waitUntil(self.skipWaiting())
  if (event.data?.type === 'version') event.ports[0]?.postMessage(RELEASE)
  if (event.data?.type === 'healthy' && event.data.buildId === RELEASE.buildId) {
    event.waitUntil((async () => {
      const health = await readHealth()
      if (health?.buildId === RELEASE.buildId) await (await caches.open(HEALTH)).put(HEALTH_URL, new Response(JSON.stringify({ ...health, healthy: true })))
    })())
  }
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  if (['/sw.js', '/version.json', '/application-shell.json'].includes(url.pathname)) return
  let path = url.pathname
  if (request.mode === 'navigate') path = path.endsWith('/') ? path + 'index.html' : path.includes('.') ? path : path + '/index.html'
  const asset = MANIFEST.find(entry => entry.url === path)
  if (!asset && request.mode !== 'navigate' && !url.pathname.startsWith('/_nuxt/')) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const cached = await cache.match(asset ? asset.url : request.mode === 'navigate' ? '/index.html' : url.pathname)
    if (cached) return cached
    // An edited tab may still need a hashed chunk from the previous healthy build.
    if (url.pathname.startsWith('/_nuxt/')) {
      for (const key of await caches.keys()) {
        if (!key.startsWith(PREFIX) || key === CACHE) continue
        const previous = await (await caches.open(key)).match(url.pathname)
        if (previous) return previous
      }
    }
    return fetch(request)
  })())
})
