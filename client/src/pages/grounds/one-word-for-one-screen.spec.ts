import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * ONE WORD FOR ONE SCREEN. W13-8.
 *
 * The lead's first tab was **Chat**. The participant's first tab was **Check-in**. Same
 * component, same content, adjacent pages - so somebody being walked through the product by
 * their manager saw two names for one screen, and had no way to know they were the same thing.
 *
 * "Check-in" wins because it is the word every other surface already uses: the email says your
 * check-in is due, the ground header says My check-ins, the button says Check in. "Chat" was
 * mine, from the wave that built the conversation view.
 *
 * The card list had to be renamed too. Leaving it as "Check-ins" would have put "Check-in" and
 * "Check-ins" side by side in one tab row, which is a worse problem than the one being fixed.
 * It is "Sessions", which is what it holds: one row per person per session.
 */
const ADMIN = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
const PARTICIPANT = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the conversation tab', () => {
  it('is called Check-in on the lead\'s view', () => {
    expect(strip(ADMIN)).toMatch(/chat: 'Check-in'/)
  })

  it('and Chat appears nowhere as a tab label', () => {
    expect(strip(ADMIN)).not.toMatch(/chat: 'Chat'/)
  })

  it('the participant\'s tab is the same word', () => {
    // It always was - this is the half that did not have to change, and the reason the
    // lead's changed rather than the other way round.
    expect(strip(PARTICIPANT)).toMatch(/Check-in/)
  })
})

describe('"Settings" says which settings', () => {
  /**
   * W13-9. A ground has settings and so does the account, and both tabs said "Settings" - so
   * somebody looking for their notification preferences opened a ground, and somebody looking
   * for the ground's visibility rules left the ground entirely. One word, two destinations.
   */
  it('the ground\'s tab names the ground, on both views', () => {
    expect(strip(ADMIN)).toMatch(/settings: 'Ground settings'/)
    expect(strip(PARTICIPANT)).toMatch(/key: 'settings', label: 'Ground settings'/)
  })

  it('and neither says the bare word any more', () => {
    expect(strip(ADMIN)).not.toMatch(/settings: 'Settings'/)
    expect(strip(PARTICIPANT)).not.toMatch(/key: 'settings', label: 'Settings'/)
  })
})

describe('and the two labels cannot collide', () => {
  it('the card list is Sessions, not Check-ins', () => {
    expect(strip(ADMIN)).toMatch(/checkins: 'Sessions'/)
  })

  it('so no tab row holds both Check-in and Check-ins', () => {
    const labels = strip(ADMIN).match(/\{\{ chat: '[^}]*\}/)?.[0] ?? ''
    expect(labels, 'the tab label map moved - this check is asserting nothing').toContain('chat:')
    expect(labels).not.toContain("'Check-ins'")
  })
})
