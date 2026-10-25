import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { OfflineNote } from './OfflineNote'

/**
 * B-113: the connection drops while the app is already open. There is no offline queue (item 19),
 * so the note must say only the true thing - not the prototype's mid-check-in wording, which
 * promises answers "send when you're back", something this product does not do.
 */

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

describe('OfflineNote', () => {
  afterEach(() => setOnline(true))

  it('shows nothing while the connection is up', () => {
    setOnline(true)
    render(<OfflineNote />)
    expect(screen.queryByText(/offline/i)).toBeNull()
  })

  it('shows the same offline sentence as offline.html as soon as the page is already offline', () => {
    setOnline(false)
    render(<OfflineNote />)
    expect(screen.getByText("You’re offline. Reconnect to carry on.")).toBeTruthy()
  })

  it('appears the moment the browser fires "offline", and clears on "online" - no reload needed', () => {
    setOnline(true)
    render(<OfflineNote />)
    expect(screen.queryByText(/offline/i)).toBeNull()

    act(() => { setOnline(false); window.dispatchEvent(new Event('offline')) })
    expect(screen.getByText(/You’re offline/)).toBeTruthy()

    act(() => { setOnline(true); window.dispatchEvent(new Event('online')) })
    expect(screen.queryByText(/offline/i)).toBeNull()
  })

  it('never promises anything will be sent later - there is no offline queue', () => {
    setOnline(false)
    render(<OfflineNote />)
    expect(screen.queryByText(/sends when you/i)).toBeNull()
    expect(screen.queryByText(/waiting to send/i)).toBeNull()
  })
})
