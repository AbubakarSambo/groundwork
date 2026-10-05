import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * FOUR SCREENS ADD A PERSON, AND ONE OF THEM THREW AWAY THE REASON.
 *
 * Asked whether the duplicated add-participant screens still work, this is the answer: they work,
 * and they had already drifted where it counts. Every reason the server can refuse is written for a
 * person and sent in the response - the seat limit, an address already on the check-in, and the
 * gate that refuses an invitation until something has been said about what the check-in is for,
 * which answers with the ways out of it BY NAME.
 *
 * The setup flow surfaces the per-person reason. The report page surfaces it. The roster - the
 * screen a lead uses to add somebody to a running check-in, and the one most likely to meet the
 * gate - replaced all of it with "Could not add them."
 *
 * So the guard is on the behaviour rather than on the duplication. Consolidating the four into one
 * component is a separate decision; a refusal that does not reach the person is a defect today.
 *
 * Comments stripped: this file names the strings it protects.
 */
const strip = (f: string) =>
  readFileSync(join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '')

const SCREENS = {
  'the roster': strip('GroundAdminPage.tsx'),
  'the setup flow': strip('CreateGroundPage.tsx'),
  /*
   * MOVED FROM THE DEAD REPORT BODY (1 October 2026). The report's own add-a-hidden-contributor
   * flow lived in `ReportBody` (`ReportPage.tsx`), not mounted by any route since the Report tab
   * became a list of sessions. The same flow is now `HiddenContributorRow` on the board.
   */
  'the board': strip('../board/BoardPage.tsx'),
}

describe('every way in says why it refused', () => {
  it('reads all three screens, so an empty file cannot pass', () => {
    for (const [name, src] of Object.entries(SCREENS)) {
      expect(src.length, name).toBeGreaterThan(1000)
    }
  })

  it('no add-a-person handler throws the reason away', () => {
    /* The exact shape that hid it: an onError taking no argument at all. */
    for (const [name, src] of Object.entries(SCREENS)) {
      const blind = [...src.matchAll(/onError: \(\) => toast\.error\('Could not add[^']*'\)/g)]
      expect(blind.map(m => m[0]), name).toEqual([])
    }
  })

  it('the roster reads the server message on both of its add paths', () => {
    const hits = [...SCREENS['the roster'].matchAll(/toast\.error\(e\?\.response\?\.data\?\.message \?\? 'Could not add/g)]
    expect(hits).toHaveLength(2)
  })

  it('and still has a fallback, for a failure with no sentence in it', () => {
    /* A network error carries no body, and an empty toast is worse than a plain one. */
    /* Both add paths now fall back to the same sentence: the engine stopped saying "participant"
       (its rulebook, October), and the screens' own sentences follow. */
    expect([...SCREENS['the roster'].matchAll(/\?\? 'Could not add them\.'/g)]).toHaveLength(2)
    expect(SCREENS['the roster']).not.toContain("'Could not add participant.'")
  })
})
