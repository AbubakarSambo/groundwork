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
