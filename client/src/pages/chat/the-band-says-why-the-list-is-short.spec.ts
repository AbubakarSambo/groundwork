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
  const page = readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8')
  const api = readFileSync(join(__dirname, '..', '..', 'api', 'conversation.ts'), 'utf8')

  it('the type declares the field, so the page does not need a cast to read it', () => {
    expect(api).toMatch(/alsoSay\?: string \| null/)
    expect(api).toMatch(/says\?: string \| null/)
  })

  it('and the band renders it', () => {
    expect(page).toMatch(/\{brief\.alsoSay && \(/)
    expect(page).toMatch(/\{brief\.alsoSay\}/)
  })

  it('under the objectives it explains, not above them', () => {
    expect(page.indexOf('The objectives on record')).toBeLessThan(page.indexOf('{brief.alsoSay}'))
  })

  it('and before the line that tells them how to answer, which closes the band', () => {
    expect(page.indexOf('{brief.alsoSay}')).toBeLessThan(page.indexOf('You are not expected to agree with any of it'))
  })

  it('the brief still shows with any one of its parts, as it always did', () => {
    expect(page).toMatch(/brief && \(brief\.subject \|\| brief\.says \|\| brief\.objectives\.length > 0\)/)
  })
})
