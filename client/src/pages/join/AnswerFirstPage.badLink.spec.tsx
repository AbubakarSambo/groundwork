import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/answer" element={<AnswerFirstPage />} /></Routes>
    </MemoryRouter>,
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
