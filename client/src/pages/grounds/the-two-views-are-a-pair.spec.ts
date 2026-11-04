import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * ONE CHECK-IN HAS TWO VIEWS, AND A PERSON MUST BE ABLE TO TELL THEM APART AND GET BACK.
 *
 * `/grounds/:id` runs the check-in. `/grounds/:id/p` is your own account of it. They draw the SAME
 * five tabs from the same `groundTabs()`, with the same labels, in the same order - so nothing on
 * screen says which one you are looking at except two small lines of text and the button between
 * them.
 *
 * TWO THINGS WERE WRONG, AND THE FIRST ONE STRANDED PEOPLE.
 *
 * The button going TO the party view asks only whether you are a party. The button coming BACK
 * asked whether you are the INITIATOR. An admin in this organisation who takes part in a check-in
 * somebody else leads satisfied the first and failed the second: they could cross over, and then no
 * button existed to return. The two pages look identical, so the screen had changed and offered no
 * way to undo it.
 *
 * And the labels were unrelated to each other - "running this check-in" against "Your own account".
 * Nothing said they were two halves of one thing, and "account" reads as billing to somebody with
 * "Billing" in the rail beside it. Reported: an admin could not tell the two views apart.
 */
const read = (f: string) =>
  readFileSync(join(__dirname, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

const ADMIN = read('GroundAdminPage.tsx')
const PARTY = read('GroundParticipantPage.tsx')

describe('the two views of a check-in are a pair', () => {
  it('reads both pages, so an empty file cannot pass', () => {
    expect(ADMIN.length).toBeGreaterThan(5000)
    expect(PARTY.length).toBeGreaterThan(5000)
  })

  it('THE ONE THAT STRANDED PEOPLE: the way back is offered to everybody who can run it', () => {
    // Not `isInitiator`: an org admin taking part in somebody else's check-in is sent here by the
    // other page and must be able to leave.
    expect(PARTY).toContain('const canRunThisCheckIn = isInitiator || user?.role === \'ADMIN\'')
    expect(PARTY).toMatch(/\{canRunThisCheckIn && \(/)
  })

  it('and the return button is not gated on being the initiator any more', () => {
    const back = PARTY.slice(PARTY.indexOf('The whole check-in'))
    // The old gate sat immediately before the button. If it comes back, this catches it.
    const before = PARTY.slice(Math.max(0, PARTY.indexOf('The whole check-in') - 400), PARTY.indexOf('The whole check-in'))
    expect(before).not.toMatch(/\{isInitiator && \(\s*<button/)
    expect(back.length).toBeGreaterThan(0)
  })

  it('each view says which it is, in words that contrast with the other', () => {
    /* The party view still says whose it is, because that is the news. The lead's line went on
       10 Sep 2026: the rail, the card and "Led by" already said it three times over. */
    expect(ADMIN).not.toContain('Everyone in it - you are running this')
    expect(PARTY).toContain('Your own check-in. The report shows where you and the others agree, differ, and what to do next.')
  })

  it('THE DOOR OUT OF THE LEAD\'S VIEW IS GONE, BECAUSE THERE IS NOWHERE IT LED', () => {
    /*
     * It was "My check-ins", then "My own account", then "Just my own" - three names for a button
     * whose job was to send a lead to a second page that looked identical to this one, because the
     * things that were theirs lived only over there.
     *
     * They are here now: My record holds their record and their private report, and Setup holds
     * their role and standing. So the button is not renamed a fourth time, it is removed. What it
     * existed to fix does not exist.
     */
    expect(ADMIN).not.toMatch(/Just my own/)
    expect(ADMIN).not.toMatch(/My own account/)
    expect(ADMIN).not.toMatch(/My check-ins →/)
    /*
     * AND WHAT REPLACED IT: THE THINGS THAT USED TO BE A PAGE AWAY.
     * REVIEW ROUND 3, "YOUR WORK" REBUILD: `MyRecord`/`WhatYouAreCarryingForward` no longer sit
     * inline in this file - both pages call the shared `YourWork` (components/gw/checkin/
     * YourWork.tsx), which is the one place that renders them now.
     */
    expect(ADMIN).toMatch(/<YourWork/)
    const YOUR_WORK = readFileSync(join(__dirname, '../../components/gw/checkin/YourWork.tsx'), 'utf8')
    expect(YOUR_WORK).toMatch(/<MyRecord/)
    expect(YOUR_WORK).toMatch(/<WhatYouAreCarryingForward/)
    /*
     * REPOINTED (People and setup rebuild, 29 Sept), THEN FOLDED IN (U.4 review, item 11, 30 Sept):
     * "You in this check-in" first moved with the rest of the settings tab into
     * CheckInPeopleAndSetup.tsx as its own `<MyParticipation>` section, then the review found it
     * repeating "What it is" and "How it runs" as a second copy of the same label pieces - Check-in,
     * Situation, sessions completed. It is folded into those two sections now rather than kept as a
     * third place saying the same thing: a lead's role and standing are still shown to them, as
     * "Your role" in "What it is" and "Your status"/"Your sessions" in "How it runs".
     * GroundParticipantPage's own Setup tab is unaffected and still renders `<MyParticipation>`
     * directly, for a participant reading their own check-in.
     */
    /* 4 November 2026: People and setup is the B8 page for everybody (PeopleAndSetupAsPictured.tsx) since Release 1B's switch
       went. The lead's role is in her own row of "Who's in it", first in the list, under "Their role here"; her status and
       sessions are still "Your status" and "Your sessions" in "When it runs". */
    const PEOPLE_AND_SETUP = readFileSync(join(__dirname, 'PeopleAndSetupAsPictured.tsx'), 'utf8')
    expect(PEOPLE_AND_SETUP).toMatch(/'Their role here'/)
    expect(PEOPLE_AND_SETUP).toMatch(/a\.userId === g\?\.initiatorId \? -1/)
    expect(PEOPLE_AND_SETUP).toMatch(/Your status/)
    expect(PEOPLE_AND_SETUP).toMatch(/Your sessions/)
  })

  it('but the way BACK still exists, for anybody who lands on the party view and can run it', () => {
    /* Unchanged, and still the thing that stranded people: an org admin who is a party to somebody
       else's check-in can reach `/p` and must be able to leave.

       UPDATED (group 3, piece 5, part 9, the header rebuild): the button's trailing arrow
       ("The whole check-in →") is gone - a decorative arrow on button text is a joined-on
       fragment, not a sentence, which CLAUDE.md's wording rule rules out, the same reason
       GroundAdminPage.tsx dropped one from "Go to my check-ins" (commit 1ebc69ef). The button
       itself, and what it does, is unchanged - only the arrow is gone. */
    expect(PARTY).toContain('The whole check-in')
    expect(PARTY).not.toContain('The whole check-in →')
    expect(PARTY).toContain("const canRunThisCheckIn = isInitiator || user?.role === 'ADMIN'")
  })

  it('neither calls it an "account", which is billing to the person reading it', () => {
    // The rail has "Billing" and "Settings" on it for exactly these people.
    expect(ADMIN).not.toContain('My own account')
    expect(PARTY).not.toContain('Your own account.')
  })
})
