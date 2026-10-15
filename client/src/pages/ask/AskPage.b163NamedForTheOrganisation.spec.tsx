import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), finding: vi.fn() } }))
vi.mock('@/components/gw/AskGroundwork', () => ({ AskGroundwork: () => <div data-testid="ask-box" /> }))

import { useAuthStore } from '@/stores/auth'
import { AskPage } from './AskPage'

/**
 * B-163. This page's own heading said "Chat", while the Ask panel it opens is named after the
 * organisation ("Ask Kijani Foods", decision 100) - two different names for the one assistant on
 * the same screen.
 */
function renderAsk() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/chat']}>
        <Routes><Route path="/chat" element={<AskPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('B-163: the Ask page is named for the organisation, not "Chat"', () => {
  it('says "Ask <organisation>" when the signed-in person has one', () => {
    useAuthStore.setState({ user: { id: 'u1', organization: { name: 'Kijani Foods' } } as any })
    renderAsk()
    expect(screen.getByRole('heading', { name: 'Ask Kijani Foods' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Chat' })).toBeNull()
  })

  it('falls back to "Ask Groundwork" with no real organisation name', () => {
    useAuthStore.setState({ user: { id: 'u1', organization: { name: '' } } as any })
    renderAsk()
    expect(screen.getByRole('heading', { name: 'Ask Groundwork' })).toBeTruthy()
  })

  /**
   * B-229 (REVIEW 5): THE PAGE NEVER SAID WHAT OPENED IT. The phone's bottom bar reads "Chat"
   * (A1-look-and-layout/more-menu-phone.txt, layout-phone.txt), and the prototype's own phone
   * screen (ask-on-a-phone.txt) says "Chat" again, right above "Ask Groundwork" - this page went
   * straight to the organisation-named heading with nothing connecting it back to "Chat".
   */
  it('reads "Chat" above the heading, the same word the bottom bar that opens it uses', () => {
    useAuthStore.setState({ user: { id: 'u1', organization: { name: 'Kijani Foods' } } as any })
    renderAsk()
    expect(screen.getByText('Chat')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Chat' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Ask Kijani Foods' })).toBeTruthy()
  })
})
