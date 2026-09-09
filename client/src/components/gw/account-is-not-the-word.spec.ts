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

/** What a participant reads. Not every file in the product - the ones on their path. */
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
]

/**
 * The phrases that mean "what somebody said". Each one was in the product and each one was replaced.
 * A brand new way of saying it will not be caught here - nothing can catch that - but coming BACK is
 * what this stops, and coming back is what kept happening.
 */
const THE_WRONG_SENSE = [
  'their own account',
  'your own account',
  'your account and theirs',
  'the accounts agree',
  'accounts agree',
  'accounts differed',
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
  })
})
