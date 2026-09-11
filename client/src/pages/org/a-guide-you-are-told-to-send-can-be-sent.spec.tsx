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
    expect(ADMIN).toContain("navigate('/org/guide')")
    /* The link is for the moment before the first session; after that the page is a reference, not a briefing. */
    expect(ADMIN).toMatch(/sessionsDone === 0 && <TextAction onClick=\{\(\) => navigate\('\/org\/guide'\)\}/)
  })
})
