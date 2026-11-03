import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE SIX RULES THAT LIVED ON A SCREEN NOBODY REACHES ANY MORE.
 *
 * `/grounds/new` became a picker that hands over to this conversation, and the screens it stopped
 * showing were the only place several rules were enforced. None of them are about forms. They are
 * about not lying to the person and not losing their work, and every one of them was suddenly on
 * the wrong side of the flow - the conversation's save is the only thing that creates a check-in
 * now, and it did none of this.
 *
 * Ported before the screens are deleted, deliberately in that order. Deleting first and repointing
 * the specs would have left six rules quietly unenforced and a suite claiming otherwise.
 *
 * THE ONE THAT WAS ALREADY LIVE ON STAGING: the plan limit. The wizard checked it on its FIRST
 * screen and said why - "the API refuses an eleventh ground correctly, but it refused it at submit,
 * so the admin picked a card, named the ground, set the timeline and the people, and only then was
 * told she could not. The block was right; the timing made it feel like a trick." My own flow change
 * reintroduced exactly that at the new door.
 */
const PAGE = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')

describe('the rules came with the flow', () => {
  describe('the plan limit is said before the work, not at the save', () => {
    it('asks the same endpoint the wizard asked', () => {
      expect(PAGE).toMatch(/queryKey: \['can-create-ground'\]/)
      expect(PAGE).toMatch(/billingApi\.checkCanCreateGround\(\)/)
    })

    it('and only for somebody signed in, who has an organisation to have used one up', () => {
      /* A stranger has no plan. Asking on their behalf answers about nobody, and would put a
         refusal in front of the one person this door exists for. */
      expect(PAGE).toMatch(/enabled: !!user/)
      expect(PAGE).toMatch(/const refusedByThePlan =\s*\n?\s*!!user/)
    })

    it('shows the server\'s own reason rather than a generic refusal', () => {
      expect(PAGE).toMatch(/whetherTheyMayOpenOne\.data\.reason \?\? 'Subscribe to open more\.'/)
    })

    it('and does not stop them looking or talking, only saving', () => {
      /* The conversation still runs and everything stays on the device. What they are not allowed
         to do is find out at the save, after giving their whole account. */
      expect(PAGE).toMatch(/You can still set this one up and it stays on this device/)
    })
  })

  describe('who was not invited is written down, not only toasted', () => {
    it('records them against the check-in', () => {
      /* A toast does not survive the navigation on the next line, let alone a reload: an admin's
         list of five silently became three and the destination page recorded none of it. */
      expect(PAGE).toMatch(/rememberWhoWasNotInvited\(res\.groundId, refused\)/)
    })

    it('with the API\'s own sentence per person', () => {
      /* "The invite did not send" is not actionable. "That address is already on this check-in" is. */
      expect(PAGE).toMatch(/res\.whyInvitesFailed\?\.length/)
      expect(PAGE).toMatch(/toast\.warning\(`\$\{f\.email\}: \$\{f\.because\}`\)/)
    })

    it('and falls back to the plain list when no reasons came back', () => {
      /* An older server, or a path that only sends `failedInvites`. Naming them with a generic
         reason beats not naming them. */
      expect(PAGE).toMatch(/\(res\.failedInvites \?\? \[\]\)\.map/)
    })
  })

  describe('who is waiting is counted and said once', () => {
    it('counts the contributors whose invitation has not gone', () => {
      expect(PAGE).toMatch(/\(res\.contributors \?\? \[\]\)\.filter\(\(c\) => c\.waiting\)\.length/)
    })

    it('says it once with a number, not once per person', () => {
      /* Five toasts saying one thing is how a real message gets dismissed as noise. */
      expect(PAGE).toMatch(/waiting === 1/)
      expect(PAGE).toMatch(/will be invited on the start date/)
    })
  })

  it('and it runs on the save, which is the only place a check-in is created now', () => {
    /* Changed 3 November 2026: it is also told whether the invitations were held ("Check in on your own first, invite later"). */
    expect(PAGE).toMatch(/sayWhoWasNotInvited\(res, how\)/)
  })
})
