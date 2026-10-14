import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A SHARED REPORT NEEDS TWO PEOPLE, AND THE PAGE SAYS SO.
 *
 * Eighteen per cent of check-ins had fewer than two participants; none of them has a released report
 * and none ever will, because the release rule refuses below two. The owner got their private report
 * and then waited for a second half the product had already decided cannot arrive, and the screen
 * said "forming" (fix plan B17). Both pages and the list row now say the truth and who changes it.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const read = (f: string) => strip(readFileSync(join(__dirname, f), 'utf8'))

describe('a check-in with one person on it', () => {
  it('is told on the party page that the shared report compares two accounts', () => {
    const page = read('GroundParticipantPage.tsx')
    /*
     * READ FROM `ground.atLeastTwoInThisRound`, NOT A CLIENT-SIDE COUNT OF `ground.participants`
     * (U.8 fifth review). `ground.participants` is reduced to the reader's own row alone on a
     * check-in that hides peers from each other, so counting it here always read as one - a real
     * team of four saw "It will build once somebody is added" for ever. The server now sends the
     * same rule's answer (`atLeastTwoInThisRound`, computed off the raw participants before that
     * filter runs, with the identical managing-only-in-session-one rule `who-is-in-this-round.ts`
     * used to apply here), so this pins that the page reads the server's field, not its own count.
     */
    expect(page).toMatch(/!\(ground as any\)\.atLeastTwoInThisRound && \(/)
    expect(page).not.toMatch(/whoIsInRound\(/)
    expect(page).toContain('The shared report compares two accounts.')
  })

  it('and on the lead page, with the way to add somebody beside it', () => {
    const page = read('GroundAdminPage.tsx')
    const report = page.slice(page.indexOf("{tab === 'report' && ("), page.indexOf('<TheReportIsAListOfSessions'))
    expect(report).toContain('The shared report compares two accounts. Add somebody and this will build.')
    /*
     * UPDATED (group 3, piece 5, the Report tab rebuild): `TextAction` was `kit.tsx`'s own old
     * quiet-link component, one of several raw styles this tab drew its own copy of. The link now
     * uses the shared part's own class for this exact shape, `.gwui-plain-link` (CLAUDE.md: "a
     * quiet text link is .gwui-plain-link") - same click handler, same place, no `kit.tsx` import
     * left anywhere in this tab.
     */
    expect(report).toMatch(/className="gwui-plain-link" onClick=\{\(\) => setTab\('checkins'\)\}/)
    expect(report).not.toMatch(/<TextAction/)
  })

  it('and on the list row, without opening it', () => {
    /* U.5: the row reads it as a sentence under "Where it stands", from how-a-row-reads.ts. */
    const list = read('how-a-row-reads.ts')
    expect(list).toContain("'It needs a second person for a shared report.'")
    expect(list).toMatch(/filter\(p => !p\.managingOnly\)\.length < 2\) also = /)
  })

  it('which matches the rule the server releases by', () => {
    const grounds = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'grounds', 'grounds.service.ts'), 'utf8'))
    /* CHANGED 11 OCTOBER (decision 133): the lead stays one of the two even in a round they sat out. */
    expect(grounds).toContain('if (active.length + (theLeadSatThisOneOut > 0 ? 1 : 0) < 2) return false;')
  })
})
