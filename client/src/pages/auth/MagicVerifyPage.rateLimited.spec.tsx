import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MagicVerifyPage } from './MagicVerifyPage'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

/**
 * B-208 (review round 2): A 429 FROM /auth/verify-email IS "WAIT AND TRY AGAIN", NOT
 * "THAT LINK DIDN'T WORK... ALREADY BEEN USED".
 *
 * A link opened by a hundred people at once (the same throttle a-room-of-people-is-not-one-person
 * already guards elsewhere) used to fall through to `whatTheLinkDid`, which has no case for a 429 -
 * its sentence need not even match any of the patterns that function reads - so the verify flow's
 * generic fallback fired: the "That link didn't work" card, implying the token itself was the
 * problem, when it may well still be entirely good.
 *
 * B-208 (review round 3): THE CARD REPEATED ITSELF AND LED NOWHERE. "Too many tries" as a heading
 * said the same thing the server's own sentence underneath it already said, and the card offered
 * nothing to press - the one way forward was finding the original email and opening the same link
 * again. The heading now says what to do ("Wait a minute"), and a "Try again" button re-asks with
 * this same link; somebody already signed in is also offered "Go to Today".
 */
vi.mock('@/api/auth', () => ({ authApi: { verifyEmail: vi.fn() } }))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn() } }))

function renderPage(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/verify-email?token=${token}`]}>
      <Routes>
        <Route path="/verify-email" element={<MagicVerifyPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

afterEach(() => { useAuthStore.setState({ isAuthenticated: false, user: null, token: null } as any) })

describe('a 429 on the sign-in link', () => {
  it('says to wait, offers a way to try again, and never "didn\'t work"/"already been used"', async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValue({ response: { status: 429, data: { message: undefined } } })
    renderPage('tok-throttled')
    expect(await screen.findByText('Wait a minute')).toBeTruthy()
    expect(screen.queryByText(/didn.t work/i)).toBeNull()
    expect(screen.queryByText(/already been used/i)).toBeNull()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Go to Today' })).toBeNull()
  })

  it('uses the server’s own sentence when it sends one', async () => {
    vi.mocked(authApi.verifyEmail).mockRejectedValue({
      response: { status: 429, data: { message: 'Too many sign-in attempts. Try again in a minute.' } },
    })
    renderPage('tok-throttled-2')
    expect(await screen.findByText('Wait a minute')).toBeTruthy()
    expect(await screen.findByText('Too many sign-in attempts. Try again in a minute.')).toBeTruthy()
  })

  it('signed in, also offers Go to Today', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1', email: 'u1@msingi.test' }, token: 't' } as any)
    vi.mocked(authApi.verifyEmail).mockRejectedValue({ response: { status: 429, data: { message: undefined } } })
    renderPage('tok-throttled-3')
    expect(await screen.findByText('Wait a minute')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeTruthy()
  })
})
