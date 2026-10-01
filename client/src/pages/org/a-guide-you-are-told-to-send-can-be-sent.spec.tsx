import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'fs'
import { join } from 'path'
import { LeadsGuidePage } from './LeadsGuidePage'

/**
 * A GUIDE YOU ARE TOLD TO SEND CAN BE SENT.
 *
 * The page said "Send this link to your team" and offered nothing to send it with, and it was linked
 * from exactly one admin-only screen - so the leads it was written for, who are not admins, could not
 * find it before their first check-in. The instruction now has a control, and the check-in screen a
 * lead actually looks at links to it while nobody has finished a session.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '')
const ADMIN = strip(readFileSync(join(__dirname, '..', 'grounds', 'GroundAdminPage.tsx'), 'utf8'))
const MEMBERS = strip(readFileSync(join(__dirname, 'OrgMembersPage.tsx'), 'utf8'))

describe('the lead guide', () => {
  const original = navigator.clipboard
  afterEach(() => { Object.defineProperty(navigator, 'clipboard', { value: original, configurable: true }) })

  it('copies its own address when told to', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<MemoryRouter><LeadsGuidePage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Copy the link' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href))
    expect(await screen.findByRole('button', { name: 'Copied ✓' })).toBeTruthy()
  })

  it('is linked from the check-in screen before the first session, not only from the admin roster', () => {
    expect(MEMBERS).toContain("navigate('/org/guide')")
    /*
     * HAFSAH, 30 SEPTEMBER: "HOW TO RUN ONE" ONLY GOES TO ANOTHER PAGE, SO IT IS A LINK NOW, NOT A
     * BUTTON WITH A navigate() CALL STANDING IN FOR ONE - checked here directly, since there is no
     * `navigate(...)` call left on this control to search for. The People page's own "Send the
     * guide" (MEMBERS, above) is unchanged: it is a real button there, matching the prototype's own
     * people.txt.
     */
    expect(ADMIN).toContain("to=\"/org/guide\"")
    /*
     * The link is for the moment before the first session; after that the page is a reference, not
     * a briefing. U.10 PICTURE-CHECK ROUND 7, ITEM 3: the header's "pieces side by side" became one
     * plain-sentence paragraph, and the "How to run one" link now sits inside a fragment after that
     * sentence rather than directly after the `sessionsDone === 0` gate - the gate itself, and the
     * `!ended` addition (no guide link once the check-in has finished), are unchanged in spirit.
     */
    expect(ADMIN).toMatch(/sessionsDone === 0 && !ended && \(/)
    /*
     * UPDATED (group 3, piece 5, the header rebuild): `TextAction` was `kit.tsx`'s own old quiet
     * link, drawn with inline styles; this control is now a plain `react-router-dom` `Link` with
     * the shared part's own class for a quiet text link, `.gwui-plain-link` (CLAUDE.md: "a quiet
     * text link is .gwui-plain-link") - still a real `<Link>` to the same address, which is the
     * fact this test protects, and no `kit.tsx` import left on this control.
     */
    expect(ADMIN).toMatch(/<Link className="gwui-plain-link" to="\/org\/guide"/)
    expect(ADMIN).not.toMatch(/<TextAction to="\/org\/guide"/)
  })
})
