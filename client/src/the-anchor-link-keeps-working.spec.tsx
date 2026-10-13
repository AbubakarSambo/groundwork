import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnchorTeamRedirect } from './App'

/*
 * DECISION 114 (docs/decisions-merged.md; docs/answers-from-engine.md, "8 October: decision 114,
 * the anchor changes no screen"): the anchor scenario must not change the UI. It used to have its
 * own front door, `AnchorLandingPage.tsx`, which asked the engine's public switch
 * (`GET /entry/anchor-available`) before showing itself, then called `GET /entry/anchor-start` and
 * handed the answer to a fresh `EntryChatPage.tsx` load through `sessionStorage`. That page is gone:
 * `EntryChatPage.tsx` now makes the `anchor-start` call itself (see
 * the-anchor-arrival-opens-directly.spec.tsx), and `/start/team` - which links already sent on
 * WhatsApp, LinkedIn and email still carry - is kept working as a plain redirect into the ordinary
 * entry chat with the anchor's own scenario key.
 */

/** Shows exactly where the redirect landed, read straight off react-router rather than `window.location` (MemoryRouter never touches it). */
function WhereItLanded() {
  const { pathname, search } = useLocation()
  return <div data-testid="landed">{pathname}{search}</div>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/start/team" element={<AnchorTeamRedirect />} />
        <Route path="/start" element={<WhereItLanded />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('/start/team, kept working for links already sent', () => {
  it('redirects to /start with the anchor scenario', async () => {
    renderAt('/start/team')
    expect((await screen.findByTestId('landed')).textContent).toBe('/start?scenario=HELP_TEAM_UNDERSTAND')
  })

  it('keeps whatever else was on the address, scenario first', async () => {
    renderAt('/start/team?x=1')
    expect((await screen.findByTestId('landed')).textContent).toBe('/start?scenario=HELP_TEAM_UNDERSTAND&x=1')
  })

  it('keeps a source mark, the way a shared WhatsApp or LinkedIn link carries one', async () => {
    renderAt('/start/team?source=founders-whatsapp')
    expect((await screen.findByTestId('landed')).textContent).toBe('/start?scenario=HELP_TEAM_UNDERSTAND&source=founders-whatsapp')
  })

  it('replaces a stray scenario already on the address - this door only ever means one scenario', async () => {
    renderAt('/start/team?scenario=DRIFT')
    expect((await screen.findByTestId('landed')).textContent).toBe('/start?scenario=HELP_TEAM_UNDERSTAND')
  })
})
