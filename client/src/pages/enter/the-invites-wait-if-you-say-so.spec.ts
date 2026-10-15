import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * SAVING WAS THE ONLY WAY TO KEEP YOUR WORK, AND SAVING MAILED EVERYBODY.
 *
 * A lead setting up the night before a client meeting had no way to save without the whole list
 * being invited there and then. The way to hold them existed - a future start date, and the 6am job
 * that sends invites on the morning a ground starts - and nothing on the screen said so, so nobody
 * could choose it.
 *
 * AND THERE WAS NOWHERE TO PUT A START DATE AT ALL on this path. The block that asks for one offers
 * "Set a start date on Setup", and on the entry flow there is no ground yet and no Setup page. So it
 * was passed startDateUnset=false and never appeared. Her words: "There's no start date etc."
 *
 * Both are the same field. Held at the source rather than on a rendered screen, because what matters
 * is that the choice exists and that it is wired to the thing that actually delays the mail.
 */
describe('the invites wait if you say so', () => {
  const strip = (t: string) => t.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '')
  const page = strip(readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8'))

  /*
   * U.6: the question is now the prototype's "When it starts" (setup.txt), with "Now", "Tomorrow" and
   * "On a date", in TheSetup. It is the same field: the start date is what the invitations wait
   * for, and the screen says so ("Adding someone sends their invitation when it starts."). The old
   * strings "When should the invites go out?", "As soon as I save" and "On a date I pick" are gone
   * with it, so these two tests now read TheSetup and its wiring instead.
   */
  it('asks when it starts, and offers now, tomorrow or a date', () => {
    const setup = strip(readFileSync(join(__dirname, 'TheSetup.tsx'), 'utf8'))
    expect(setup).toContain("whenItStarts: 'When it starts'")
    expect(setup).toContain("now: 'Now'")
    expect(setup).toContain("tomorrow: 'Tomorrow'")
    expect(setup).toContain("onADate: 'On a date'")
    expect(setup).toContain("invitationsWhenItStarts: 'Adding someone sends their invitation when it starts.'")
  })

  it('wires the start to the start date, which is what actually delays the mail', () => {
    const choice = page.slice(page.indexOf('<TheSetup'))
    expect(choice).toMatch(/startsOn=\{checkInBy\}/)
    /* Setup page, piece 3a: the start is also kept in the saved session now, so a reload keeps it;
       it still sets the same start date. */
    expect(choice).toMatch(/onStartsOn=\{\(d\) => \{ setCheckInBy\(d\)/)
  })

  /* U.6 review: "Your invites go out straight away." was not always true (no seat, an admin to
     accept it, an address that cannot be invited). It says what is certain now. */
  it('and says which one is happening, rather than one line for both', () => {
    expect(page).toMatch(/Save this\. Nobody is invited before \$\{theDay\(/)
    expect(page).toContain('Save this. You then see who was invited and who has to wait.')
    expect(page).not.toContain('Your invites go out straight away')
  })

  /*
   * U.6 review: the date used to be offered twice, once in "One thing this check-in still needs" on
   * the report ("When does this start?") and once in the setup. After choosing "Now" the first still
   * said no start date was set. It is offered once now, in TheSetup, where there is no Setup page to
   * send anybody to, so this checks that instead.
   */
  it('offers a date where there is no Setup page to send anybody to, and only once', () => {
    expect(page).not.toContain('<WhatThisCheckInStillNeeds')
    const setup = strip(readFileSync(join(__dirname, 'TheSetup.tsx'), 'utf8'))
    expect(setup).toMatch(/type="date"/)
  })

  /* U.6 review: the only start date is TheSetup's now, so the rule is read there. */
  it('never offers a start date in the past', () => {
    const setup = strip(readFileSync(join(__dirname, 'TheSetup.tsx'), 'utf8'))
    expect(setup).toMatch(/aria-label=\{THE_SETUP\.onADate\} value=\{p\.startsOn\} min=\{iso\(today\)\}/)
  })
})
