import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import vm from 'vm'

/**
 * B-113's unit test for public/sw.js itself. A service worker file is not an ES module and is
 * never imported by the app's own code (it is fetched and run by the browser as a worker script),
 * so this loads its source text and runs it in a sandboxed `self`, the same global the real worker
 * script sees, with `addEventListener`, `caches` and `fetch` all faked so the handlers can be
 * exercised directly.
 *
 * What matters most for B-113's "build it safely" rule, proven here: a failed navigation gets the
 * cached offline.html, anything that is not a navigation is left completely alone, and nothing
 * other than offline.html is ever put in the cache.
 */
function loadWorker() {
  const code = readFileSync(join(__dirname, '..', '..', 'public', 'sw.js'), 'utf8')
  const listeners: Record<string, (event: any) => void> = {}
  const cache = {
    add: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue('OFFLINE_PAGE_RESPONSE'),
  }
  const self: any = {
    addEventListener: (type: string, handler: (event: any) => void) => { listeners[type] = handler },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
    caches: { open: vi.fn().mockResolvedValue(cache) },
    fetch: vi.fn(),
  }
  const sandbox = { self }
  vm.createContext(sandbox)
  vm.runInContext(code, sandbox)
  return { listeners, self, cache }
}

function fakeEvent(request: { mode: string }) {
  let responder: Promise<unknown> | undefined
  return {
    request,
    respondWith: (p: Promise<unknown>) => { responder = p },
    waitUntil: (p: Promise<unknown>) => p,
    get response() { return responder },
  }
}

describe('public/sw.js, the offline-shell service worker', () => {
  it('registers install, activate and fetch, and takes over immediately (no hash in its filename)', () => {
    const { listeners, self } = loadWorker()
    expect(listeners.install).toBeTypeOf('function')
    expect(listeners.activate).toBeTypeOf('function')
    expect(listeners.fetch).toBeTypeOf('function')

    const installEvent = { waitUntil: vi.fn() }
    listeners.install(installEvent)
    expect(self.skipWaiting).toHaveBeenCalled()
    expect(installEvent.waitUntil).toHaveBeenCalled()

    const activateEvent = { waitUntil: vi.fn() }
    listeners.activate(activateEvent)
    expect(activateEvent.waitUntil).toHaveBeenCalled()
  })

  it('install precaches exactly one thing: offline.html, nothing else', async () => {
    const { listeners, self, cache } = loadWorker()
    const installEvent = { waitUntil: (p: Promise<unknown>) => p }
    await listeners.install(installEvent)
    expect(self.caches.open).toHaveBeenCalledWith('groundwork-offline-v1')
    expect(cache.add).toHaveBeenCalledWith('/offline.html')
    expect(cache.add).toHaveBeenCalledTimes(1)
  })

  it('a navigation that fails returns the cached offline.html', async () => {
    const { listeners, self } = loadWorker()
    self.fetch.mockRejectedValue(new Error('no network'))
    const event = fakeEvent({ mode: 'navigate' })
    listeners.fetch(event)
    const result = await event.response
    expect(result).toBe('OFFLINE_PAGE_RESPONSE')
  })

  it('a navigation that succeeds is left to the real network - the cache is never reached for it', async () => {
    const { listeners, self, cache } = loadWorker()
    self.fetch.mockResolvedValue('REAL_PAGE_RESPONSE')
    const event = fakeEvent({ mode: 'navigate' })
    listeners.fetch(event)
    const result = await event.response
    expect(result).toBe('REAL_PAGE_RESPONSE')
    expect(cache.match).not.toHaveBeenCalled()
  })

  it('anything that is not a navigation - the app JS/CSS, an API call, an image - is untouched: respondWith is never called, nothing is cached', () => {
    const { listeners, self } = loadWorker()
    for (const mode of ['same-origin', 'no-cors', 'cors', undefined]) {
      const event = fakeEvent({ mode: mode as string })
      listeners.fetch(event)
      expect(event.response).toBeUndefined()
    }
    expect(self.fetch).not.toHaveBeenCalled()
    expect(self.caches.open).not.toHaveBeenCalled()
  })
})
