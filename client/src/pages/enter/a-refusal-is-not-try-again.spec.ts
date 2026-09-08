import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * BEING REFUSED IS NOT THE SAME AS SOMETHING GOING WRONG.
 *
 * The create page answered every failure with "Could not open it. Try again." That is right for a
 * network blip. It is wrong for a refusal, and the product has one that never comes good by
 * retrying: opening a check-in is limited to people an admin has named.
 *
 * Somebody in that position was being sent round a loop the product already knew they could not
 * leave, and the sentence explaining it - written, tested, and returned by the API - was thrown
 * away one line before it reached them.
 *
 * IT MOVED FILES BECAUSE THE FLOW MOVED. `/grounds/new` is a picker that hands over to the setup
 * conversation, and that conversation's save is the only thing that creates a check-in now. The
 * rule came with it, and it arrived incomplete: the entry save showed `data.message` for ANY
 * failure, so a 500's internal message - nobody's business - would have gone on screen. Found by
 * porting this file rather than deleting it, which is the whole argument for moving rules before
 * removing the screens that carried them.
 */
const PAGE = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')
/*
 * BOUNDED TO THE HANDLER THIS IS ABOUT. Reading the whole file passed against a gutted handler,
 * because `response?.data?.message` appears again in unrelated ones. Caught by breaking it on
 * purpose - three guards in this repository have had exactly this fault.
 */
const from = PAGE.indexOf("'Could not save this. Try again.'")
const code = PAGE.slice(PAGE.lastIndexOf('catch', from), from + 120).replace(/\/\*[\s\S]*?\*\//g, ' ')

describe('what somebody is told when opening one fails', () => {
  it('shows what the server said, when the server said something', () => {
    expect(code).toContain('err?.response?.data?.message')
  })

  it('only for a refusal, never for a server fault', () => {
    /* A 500 carries an internal message that is nobody's business, and "try again" is the honest
       answer to one anyway. */
    expect(code).toContain('status >= 400 && status < 500')
  })

  it('and still says try again when there is nothing to say', () => {
    expect(code).toContain("'Could not save this. Try again.'")
  })
})
