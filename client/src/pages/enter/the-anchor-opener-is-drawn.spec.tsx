import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { THE_ANCHOR_FIRST_QUESTION } from './TheSetup'

/**
 * DECISION 114, "THE ANCHOR'S ENTRY OPENING... THROUGH THE ORDINARY ROUTES" (docs/decisions-merged.md;
 * docs/answers-from-engine.md, "8 October (later): the anchor through the ordinary routes, route by
 * route"). `POST /entry/opener` now answers for "Help my team understand" with the anchor's full
 * opening - the hook's two sentences, then "Tell me what you are trying to get across." and its
 * first question - exactly as it would for any scenario that has one. This checks that `EntryChatPage
 * .tsx` draws that served text, not the page's own fallback constant, once the call succeeds; and
 * that it still falls back to `THE_ANCHOR_FIRST_QUESTION` if the opener call itself fails, so a
 * dropped request never leaves the lead looking at a blank chat.
 */

const onboardStream = vi.fn().mockResolvedValue({ reply: 'What is going on for you right now?', extracted: {} })
const anchorStart = vi.fn().mockResolvedValue({
  available: true, scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor',
  groundLabel: 'Help my team understand', source: null,
  firstQuestion: "What's happening right now that makes you wish your team saw more of what you see?",
})
const opener = vi.fn()
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: (...a: unknown[]) => opener(...a),
    chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
  },
  entryAnchorApi: { start: (...a: unknown[]) => anchorStart(...a) },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function openAnchorArrival() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start?scenario=HELP_TEAM_UNDERSTAND']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  onboardStream.mockClear()
  anchorStart.mockClear()
  opener.mockClear()
})

describe('the anchor opener, served like any scenario’s', () => {
  it('draws the opener’s own reply, ending in the first question, once /entry/opener answers', async () => {
    const theFullOpening = [
      'You know what it takes to keep the work, customers and company moving. Does your team?',
      'For one month, Groundwork will check in with each person one to one, to help everyone understand how their work connects, contribute more, and move in the same direction. You can add up to 20 people, yourself included.',
      'Tell me what you are trying to get across. What is going on for your team right now that makes you wish they saw more of what you see?',
    ].join('\n\n')
    opener.mockResolvedValue({ reply: theFullOpening })
    const { container } = openAnchorArrival()
    // The bubble keeps the served text's own line breaks (white-space: pre-wrap, one text node),
    // so the whole reply is checked against the messages column's own text at once.
    await waitFor(() => expect(container.querySelector('.gwui-ec-messages')?.textContent).toBe(theFullOpening))
    /* Request 196: the opener is also asked for `source` (undefined here - no `?source=` on this
       arrival), since a scenario with its own `thePeopleStep` rides on the very same call. */
    expect(opener).toHaveBeenCalledWith('HELP_TEAM_UNDERSTAND', undefined)
    // Never the page’s own fallback once the engine has answered.
    expect(screen.queryByText(THE_ANCHOR_FIRST_QUESTION)).toBeNull()
  })

  it('falls back to the plan’s own first question if the opener call itself fails', async () => {
    opener.mockRejectedValue(new Error('500'))
    openAnchorArrival()
    expect(await screen.findByText(THE_ANCHOR_FIRST_QUESTION)).toBeTruthy()
  })
})
