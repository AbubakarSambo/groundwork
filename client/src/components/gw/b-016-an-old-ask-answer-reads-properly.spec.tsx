import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AskGroundwork } from './AskGroundwork'
import { useAskStore } from '@/stores/ask'
import type { AskPage as AskPageData } from '@/api/ask'

/**
 * B-016: reopening Ask showed an old answer as "I cannot answer that one yet. Here is what I can
 * do with "Yes".. You could Tell me what you can see, ...?.", with a question mark run straight
 * into a full stop at the end. Each historical turn is only ever the server's own flattened
 * sentence (AskTurn.says, no structured buttons to restore - see
 * an-old-ask-answer-reads-properly.ts and docs/requests-to-engine.md), so this pins that the
 * mechanical double-punctuation seam is at least cleaned up on screen.
 */
vi.mock('@/api/ask', () => ({ askApi: { mine: vi.fn(), ask: vi.fn(), answer: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
import { askApi } from '@/api/ask'

const DATA: AskPageData = {
  canAsk: true,
  about: [],
  turns: [
    { from: 'you', says: 'Yes', at: '2026-09-23T15:00:00Z' },
    { from: 'groundwork', says: 'I cannot answer that one yet. Here is what I can do with "Yes".. You could Tell me what you can see, What am I on?.', at: '2026-09-23T15:00:01Z' },
  ],
  askName: 'Ask Baridi',
  caption: 'Ask about the company, your work or your check-ins.',
  addLine: 'You can also add context or documents to your check-ins here.',
  welcome: null,
  starters: [],
}

beforeEach(() => { vi.clearAllMocks(); useAskStore.setState({ open: false }) })

function panel(data: AskPageData) {
  vi.mocked(askApi.mine).mockResolvedValue(data)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/today']}><AskGroundwork onClose={() => {}} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('reopening Ask reads an old answer with its punctuation cleaned up', () => {
  it('does not run a question mark straight into a full stop, or double a full stop', async () => {
    panel(DATA)
    expect(await screen.findByText(/What am I on\?/)).toBeTruthy()
    expect(screen.queryByText(/\?\./)).toBeNull()
    expect(screen.queryByText(/"Yes"\.\./)).toBeNull()
    /* The person's own "Yes" is never rewritten - only Groundwork's flattened answers are. */
    expect(screen.getByText('Yes')).toBeTruthy()
  })
})
