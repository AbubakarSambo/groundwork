import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/*
 * "TYPICALLY AT THE START OF A CHAT THE PARTICIPANT HAS A SUMMARY AT THE TOP, NOT IN THIS CASE."
 *
 * Driven live on 15 September 2026. The band is there and it was right: the lead's own words, and
 * the objectives this reader may see. What it dropped was the line explaining why that list is
 * short.
 *
 * On a check-in that keeps numbers to their owner the server sends `alsoSay` - "Other people on
 * this check-in have numbers of their own, and those are theirs" - and it had been rendered
 * nowhere since the day it was written. Without it somebody reads two objectives on a check-in
 * with four people and cannot tell whether the rest are missing, secret, or simply not set yet.
 */
describe('the band says why the list of objectives is short', () => {
  const api = readFileSync(join(__dirname, '..', '..', 'api', 'conversation.ts'), 'utf8')

  it('the type declares the field, so the page does not need a cast to read it', () => {
    expect(api).toMatch(/alsoSay\?: string \| null/)
    expect(api).toMatch(/says\?: string \| null/)
  })

  /* The panel that drew the band is gone from the check-in (Hafsah, 3 November evening: no side panels, cards or explanation lines);
     the server still serves the brief with the transcript, so the type above stays, and the four tests that read the panel are
     deleted with it. */
})
