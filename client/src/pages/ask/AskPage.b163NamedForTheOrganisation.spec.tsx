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

/*
 * UPDATED 24 OCTOBER (Hafsah: "one stylesheet, the prototype's", and the prototype's structure wins): the prototype's #/chat
 * is the page title "Chat", then the assistant's own panel, which names itself after the organisation ("Ask Baridi"). The
 * name is said once, by the panel (ask-groundwork-as-each-reader-sees-it.spec.tsx); the page no longer repeats it as a
 * second heading. This spec used to pin the page heading to the organisation's name (B-163) and "Chat" as an eyebrow (B-229).
 */
describe('the Ask page is the prototype\'s #/chat: "Chat", then the panel named for the organisation', () => {
  it('is titled "Chat", the word the bottom bar that opens it uses', () => {
    useAuthStore.setState({ user: { id: 'u1', organization: { name: 'Kijani Foods' } } as any })
    renderAsk()
    expect(screen.getByRole('heading', { level: 1, name: 'Chat' })).toBeTruthy()
    expect(screen.getByTestId('ask-box')).toBeTruthy()
  })

  it('does not say the assistant\'s name a second time above its own panel', () => {
    useAuthStore.setState({ user: { id: 'u1', organization: { name: 'Kijani Foods' } } as any })
    renderAsk()
    expect(screen.queryByRole('heading', { name: 'Ask Kijani Foods' })).toBeNull()
    expect(screen.getAllByRole('heading')).toHaveLength(1)
  })
})
