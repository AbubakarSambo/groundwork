import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AskGroundwork } from './AskGroundwork'
import { AskPage } from '@/pages/ask/AskPage'
import { useAskStore } from '@/stores/ask'
import type { AskPage as AskPageData } from '@/api/ask'

/**
 * B-112: `AskGroundwork.tsx`'s whole composer used to be gated on `GET /ask` (`useQuery(['ask'],
 * askApi.mine)`) with no `isLoading` or `isError` branch anywhere - a failed or slow load silently
 * removed the question box, with nothing on screen to say why, in both places that mount this
 * component: the desktop drawer and `/chat`, the mobile Ask page. These tests fail before the fix
 * (the box vanishes on an error, and nothing marks a slow load either) and pass after it, for both
 * mounts: the box is always present, disabled while the first load is outstanding, a plain sentence
 * with a working "Try again" appears on a failed load, and the box itself keeps taking a question
 * because what it needs to work - the name, the caption, the send - never depended on this payload.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]), get: vi.fn(), finding: vi.fn() } }))
vi.mock('@/api/ask', () => ({ askApi: { mine: vi.fn(), ask: vi.fn(), answer: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn(), list: vi.fn() } }))

import { askApi } from '@/api/ask'
import { groundsApi } from '@/api/grounds'

const DATA: AskPageData = {
  canAsk: true, about: [], turns: [], askName: 'Ask Baridi', caption: 'Ask about the company, your work or your check-ins.',
  addLine: 'You can also add context or documents to your check-ins here.', welcome: null, starters: [],
}

function drawer() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/today']}>
        <AskGroundwork onClose={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function page() {
  useAskStore.setState({ open: false, pendingMessage: null, openedFromCheckInSetupGroundId: null })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/chat']}>
        <Routes><Route path="/chat" element={<AskPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe.each([
  ['the desktop drawer', drawer],
  ['the mobile Ask page', page],
])('Ask Groundwork, %s', (_label, mount) => {
  beforeEach(() => {
    vi.mocked(askApi.mine).mockReset()
    vi.mocked(groundsApi.list).mockResolvedValue([])
  })

  it('never shows nothing: a box is on screen even while GET /ask is still loading', async () => {
    vi.mocked(askApi.mine).mockImplementation(() => new Promise(() => {})) // never resolves
    mount()
    const box = await screen.findByRole('textbox', { name: /ask a question|ask about/i })
    expect(box).toBeInTheDocument()
  })

  it('a failed load says so in a plain sentence, with a working Try again, and keeps the box usable', async () => {
    vi.mocked(askApi.mine).mockRejectedValueOnce(new Error('network down')).mockResolvedValue(DATA)
    mount()
    expect(await screen.findByText(/ask didn't load fully/i)).toBeInTheDocument()
    expect(screen.getByText(/nothing you've asked is lost/i)).toBeInTheDocument()
    const box = screen.getByRole('textbox', { name: /ask a question|ask about/i }) as HTMLTextAreaElement
    expect(box).not.toBeDisabled()

    const retry = screen.getByRole('button', { name: 'Try again' })
    fireEvent.click(retry)
    await waitFor(() => expect(askApi.mine).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByText(/ask didn't load fully/i)).toBeNull())
    expect(await screen.findByPlaceholderText(DATA.caption)).toBeInTheDocument()
  })

  it('a normal load shows the ordinary, working box with no error on screen', async () => {
    vi.mocked(askApi.mine).mockResolvedValue(DATA)
    mount()
    expect(await screen.findByPlaceholderText(DATA.caption)).toBeInTheDocument()
    expect(screen.queryByText(/didn't load/i)).toBeNull()
    const box = screen.getByPlaceholderText(DATA.caption) as HTMLTextAreaElement
    expect(box).not.toBeDisabled()
    fireEvent.change(box, { target: { value: 'What changed this week?' } })
    vi.mocked(askApi.ask).mockResolvedValue({ blocks: [{ type: 'text', body: 'Nothing new yet.' }] } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('What changed this week?')).toBeInTheDocument()
  })
})
