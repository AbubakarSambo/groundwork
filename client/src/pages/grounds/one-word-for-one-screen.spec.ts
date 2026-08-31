import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { groundTabs } from './ground-tabs'

/**
 * ONE WORD FOR ONE SCREEN. W13-8.
 *
 * The lead's first tab was **Chat**. The participant's first tab was **Check-in**. Same
 * component, same content, adjacent pages - so somebody being walked through the product by
 * their manager saw two names for one screen, and had no way to know they were the same thing.
 *
 * "Check-in" wins because it is the word every other surface already uses: the email says your
 * check-in is due, the check-in header says My check-ins, the button says Check in. "Chat" was
 * mine, from the wave that built the conversation view.
 *
 * The card list had to be renamed too. Leaving it as "Check-ins" would have put "Check-in" and
 * "Check-ins" side by side in one tab row, which is a worse problem than the one being fixed.
 * It is "Sessions", which is what it holds: one row per person per session.
 */
const ADMIN = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
const PARTICIPANT = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * WHERE THIS SUBJECT LIVES NOW.
 *
 * These labels used to be typed into each page, so the checks read each page's source. Both views
 * call `groundTabs` now - which is what stops them diverging in the first place - so the labels are
 * asserted at the source of truth, and the pages are asserted to be USING it rather than keeping a
 * private copy. That second half is the part that would otherwise rot: a page could quietly go back
 * to its own list and the label checks would still pass against the shared file.
 */
const leadTabs = groundTabs({ contextEnabled: true})
const partyTabs = groundTabs({ contextEnabled: true})
const labelOf = (tabs: { key: string; label: string }[], key: string) => tabs.find(t => t.key === key)?.label

describe('the conversation tab', () => {
  it('is called Check-in, for everybody', () => {
    expect(labelOf(leadTabs, 'chat')).toBe('Check-in')
    expect(labelOf(partyTabs, 'chat')).toBe('Check-in')
  })

  it('and Chat appears nowhere as a tab label', () => {
    for (const t of [...leadTabs, ...partyTabs]) expect(t.label).not.toBe('Chat')
  })

  it('and neither page keeps its own list to disagree with', () => {
    // The original bug was two lists. This is the check that there is one.
    for (const page of [strip(ADMIN), strip(PARTICIPANT)]) {
      expect(page).toMatch(/groundTabs\(\{/)
    }
    expect(strip(ADMIN)).not.toMatch(/chat: 'Check-in'/)
    expect(strip(PARTICIPANT)).not.toMatch(/key: 'checkin', label: 'Check-in'/)
  })
})

describe('"Settings" says which settings', () => {
  /**
   * W13-9. A check-in has settings and so does the account, and both tabs said "Settings" - so
   * somebody looking for their notification preferences opened a check-in, and somebody looking
   * for the check-in's visibility rules left the check-in entirely. One word, two destinations.
   */
  it('names its own destination, for both roles', () => {
    /**
     * W13-9's RULE HOLDS; THE ANSWER TO IT CHANGED. The bug was one word with two destinations -
     * "Settings" in the tab row and "Settings" in the left rail, sending people to the wrong page in
     * both directions. "Check-in settings" fixed that by getting longer.
     *
     * "Setup" fixes it by being a different word, which is the better fix and the one both artifacts
     * ask for. It also describes what the tab now holds: how the check-in RUNS. No target is set here
     * any more - expectations come out of the lead's own conversation and live on Context.
     *
     * The rule that must not break is the one below: never the bare word "Settings".
     */
    expect(labelOf(leadTabs, 'settings')).toBe('Setup')
    expect(labelOf(partyTabs, 'settings')).toBe('Setup')
  })

  it('and neither says the bare word any more', () => {
    for (const t of [...leadTabs, ...partyTabs]) expect(t.label).not.toBe('Settings')
  })
})

describe('and the two labels cannot collide', () => {
  it('the record tab is not a plural of the conversation tab', () => {
    /**
     * It was "Check-ins" beside "Check-in", then "Sessions" for the lead and "My record" for a
     * party, then "Record" for both - and "Record" sat next to "Report", which W-UX-6 found nobody
     * could tell apart. It is "Sessions" for both now, which is not a plural of "Check-in" and is
     * not a synonym of "Report".
     *
     * THE RULE, which has outlived four labels: no tab may read as the plural of the tab beside it,
     * and no two tabs may be near-homographs. The specific word is the changeable part.
     */
    expect(labelOf(leadTabs, 'record')).toBe('Sessions')
    expect(labelOf(partyTabs, 'record')).toBe('Sessions')
    for (const t of [...leadTabs, ...partyTabs]) expect(t.label).not.toBe('Report ')
    for (const t of [...leadTabs, ...partyTabs]) expect(t.label).not.toBe('Check-ins')
  })
})

describe('the order she asked for', () => {
  it('chat first, report second, on both views', () => {
    // Her words: "we had a good thing going where tab 1 was chat, tab 2 reports etc."
    expect(leadTabs.slice(0, 2).map(t => t.key)).toEqual(['chat', 'report'])
    expect(partyTabs.slice(0, 2).map(t => t.key)).toEqual(['chat', 'report'])
  })

  it('and every shared tab sits in the same position for both', () => {
    /**
     * THE ACTUAL COMPLAINT. Report was fifth for a lead and third for a party. Overview is the one
     * tab that exists for one role only, so it is excluded - everything else must line up.
     */
    const shared = leadTabs.filter(t => t.key !== 'overview').map(t => t.key)
    expect(partyTabs.map(t => t.key)).toEqual(shared)
  })
})
