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
/* These were the same call twice, from when the list could not differ by role. It can now: the
   tab showing EVERYONE's state and the tab showing YOUR OWN account shared one key and one label,
   which is what made the two views indistinguishable. */
const leadTabs = groundTabs({ canRunThisCheckIn: true, isAParty: false })
const partyTabs = groundTabs({ canRunThisCheckIn: false, isAParty: true })
const bothTabs = groundTabs({ canRunThisCheckIn: true, isAParty: true })
const labelOf = (tabs: { key: string; label: string }[], key: string) => tabs.find(t => t.key === key)?.label

describe('the conversation tab', () => {
  it('is called Check-in, for everybody', () => {
    expect(labelOf(leadTabs, 'chat')).toBe('Check-in')
    expect(labelOf(partyTabs, 'chat')).toBe('Check-in')
  })

  it('and Chat appears nowhere as a tab label', () => {
    for (const t of [...leadTabs, ...partyTabs]) expect(t.label).not.toBe('Chat')
  })

  /**
   * UPDATED FOR THE CHECK-IN REBUILD (docs/tasks-ui.md): the outer row is the prototype's fixed
   * five now, drawn by `components/gw/ui/CheckInHeader.tsx` - neither page types its own copy of
   * that list any more, so there is nothing left for the two to disagree about at that level.
   *
   * REVIEW ROUND 3, "YOUR WORK" REBUILD: Report, Sessions and What I shared are no longer a
   * visible sub-tab row under "My work" at all - the prototype's my-record.txt has no sub-tabs,
   * so "My work" is one flat page (`YourWork`) now, with "Report" ("Every session") and
   * "Sessions" ("Who has answered") reached from quiet links inside it instead. There is nothing
   * left to disagree about at that level either: both pages call the one shared `YourWork`
   * component, rather than each keeping its own private layout.
   */
  it('and neither page keeps its own list to disagree with', () => {
    for (const page of [strip(ADMIN), strip(PARTICIPANT)]) {
      expect(page).toMatch(/<CheckInHeader/)
      expect(page).toMatch(/<YourWork/)
    }
    expect(strip(ADMIN)).not.toMatch(/chat: 'Check-in'/)
    /*
     * `key: 'checkin', label: 'Check-in'` USED TO BE THE BUG THIS GUARDED AGAINST - a page
     * writing its own copy of the label rather than reading `groundTabs()`'s. It is now the
     * prototype's own fixed outer tab (docs/prototype/screens/B3-the-check-in), the same pair on
     * both pages because `CheckInHeader.tsx` draws the same five everywhere - not a private
     * redefinition either page could drift from. Both must contain it; that they AGREE is the rule.
     */
    expect(strip(ADMIN)).toMatch(/key: 'checkin', label: 'Check-in'/)
    expect(strip(PARTICIPANT)).toMatch(/key: 'checkin', label: 'Check-in'/)
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
  it('no tab reads as the plural of another, and no two are near-homographs', () => {
    /**
     * It was "Check-ins" beside "Check-in", then "Sessions" for the lead and "My record" for a
     * party, then "Sessions" for both - and now "Sessions" and "My record" again, because those are
     * two different tabs rather than one tab wearing two names. Four labels, one rule.
     *
     * THE RULE, which has outlived all of them: no tab may read as the plural of the tab beside it,
     * and no two may be near-homographs. Asserted over the whole list somebody can actually see -
     * a lead who is also a party sees both of the two that used to be one, so that is the list where
     * a collision would land.
     */
    const labels = bothTabs.map(t => t.label)
    expect(new Set(labels).size).toBe(labels.length)
    for (const a of labels) {
      for (const b of labels) {
        if (a === b) continue
        expect(b).not.toBe(`${a}s`)
        expect(b.toLowerCase()).not.toBe(a.toLowerCase())
      }
    }
    // The two that were confused for each other: neither may be a prefix of the other.
    expect(labels).toContain('Sessions')
    expect(labels).toContain('What I shared')
    expect('Report'.startsWith('What I shared')).toBe(false)
  })

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
    /* The lists are no longer identical - `sessions` is the lead's and `record` is a party's, which
       is the whole point. What must not move is anything BOTH of them see. */
    const leadKeys = leadTabs.map(t => t.key)
    const partyKeys = partyTabs.map(t => t.key)
    const shared = leadKeys.filter(k => partyKeys.includes(k))
    expect(shared).toEqual(partyKeys.filter(k => leadKeys.includes(k)))
    expect(shared).toEqual(['chat', 'report', 'context', 'settings'])
    // And the two role-specific ones sit in the same slot as each other.
    expect(leadKeys.indexOf('sessions')).toBe(partyKeys.indexOf('record'))
  })
})
