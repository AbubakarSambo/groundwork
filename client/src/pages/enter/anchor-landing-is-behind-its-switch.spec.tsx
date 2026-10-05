import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnchorLandingPage } from './AnchorLandingPage'
import { THE_ANCHOR_HOOK } from './the-anchor-hook'

/*
 * THE ANCHOR LANDING PAGE, BEHIND ITS SWITCH (plan pieces 1 and 2; request 144 (1), (2) and (3)).
 *
 * The page now asks the engine for real: `GET /entry/anchor-available` decides whether to show
 * itself at all, and `GET /entry/anchor-start` (called once it does) carries the scenario the
 * button hands to the ordinary entry chat, or - on a 404 - the engine's own "not open yet" sentence.
 * `@/api/entry` is mocked so no network call happens in the test; each case sets its own result.
 */

const mockAvailable = vi.fn()
const mockStart = vi.fn()
vi.mock('@/api/entry', () => ({
  entryAnchorApi: { available: (...a: any[]) => mockAvailable(...a), start: (...a: any[]) => mockStart(...a) },
}))

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/start/team" element={<AnchorLandingPage />} />
          <Route path="/start" element={<div>the ordinary door</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the anchor landing page', () => {
  beforeEach(() => {
    mockAvailable.mockReset()
    mockStart.mockReset()
    sessionStorage.clear()
  })

  it('redirects to /start while the switch is off', async () => {
    mockAvailable.mockResolvedValue({ available: false })
    renderAt('/start/team')
    await waitFor(() => expect(screen.getByText('the ordinary door')).toBeTruthy())
    expect(screen.queryByText(THE_ANCHOR_HOOK.heading)).toBeNull()
    expect(mockStart).not.toHaveBeenCalled()
  })

  it('draws nothing yet while the answer has not arrived - never a half-answered page', () => {
    mockAvailable.mockReturnValue(new Promise(() => {})) // never resolves in this render
    const { container } = renderAt('/start/team')
    expect(screen.queryByText(THE_ANCHOR_HOOK.heading)).toBeNull()
    expect(screen.queryByText('the ordinary door')).toBeNull()
    expect(container.textContent).toBe('')
  })

  it('shows Hafsah’s words and one button once the switch is on, entering with the scenario kept', async () => {
    mockAvailable.mockResolvedValue({ available: true })
    mockStart.mockResolvedValue({
      available: true, scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor',
      groundLabel: 'Help my team understand', source: 'founders-whatsapp',
    })
    renderAt('/start/team?source=founders-whatsapp')
    await waitFor(() => expect(screen.getByText(THE_ANCHOR_HOOK.heading)).toBeTruthy())
    expect(screen.getByText(THE_ANCHOR_HOOK.youKnow)).toBeTruthy()
    expect(screen.getByText(THE_ANCHOR_HOOK.doesYourTeam)).toBeTruthy()
    expect(screen.getByText(THE_ANCHOR_HOOK.body)).toBeTruthy()
    expect(mockStart).toHaveBeenCalledWith('founders-whatsapp')
    const button = await screen.findByRole('link', { name: THE_ANCHOR_HOOK.button })
    expect(button.getAttribute('href')).toBe('/start?scenario=HELP_TEAM_UNDERSTAND')
  })

  /**
   * ITEM 2: `thePeopleStep` IS KEPT FOR THE ENTRY CHAT'S PEOPLE STEP (docs/answers-from-engine.md,
   * "Request 149 (2 of 6)"). The button is a fresh page load into `EntryChatPage.tsx`, so this is
   * handed off through `sessionStorage` - the one thing `EntryChatPage.tsx` reads on a fresh mount.
   */
  it('keeps the served thePeopleStep for the entry chat to pick up', async () => {
    mockAvailable.mockResolvedValue({ available: true })
    const served = {
      limit: 20, theLeadCounts: true, mayAdd: 19,
      heading: 'Served heading', intro: 'Served intro', contextLabel: 'Served label',
      button: 'Served button', limitSentence: 'Served limit sentence',
    }
    mockStart.mockResolvedValue({
      available: true, scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor',
      groundLabel: 'Help my team understand', source: null, thePeopleStep: served,
    })
    renderAt('/start/team')
    await waitFor(() => expect(screen.getByText(THE_ANCHOR_HOOK.heading)).toBeTruthy())
    await waitFor(() => expect(sessionStorage.getItem('gw-anchor-people-step')).toBe(JSON.stringify(served)))
  })

  it('leaves nothing behind when anchor-start does not serve thePeopleStep', async () => {
    mockAvailable.mockResolvedValue({ available: true })
    mockStart.mockResolvedValue({
      available: true, scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor',
      groundLabel: 'Help my team understand', source: null,
    })
    renderAt('/start/team')
    await waitFor(() => expect(screen.getByText(THE_ANCHOR_HOOK.heading)).toBeTruthy())
    expect(sessionStorage.getItem('gw-anchor-people-step')).toBeNull()
  })

  /**
   * FAULT 1, ITEM 9: THE ENGINE'S `firstQuestion`, CARRIED THE SAME WAY (request 163 item 9).
   * `EntryChatPage.tsx` reads this once, on a fresh mount, through `takeTheServedFirstQuestion`.
   */
  it('keeps the served firstQuestion for the entry chat to open on', async () => {
    mockAvailable.mockResolvedValue({ available: true })
    mockStart.mockResolvedValue({
      available: true, scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor',
      groundLabel: 'Help my team understand', source: null,
      firstQuestion: 'What is really happening here?',
    })
    renderAt('/start/team')
    await waitFor(() => expect(screen.getByText(THE_ANCHOR_HOOK.heading)).toBeTruthy())
    await waitFor(() => expect(sessionStorage.getItem('gw-anchor-first-question')).toBe('What is really happening here?'))
  })

  it('leaves nothing behind when anchor-start does not serve firstQuestion', async () => {
    mockAvailable.mockResolvedValue({ available: true })
    mockStart.mockResolvedValue({
      available: true, scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor',
      groundLabel: 'Help my team understand', source: null,
    })
    renderAt('/start/team')
    await waitFor(() => expect(screen.getByText(THE_ANCHOR_HOOK.heading)).toBeTruthy())
    expect(sessionStorage.getItem('gw-anchor-first-question')).toBeNull()
  })

  it('shows the engine’s sentence and a link to /start when anchor-start answers 404', async () => {
    mockAvailable.mockResolvedValue({ available: true })
    mockStart.mockRejectedValue(new Error('404'))
    renderAt('/start/team')
    await waitFor(() => expect(screen.getByText('This way in is not open yet.')).toBeTruthy())
    expect(screen.queryByText(THE_ANCHOR_HOOK.heading)).toBeNull()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/start')
  })
})
