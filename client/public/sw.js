/*
 * THE OFFLINE SHELL (B-113). A real navigation while offline cannot reach the server at all, and
 * with nothing cached the tab went to a blank white page - no mark, no sentence, no way back.
 * This worker does exactly one job: when a page navigation fails because there is no network,
 * hand back the precached static offline.html instead of letting the browser show its own blank
 * failure page.
 *
 * DELIBERATELY NARROW, on purpose:
 *   - It only touches navigation requests (`request.mode === 'navigate'`). Every other request -
 *     the app's JS and CSS, API calls, images, fonts - passes straight through, untouched and
 *     uncached, so this can never serve a stale build or stale data after a deploy.
 *   - Network-first: it always tries the real network before ever reaching for the cached page,
 *     so a working connection is never shadowed by anything cached here.
 *   - The only thing ever placed in the cache is offline.html itself, fetched once on install.
 *
 * KILL SWITCH: if a later deploy removes this file, src/lib/service-worker.ts unregisters any
 * worker a browser already installed from an earlier visit, so removing the file turns the whole
 * thing off. See docs/deploy-notes-screens.md.
 */

const OFFLINE_CACHE = 'groundwork-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  // Take over immediately: this file has no hash in its name, so a new version should replace an
  // old one the moment it is fetched, not wait for every open tab to close first.
  self.skipWaiting()
  event.waitUntil(
    self.caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only a real page navigation is handled here. Anything else (the app's own JS/CSS, API
  // requests, images) is left completely alone - not cached, not intercepted.
  if (request.mode !== 'navigate') return

  event.respondWith(
    self.fetch(request).catch(() =>
      self.caches.open(OFFLINE_CACHE).then((cache) => cache.match(OFFLINE_URL))
    )
  )
})
