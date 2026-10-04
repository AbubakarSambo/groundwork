import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AnchorLandingPage } from './AnchorLandingPage'
import { THE_ANCHOR_HOOK } from './the-anchor-hook'

/*
 * THE ANCHOR LANDING PAGE, BEHIND ITS SWITCH (plan piece 2).
 *
 * `anchorScenarioIsOnForAStranger` is the one function this page asks, and today it always returns
 * false (request 144: the engine serves `anchorScenarioOn` only to someone signed in, not to a
 * stranger following a shared link). So the first test needs no mock at all - it is what a real
 * visitor sees right now. The second mocks that one function to prove the page's own "on" branch
 * (which nothing can reach live yet) says Hafsah's words and draws one button, so the branch is not
 * silently broken while it waits for the engine.
 */

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/start/team" element={<AnchorLandingPage />} />
        <Route path="/start" element={<div>the ordinary door</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('the anchor landing page', () => {
  it('redirects to /start today, since the engine has no public signal yet', () => {
    renderAt('/start/team')
    expect(screen.getByText('the ordinary door')).toBeTruthy()
    expect(screen.queryByText(THE_ANCHOR_HOOK.heading)).toBeNull()
  })

  it('shows Hafsah’s words and one button once the switch is on', async () => {
    vi.resetModules()
    vi.doMock('./anchor-scenario-is-on', () => ({ anchorScenarioIsOnForAStranger: () => true }))
    const { AnchorLandingPage: OnVariant } = await import('./AnchorLandingPage')
    render(
      <MemoryRouter initialEntries={['/start/team']}>
        <Routes>
          <Route path="/start/team" element={<OnVariant />} />
          <Route path="/start" element={<div>the ordinary door</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText(THE_ANCHOR_HOOK.heading)).toBeTruthy()
    expect(screen.getByText(THE_ANCHOR_HOOK.youKnow)).toBeTruthy()
    expect(screen.getByText(THE_ANCHOR_HOOK.doesYourTeam)).toBeTruthy()
    expect(screen.getByText(THE_ANCHOR_HOOK.body)).toBeTruthy()
    const buttons = screen.getAllByRole('link', { name: THE_ANCHOR_HOOK.button })
    expect(buttons).toHaveLength(1)
    vi.doUnmock('./anchor-scenario-is-on')
    vi.resetModules()
  })
})
