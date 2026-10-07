import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * ADDING FOUR PEOPLE SHOULD NOT BE FOUR VISITS TO THE SAME FORM.
 *
 * "You should be able to add many parties to the check-in at setup and add context about them."
 * The form took one address, sent the invitation, and cleared itself - so a team of six was six
 * rounds of typing, pressing, waiting for a mail to go, and finding the box again.
 *
 * A BULK PASTE OF ADDRESSES WOULD HAVE BEEN EASIER AND WOULD HAVE THROWN AWAY THE PART THAT
 * MATTERS. Each person keeps their own line about what they are accountable for, because that line
 * is the difference between a check-in that asks each person the right question and one that asks
 * everybody the same one.
 *
 * AND NOTHING IS SENT UNTIL THE QUEUE IS INVITED. Adding to the list is free and reversible; that is
 * the whole reason to have a list rather than firing an invitation per keystroke of enthusiasm.
 */
/*
 * REPOINTED (People and setup rebuild): the queue's STATE and its network calls (`addParticipant`,
 * `rememberWhoWasNotInvited`, the toasts) stayed on GroundAdminPage.tsx, which keeps every hook for
 * the tab that was pulled out into its own file. The QUEUE'S OWN MARKUP - the "+ Add another" button,
 * the one-line-per-person list, the empty-note sentence, and the two guards on the list itself -
 * moved to WhosInItRoster.tsx, which the new CheckInPeopleAndSetup.tsx renders inside "Who's in it".
 * Read both, concatenated, so this still proves the one thing it always proved: a bulk paste never
 * replaced the per-person queue.
 */
const PAGE = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
  + '\n' + readFileSync(join(__dirname, '../../components/gw/WhosInItRoster.tsx'), 'utf8')

describe('many parties at once', () => {
  it('queues people instead of inviting each one immediately', () => {
    expect(PAGE).toMatch(/const \[queuedToAdd, setQueuedToAdd\] = useState<\{ email: string; note: string \}\[\]>/)
    expect(PAGE).toContain('+ Add another')
  })

  it('keeps a line per person about what they answer for', () => {
    expect(PAGE).toMatch(/setQueuedToAdd\(\[\.\.\.queuedToAdd, \{ email, note: newParticipantNote\.trim\(\) \}\]\)/)
    /*
     * And says what an empty one means, rather than leaving a blank line. FAULT 5 (live walk, 6
     * October 2026): this used to join the two statements with a dash ("No note - they will be
     * asked..."); each is now its own plain sentence, so the assertion moved to match.
     */
    expect(PAGE).toContain('There is no note. They will be asked the general questions for this situation.')
  })

  it('refuses to queue the same address twice', () => {
    /* Two rows for one person produces one refusal and one success, and a list that disagrees with
       itself about whether they were added. */
    expect(PAGE).toMatch(/queuedToAdd\.some\(\(q\) => q\.email === email\)/)
  })

  it('and lets one be taken back out before anything is sent', () => {
    expect(PAGE).toMatch(/setQueuedToAdd\(queuedToAdd\.filter\(\(x\) => x\.email !== q\.email\)\)/)
  })

  it('sends them through the per-person call, so every rule still applies', () => {
    /* `addParticipant` holds the seat check, the approval rule and the start-date deferral. A bulk
       endpoint would have been a second door past all three. */
    expect(PAGE).toMatch(/queuedToAdd\.map\(\(q\) =>\s*\n?\s*groundsApi\.addParticipant/)
  })

  it('reports every outcome: sent, waiting, and refused by name', () => {
    expect(PAGE).toMatch(/Invite sent to \$\{sent\}/)
    expect(PAGE).toMatch(/will be invited on the start date/)
    expect(PAGE).toMatch(/toast\.warning\(`\$\{f\.email\}: \$\{f\.because\}`\)/)
    expect(PAGE).toMatch(/rememberWhoWasNotInvited\(id!, failed\)/)
  })

  it('and a total failure says what became of the list', () => {
    /* The other half of an honest error: nobody was invited, and the typing is not gone. */
    expect(PAGE).toContain('Nobody was invited - your list is still here.')
  })
})
