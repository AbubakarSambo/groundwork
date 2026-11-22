import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * ADDING FOUR PEOPLE SHOULD NOT BE FOUR VISITS TO THE SAME FORM.
 *
 * "You should be able to add many parties to the check-in at setup and add context about them." The form took one address at a time.
 * A queue with a line per person about what they answer for followed; then, on 31 October 2026, Hafsah's own words replaced it: "Make
 * adding a team the top pattern ... Judge it by how fast a lead can get their whole team in, with phone numbers, without repeating
 * themselves." Each person's role is added after, on People and setup (Their role here), not in a step per person while adding.
 *
 * REWRITTEN for the one team box (TheTeamBox.tsx, used by WhosInItRoster's AddPeopleForm). What this always proved still holds: many
 * people go on at once, each through the per-person call so every rule still applies, nobody twice, and every outcome is said.
 */
const ROSTER = readFileSync(join(__dirname, '../../components/gw/WhosInItRoster.tsx'), 'utf8')
const BOX = readFileSync(join(__dirname, '../../components/gw/TheTeamBox.tsx'), 'utf8')

describe('many parties at once', () => {
  it('takes the whole team in one box, one person per line, and adds them in one press', () => {
    expect(BOX).toContain('One per line: a name, an email and a phone number.')
    /* setup.txt's one "Add" (22 November 2026), and what is still typed is added on leaving too. */
    expect(BOX).toContain("'Add'")
    expect(ROSTER).toContain('<TheTeamBox')
    expect(ROSTER).not.toContain('+ Add another')
  })

  it('reads the lines with the server\'s one reader, the one the organisation\'s invite box uses', () => {
    expect(BOX).toContain('entryApi.peopleOnLines(pasted)')
  })

  it('sends each person through the per-person call, so every rule still applies', () => {
    /* `addParticipant` holds the seat check, the approval rule and the start-date deferral. */
    expect(ROSTER).toMatch(/groundsApi\.addParticipant\(groundId, \{ email: p\.email/)
  })

  it('never adds somebody twice: a colleague already on it is left alone', () => {
    expect(ROSTER).toMatch(/if \(colleague\) continue/)
  })

  it('reports every outcome: waiting, refused by name, and the lines that still need an email stay in the box', () => {
    expect(ROSTER).toMatch(/is on the check-in\. Their invitation goes out on the start date\./)
    expect(ROSTER).toMatch(/did not send\. They are on the check-in/)
    expect(ROSTER).toMatch(/could not be added\. Check the email and try again\./)
    expect(BOX).toMatch(/Add an email for \$\{andList\(needEmail\)\}, then press Add again\./)
  })

  it('and a total failure says what became of the list', () => {
    expect(BOX).toContain('That did not go through, and nobody was added. Try again.')
  })
})
