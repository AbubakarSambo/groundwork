import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE GATE IS GONE. THE CLAIMS ARE NOT.
 *
 * A full-page screen headed "Nobody you work with reads it" stood between a person and their first
 * question, with a button to press first. "The nobody sees what you write page should be deleted."
 * It is. The four claims still live in one file and still render on the invitation and the admin
 * guide, where somebody is deciding whether to take part - which is where a promise belongs.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
const CHAT = strip(readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8'))

describe('no page stands between a person and their first question', () => {
  it('the check-in page no longer renders the briefing screen', () => {
    expect(CHAT).not.toContain('showPrivacyFirst')
    expect(CHAT).not.toContain('WHAT_HAPPENS_TO_WHAT_YOU_WRITE')
    expect(CHAT).not.toMatch(/Start my check-in\s*</)
  })

  /* The second test pinned components/gw/what-happens-to-what-you-write.ts, the old "Nobody you work with reads it" claims, which was deleted on 15 November 2026: that promise is untrue (admins and the lead read reports) and only specs imported it. */
})
