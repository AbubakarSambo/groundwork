import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * BEING REFUSED IS NOT THE SAME AS SOMETHING GOING WRONG.
 *
 * The create page answered every failure with "Could not open it. Try again." That is right for a
 * network blip. It is wrong for a refusal, and the product now has one that never comes good by
 * retrying: opening a check-in is limited to people an admin has named.
 *
 * Somebody in that position was being sent round a loop the product already knew they could not
 * leave, and the sentence explaining it - written, tested, and returned by the API - was thrown
 * away one line before it reached them.
 */
const PAGE = readFileSync(join(__dirname, 'CreateGroundPage.tsx'), 'utf8')
/*
 * BOUNDED TO THE HANDLER THIS IS ABOUT. Reading the whole file passed against a gutted handler,
 * because `response?.data?.message` appears again two hundred lines further down in an unrelated
 * one. Caught by breaking it on purpose - three guards in this repository have had exactly this
 * fault today.
 */
const from = PAGE.indexOf("'Could not open it. Try again.'")
const code = PAGE.slice(PAGE.lastIndexOf('onError', from), PAGE.indexOf('function addParticipant', from))
  .replace(/\/\*[\s\S]*?\*\//g, ' ')

describe('what somebody is told when opening one fails', () => {
  it('shows what the server said, when the server said something', () => {
    expect(code).toContain('e?.response?.data?.message')
  })

  it('only for a refusal, never for a server fault', () => {
    /* A 500 carries an internal message that is nobody's business, and "try again" is the honest
       answer to one anyway. */
    expect(code).toContain('status >= 400 && status < 500')
  })

  it('and still says try again when there is nothing to say', () => {
    expect(code).toContain("'Could not open it. Try again.'")
  })
})
