import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * #1a, AS THE ONE TEAM BOX REPLACED IT (Hafsah, 31 October 2026: "Adding a team is one box everywhere"; round 5's startup lead).
 *
 * #1a gave each suggested party and each person named in the report an "Add them" control with its own email field, so the list was
 * not a dead end. Then the setup's team box arrived, filled with everybody named, and the two sat on one card: round 5's startup lead
 * used the report's controls, added five people one at a time, typed every email, and said the emails "should have been pre-filled".
 * The box is the one way now. The report still lists the suggested parties and the people named, and says where who is on the
 * check-in is chosen; it draws no control of its own. REWRITTEN from "the entry page supplies the Add them control" for that reason.
 */
const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'), 'utf8')
const report = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'components', 'gw', 'TheReportYouSawAtTheEnd.tsx'), 'utf8')

describe('#1a, the suggested parties and the people named, beside the one team box', () => {
  it('are still listed in the report', () => {
    expect(report).toMatch(/report\.suggestedParties\.map/)
    expect(report).toMatch(/report\.mentionedPeople\.map/)
    expect(report).toContain('You named these people while you were talking. You choose who is on this check-in in its setup.')
  })

  it('have no second way to add people: no "Add them", no email field per person', () => {
    expect(report).not.toMatch(/renderAdd/)
    expect(src).not.toMatch(/queueSuggestedContributor|addingContributorFor|renderAdd=\{/)
  })

  it('and the team’s lines are filled with everybody named, so nobody is typed twice', () => {
    /* Changed 22 November 2026: the box is on the setup page now, and the lines it holds are filled from the conversation. */
    expect(src).toMatch(/withTheNamedAdded\(teamTextNow\.current, theTeamNamedInTheSetup\(\)\)/)
  })
})
