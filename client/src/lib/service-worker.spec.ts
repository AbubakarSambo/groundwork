import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerServiceWorker } from './service-worker'

/**
 * B-113: the dev server must never register the offline-shell worker - local work and `vite dev`
 * stay exactly as they were. Only a production build (`isProd: true`, what `import.meta.env.PROD`
 * is at runtime for a real build) registers it, and the kill switch unregisters an existing one
 * whenever that registration fails (for example, a later deploy that removes public/sw.js).
 */

function fakeRegistration() {
  return { unregister: vi.fn() }
}

describe('registerServiceWorker', () => {
  let getRegistrations: ReturnType<typeof vi.fn>
  let register: ReturnType<typeof vi.fn>
  let addEventListener: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getRegistrations = vi.fn().mockResolvedValue([])
    register = vi.fn().mockResolvedValue({})
    addEventListener = vi.spyOn(window, 'addEventListener')
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations, register },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // @ts-expect-error - cleaning up the test double
    delete navigator.serviceWorker
  })

  it('dev never registers it: no load listener, no register() call', () => {
    registerServiceWorker(false)
    expect(register).not.toHaveBeenCalled()
    expect(addEventListener).not.toHaveBeenCalledWith('load', expect.any(Function))
  })

  it('dev cleans up anything a previous production build left behind', () => {
    const existing = fakeRegistration()
    getRegistrations.mockResolvedValue([existing])
    registerServiceWorker(false)
    return Promise.resolve().then(() => {
      expect(existing.unregister).toHaveBeenCalled()
    })
  })

  it('a production build registers /sw.js, once the page has loaded', () => {
    registerServiceWorker(true)
    expect(register).not.toHaveBeenCalled()
    const loadHandler = addEventListener.mock.calls.find((c) => c[0] === 'load')?.[1]
    expect(loadHandler).toBeTypeOf('function')
    loadHandler()
    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('kill switch: a failed registration (the file was removed) unregisters any existing worker', async () => {
    const existing = fakeRegistration()
    register.mockRejectedValue(new Error('404'))
    getRegistrations.mockResolvedValue([existing])
    registerServiceWorker(true)
    const loadHandler = addEventListener.mock.calls.find((c) => c[0] === 'load')?.[1]
    loadHandler()
    await Promise.resolve()
    await Promise.resolve()
    expect(existing.unregister).toHaveBeenCalled()
  })

  it('does nothing where the browser has no serviceWorker at all', () => {
    // @ts-expect-error - cleaning up the test double
    delete navigator.serviceWorker
    expect(() => registerServiceWorker(true)).not.toThrow()
    expect(register).not.toHaveBeenCalled()
  })
})
