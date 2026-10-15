import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from './auth'
import { queryClient } from '@/lib/queryClient'

/**
 * B-200 (review round 2): A LINK OPENED IN A NEW TAB LEAVES TWO PEOPLE IN THE OLD ONE.
 *
 * `a-link-does-not-mix-two-people.spec.ts` covers the tab a sign-in link is actually opened in
 * (setAuth itself drops the stale cache when the id in THIS tab's own state changes). This covers
 * the other tab - the one that never called setAuth at all, and only learns anything changed from
 * the browser's own `storage` event, which fires in every tab except the one that wrote the key.
 *
 * jsdom does not dispatch `storage` events on its own just because `localStorage` was written in
 * the same tab (real browsers do not either - it is explicitly an OTHER-TAB signal), so each test
 * dispatches the event by hand, the same shape a real cross-tab write produces: a `StorageEvent`
 * on `window` naming the key and the new raw value.
 */
function fireCrossTabWrite(nextUserId: string | null) {
  const value = JSON.stringify({ state: { user: nextUserId ? { id: nextUserId } : null, token: nextUserId ? 't' : null, isAuthenticated: !!nextUserId }, version: 0 })
  window.dispatchEvent(new StorageEvent('storage', { key: 'auth-storage-v2', newValue: value }))
}

describe('a tab that never called setAuth itself still learns the person changed', () => {
  let reload: ReturnType<typeof vi.fn>

  beforeEach(() => {
    useAuthStore.setState({ user: { id: 'grace-1' } as any, token: 'grace-token', isAuthenticated: true, _hasHydrated: true })
    queryClient.clear()
    queryClient.setQueryData(['grounds'], [{ id: 'g1', label: "Grace's ground" }])
    reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true })
  })

  it('reloads when another tab signs in as a different person', () => {
    fireCrossTabWrite('wairimu-1')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads when another tab signs out', () => {
    fireCrossTabWrite(null)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload when the write is the same person (a routine re-read merging a field)', () => {
    fireCrossTabWrite('grace-1')
    expect(reload).not.toHaveBeenCalled()
  })

  it('ignores a storage event for an unrelated key', () => {
    window.dispatchEvent(new StorageEvent('storage', { key: 'gw-something-else', newValue: '1' }))
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads rather than guessing at a value it cannot parse', () => {
    window.dispatchEvent(new StorageEvent('storage', { key: 'auth-storage-v2', newValue: 'not json' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
