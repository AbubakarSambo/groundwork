import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AnswerFirstPage } from './AnswerFirstPage'
import { openLinkApi } from '@/api/entry'

/*
 * WALKTHROUGH PASS 2, ITEM 4: "/answer" WITH NO CODE, OR A CODE THE SERVER REFUSES, USED TO BE A
 * BARE SENTENCE ON A BLANK PAGE - no Groundwork mark, nothing to press. The prototype's own small-
 * state screens (docs/prototype/screens/F4-small-states/) always pair the sentence with a way
 * through; this page now does too.
 */
vi.mock('@/api/entry', () => ({ openLinkApi: { whatThisIs: vi.fn(), start: vi.fn(), say: vi.fn(), finish: vi.fn() } }))

function open(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/answer" element={<AnswerFirstPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('a link with no code at all', () => {
  it('shows the Groundwork mark and a way on, not a bare sentence', async () => {
    open('/answer')
    await waitFor(() => expect(screen.getByText('That link is missing its code.')).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Groundwork' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'go to the Groundwork home page' })).toBeTruthy()
  })

  /* B-158: this state had no heading at all - one of five different readings (or none) the deep
     page audit found for "a link does not work". It now reads "That link didn't work", the
     prototype's own heading for the same state (F4-small-states/badlink.txt). */
  it('also carries the heading every other broken link uses', async () => {
    open('/answer')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'That link didn’t work' })).toBeTruthy())
  })
})

describe('a code the server does not recognise', () => {
  it('shows the server’s sentence, the mark, and a way on', async () => {
    ;(openLinkApi.whatThisIs as any).mockRejectedValue({ response: { data: { message: 'That link does not open anything.' } } })
    open('/answer?t=bad-code')
    await waitFor(() => expect(screen.getByText('That link does not open anything.')).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Groundwork' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy()
  })
})
