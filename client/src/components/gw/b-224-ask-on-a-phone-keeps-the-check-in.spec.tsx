import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { useAskStore } from '@/stores/ask'

/**
 * B-224: ASK ON A PHONE LOSES THE CHECK-IN.
 *
 * At 390, pressing "Ask" from a board sent `{"message":"What is still open on this board?"}`
 * with no `groundId` at all; the same question at 1440 (where the drawer stays beside the board,
 * never navigating anywhere) carried it. On a computer, `AskGroundwork` reads which check-in it is
 * about from the still-current address (`checkInOnThisPage`) - on a phone, "Ask" navigates away to
 * `/chat` first, so by the time anything reads the address it already says `/chat`, with nothing
 * of the board's own left in it.
 *
 * Fixed in AppShell's phone redirect: the check-in is read from the address BEFORE navigating
 * away, and carried across as `?ground=`, read by AskPage.tsx as a fallback `aboutGroundId` - a
 * name of its own, not `?about=`, which already means something else to that page (B-210's
 * first-insight link, which also asks its own canned question).
 */
vi.mock('@/lib/a-phone-is-not-a-narrow-desktop', () => ({ useIsAPhone: () => true, A_PHONE_ENDS_AT: 640 }))

const USER = { id: 'u1', email: 'aisha@x.test', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Mawe' }

function LocationSpy({ onChange }: { onChange: (pathname: string, search: string) => void }) {
  const location = useLocation()
  onChange(location.pathname, location.search)
  return null
}

function mount(path: string) {
  useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as any)
  useAskStore.setState({ open: false, pendingMessage: null, openedFromCheckInSetupGroundId: null })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  qc.setQueryData(['my-waiting'], { waiting: false })
  qc.setQueryData(['grounds'], [])
  qc.setQueryData(['my-organizations'], [])
  let seen = { pathname: '', search: '' }
  const utils = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AppShell>
          <Routes>
            <Route path="*" element={<LocationSpy onChange={(p, s) => { seen = { pathname: p, search: s } }} />} />
          </Routes>
        </AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, seen: () => seen }
}

describe('Ask on a phone keeps the check-in it was asked from', () => {
  it('pressing Ask from a board (/grounds/:id/board) carries the ground id to /chat', async () => {
    const { seen } = mount('/grounds/g1/board')
    await act(async () => { useAskStore.getState().showWith('What is still open on this board?') })
    expect(seen().pathname).toBe('/chat')
    expect(new URLSearchParams(seen().search).get('ground')).toBe('g1')
  })

  it('pressing Ask from the bare ground page (/grounds/:id) also carries it', async () => {
    const { seen } = mount('/grounds/g1')
    await act(async () => { useAskStore.getState().show() })
    expect(seen().pathname).toBe('/chat')
    expect(new URLSearchParams(seen().search).get('ground')).toBe('g1')
  })

  it('pressing Ask from a page with no check-in of its own (/company) carries nothing extra', async () => {
    const { seen } = mount('/company')
    await act(async () => { useAskStore.getState().show() })
    expect(seen().pathname).toBe('/chat')
    expect(seen().search).toBe('')
  })
})
