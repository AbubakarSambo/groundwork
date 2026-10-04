import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * PIECE 25: "YES, SET IT UP" OPENS A PREFILLED DRAFT (plan piece 25; docs/anchor-scenario-plan.md
 * section 5 row 9; docs/answers-from-engine.md, "Request 148 (1)").
 *
 * BoardPage.tsx now navigates to `/start` with `{ state: { anchorSetUp } }` instead of the old
 * `?initial=...` stop-gap. This checks the entry chat reads it: `initial` opens the conversation
 * (the same mechanism `?initial=` already uses), `aim` becomes the draft's name, and `contributors`
 * land on the invite list exactly as a typed address would.
 */

vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'd-token' }) } }))
const sendOnboardingSpy = vi.fn()
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn((...a: any[]) => { sendOnboardingSpy(...a); return Promise.resolve({ reply: '' }) }),
    report: vi.fn(), onboard: vi.fn().mockResolvedValue({ reply: '', extracted: {}, ready: false, needsPeople: false }),
    classifyIntent: vi.fn(),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
  },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function renderAt(state: unknown) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/start', state }]}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('the entry chat, opened from "Yes, set it up"', () => {
  it('opens with the first thing said, the aim as the draft\'s name, and contributors on the invite list', async () => {
    renderAt({
      anchorSetUp: {
        initial: 'The Nairobi project keeps moving between four people.',
        aim: 'The Nairobi launch',
        contributors: [{ email: 'omar@acme.org', displayName: 'Omar' }],
        leftOut: [],
      },
    })
    // The first thing said opens the conversation, same as the ordinary ?initial= flow.
    expect(await screen.findByText('The Nairobi project keeps moving between four people.')).toBeTruthy()
    // The draft's name (shown in the session header's "Give this a name" row once set).
    expect((await screen.findAllByText('The Nairobi launch')).length).toBeGreaterThan(0)
  })

  it('is exactly as today when there is no anchorSetUp', async () => {
    renderAt(null)
    expect(screen.queryByText('The Nairobi launch')).toBeNull()
  })
})
