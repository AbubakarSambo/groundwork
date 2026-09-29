import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "ALL PARTICIPANTS I ADDED DIDNT GET AN EMAIL."
 *
 * They were never sent one, and the product was right not to send them. An invitation WAITS when the
 * check-in starts in the future: the participant row is written with `invitedAt: null` and no mail
 * goes, deliberately, because a mail that has already been read cannot be recalled - grounds.cron.ts
 * sends it on the day.
 *
 * The server says so in its response. Both screens that add people ignored it. One printed "Invite
 * sent to ..." over a row that had not been invited; the other counted only refusals, so adding five
 * people to a check-in with a start date produced "Check-in opened" and five people who heard
 * nothing, with no explanation on any screen.
 *
 * That is worse than either behaviour on its own. The design is defensible; claiming the opposite of
 * what it did is not, and it cost a real afternoon of wondering whether email was broken.
 */
const ADMIN = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
/*
 * REPOINTED (People and setup rebuild, 29 Sept): the add-a-person form and its "is on the check-in.
 * Their invitation goes out on the start date." sentence moved to WhosInItRoster.tsx, which
 * CheckInPeopleAndSetup.tsx renders inside "Who's in it". The state and the network call that
 * produce `lastInvitedEmail`/`lastInviteWaits` stayed on GroundAdminPage.tsx, which is why that test
 * still reads ADMIN alone.
 */
const ROSTER = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'WhosInItRoster.tsx'), 'utf8')
/*
 * THE SETUP FLOW IS THE CONVERSATION NOW. `/grounds/new` is a picker that hands over to it, and its
 * save is the only thing that creates a check-in - so the counting rule moved there rather than
 * being deleted with the screen that used to add people.
 */
const CREATE = readFileSync(join(__dirname, '..', 'enter', 'EntryChatPage.tsx'), 'utf8')

describe('an invite that waits says so', () => {
  it('the add-someone box reads what the server returned rather than assuming', () => {
    expect(ADMIN).toMatch(/setLastInviteWaits\(!\(added as \{ invitedAt\?: string \| null \}\)\.invitedAt\)/)
  })

  it('and says what actually happened, everywhere it reports it', () => {
    /*
     * THREE, THEN TWO. The Setup tab gained its own add-a-person control because the screen called
     * Setup had no way to add a party; then the Sessions tab lost its copy, which was the second
     * entrance to one queue - "add a person should be in setup", and the pattern this codebase has
     * been burned by twice.
     *
     * Counted rather than listed: what matters is that every place which reports an invite tells
     * the truth about whether one was sent. The count going DOWN is a door closing; the count
     * going up without the sentence is the bug.
     */
    const said = ROSTER.match(/is on the check-in\. Their invitation goes out on the start date\./g) ?? []
    /* Was 2: the lead's waiting view reported invites too, and that view went on 10 Sep 2026. */
    expect(said.length).toBe(1)
  })

  it('never claims an invite was sent when the row says it was not', () => {
    /* Both spots are now conditional on the flag. A bare "Invite sent to" left anywhere is the bug. */
    const unconditional: string[] = [...(ADMIN.match(/>Invite sent to \{lastInvitedEmail\}</g) ?? [])]
      .concat(ROSTER.match(/>Invite sent to \{lastInvitedEmail\}</g) ?? [])
    expect(unconditional).toEqual([])
    /* And the guarded sentence is still there somewhere, so this is not passing by having said
       nothing at all. */
    expect(ROSTER).toMatch(/Invite sent to \$\{lastInvitedEmail\}/)
  })

  it('and the setup flow counts the people who are waiting, not only the ones refused', () => {
    expect(CREATE).toMatch(/\(res\.contributors \?\? \[\]\)\.filter\(\(c\) => c\.waiting\)\.length/)
    expect(CREATE).toMatch(/will be invited on the start date/)
  })

  it('says it once with a number, rather than once per person', () => {
    /* Five toasts saying the same thing is how a real message gets dismissed as noise. */
    expect(CREATE).toMatch(/waiting === 1/)
    expect(CREATE).toMatch(/\$\{waiting\} people are on the check-in/)
  })
})
