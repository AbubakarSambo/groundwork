import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * "DO NOT FUCKING USE THE WORD ACCOUNT."
 *
 * Said once, plainly, and it had already been half-fixed twice before this file existed - the word
 * kept coming back because it is the codebase's own vocabulary. Internally an "account" is a
 * person's account of what happened, and that reading is correct, load-bearing and everywhere in
 * the comments. In a product it is the thing you log in to, and a reader resolves it that way
 * before they get to the end of the sentence.
 *
 * WHAT IS BANNED IS THE SENSE, NOT THE STRING. "Create your account", "already have an account",
 * "everyone with a Groundwork account counts toward your plan" are all correct and stay. So this
 * cannot be a grep for the word - it is a list of the PHRASES that carry the wrong sense, on the
 * files a participant actually reads.
 *
 * THE COMMENTS ARE UNTOUCHED, deliberately. They are read by whoever is changing the code, where
 * "account" is the precise word for the thing and the ambiguity does not exist. Stripped before
 * checking, so an explanation of this rule cannot satisfy it.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * WHAT A PARTICIPANT READS, AND THEN EVERYTHING ELSE A CUSTOMER READS.
 *
 * The first version of this list stopped at the participant's own path, and the word survived on
 * the help panel - the first screen somebody opens when they are confused, whose header told them
 * the report shows "all the accounts side by side". Found by opening the panel to look at something
 * else entirely, which is the argument for the list being the whole product rather than the part I
 * happened to be working on.
 *
 * The sign-up, invite, marketing and report surfaces are now in it too. Several of them are the
 * FIRST thing a person ever reads, so they were the worst place for it.
 */
const WHAT_A_PARTICIPANT_READS = [
  'GroundChat.tsx',
  'SharedReportForAParty.tsx',
  'WhatSuccessLooksLike.tsx',
  'MyRecord.tsx',
  'WhatYourRecordCanSupport.tsx',
  'WhatTheReportCanSayYet.tsx',
  'TheFiveThingsThatMakeItCheckable.tsx',
  'WhatYouAreCarryingForward.tsx',
  'HowThisHasMoved.tsx',
  'DeliveredPanel.tsx',
  '../../pages/report/SessionReportPage.tsx',
  '../../pages/report/RoundReportPage.tsx',
  '../../pages/chat/ChatPage.tsx',
  '../../pages/board/BoardPage.tsx',
  'HelpModal.tsx',
  /* User journeys F-16: the check-in's settings and the shared picture a participant reads. */
  'BaselinePanel.tsx',
  'the-shared-picture-a-party-reads.tsx',
  'ExpectationsPanel.tsx',
  'TheReportYouSawAtTheEnd.tsx',
  '../../pages/invite/InvitePage.tsx',
  '../../pages/join/JoinPage.tsx',
  '../../pages/home/SaveCard.tsx',
  '../../pages/home/HomePage.tsx',
  '../../pages/enter/EntryChatPage.tsx',
  '../../pages/grounds/CreateGroundPage.tsx',
  '../../pages/grounds/GroundAdminPage.tsx',
  '../../pages/grounds/GroundsListPage.tsx',
  '../../pages/report/ReportPage.tsx',
  '../../pages/auth/MagicVerifyPage.tsx',
]

/**
 * The phrases that mean "what somebody said". Each one was in the product and each one was replaced.
 * A brand new way of saying it will not be caught here - nothing can catch that - but coming BACK is
 * what this stops, and coming back is what kept happening.
 */
const THE_WRONG_SENSE = [
  /*
   * FOUND BY READING THE PAGE, NOT BY THIS FILE. Two survivors on the session report:
   * "How complete your account is" as a section heading over somebody's own side, and
   * "On record: your account." under it. Neither phrase was in this list, which is the known
   * limit of a list - it stops the word coming BACK and cannot catch a new way of saying it.
   * Both are here now, with a third found while adding them: "Your account is on record" at the
   * end of the entry flow.
   *
   * NARROW ON PURPOSE. The first draft matched "your account is", which caught "your account is
   * set up", "your account is created" and "your account is live" - all the LOGIN sense, all
   * correct, all staying. The rule is the sense and not the string, so the phrase has to be the
   * one that carries the wrong sense and no wider.
   */
  'account is on record',
  'On record: your account',
  "everybody's accounts",
  'their own account',
  'your own account',
  'your account and theirs',
  'the accounts agree',
  'accounts agree',
  'accounts differed',
  'where accounts differ',
  'built from the accounts',
  'across the accounts',
  'across their accounts',
  'the accounts show',
  "Everybody's accounts",
  'Each account',
  'their accounts meet',
  'Every account is in',
  'The accounts are in',
  'that account was',
  'gave that account',
  'without your account',
  'not your account',
  'Your account, so far',
  'accounts agree',
  'accounts side by side',
  'their own account',
  'his own account',
  'her own account',
  'honest account of',
  'the two accounts',
  'accounts stay private',
  'accounts are cross-referenced',
  'accounts that were given',
  'picture across accounts',
  'account of a situation',
  'account per party',
  'different account of',
  'accounts are in',
  'accounts of it',
  'independent accounts',
  'account for?',
]

describe('the word account, in the sense of what somebody said', () => {
  for (const file of WHAT_A_PARTICIPANT_READS) {
    it(`is not in ${path.basename(file)}`, () => {
      const code = strip(readFileSync(path.join(__dirname, file), 'utf8'))
      const found = THE_WRONG_SENSE.filter(phrase => code.toLowerCase().includes(phrase.toLowerCase()))
      expect(found).toEqual([])
    })
  }

  it('and the login sense is untouched, because it is the right word there', () => {
    /* The check that stops this file turning into a hunt for a string. Signing in, plans and seats
       all mean the thing you log into, and every one of them should say so. */
    const AUTH = readFileSync(path.join(__dirname, '../../pages/auth/AuthPage.tsx'), 'utf8')
    expect(AUTH).toContain('Create your account')
    expect(AUTH).toContain('Already have an account')
    /* And on the billing pages, where a seat per person with a Groundwork account is the plan. */
    const BILLING = readFileSync(path.join(__dirname, '../../pages/billing/PricingPage.tsx'), 'utf8')
    expect(BILLING).toMatch(/Groundwork account in your organisation/)
  })
})
