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
    // Whole against part, on the same axis, so the two lines answer each other.
    expect(ADMIN).toContain('Everyone in it - you are running this')
    expect(PARTY).toContain('Just yours - only you see this until the report releases.')
  })

  it('and each door names the view it leads to, on that same axis', () => {
    expect(ADMIN).toContain('Just my own →')
    expect(PARTY).toContain('The whole check-in →')
  })

  it('neither calls it an "account", which is billing to the person reading it', () => {
    // The rail has "Billing" and "Settings" on it for exactly these people.
    expect(ADMIN).not.toContain('My own account')
    expect(PARTY).not.toContain('Your own account.')
  })
})
