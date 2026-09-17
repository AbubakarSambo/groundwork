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
  const block = strip(readFileSync(join(__dirname, '../../components/gw/WhatThisCheckInStillNeeds.tsx'), 'utf8'))

  it('asks when the invites should go out, and offers both answers', () => {
    expect(page).toContain('When should the invites go out?')
    expect(page).toContain('As soon as I save')
    expect(page).toContain('On a date I pick')
  })

  it('wires holding them to the start date, which is what actually delays the mail', () => {
    const choice = page.slice(page.indexOf('When should the invites go out?'))
    expect(choice).toMatch(/setCheckInBy\(''\)/)
    expect(choice).toMatch(/setCheckInBy\(d\.toISOString\(\)/)
  })

  it('and says which one is happening, rather than one line for both', () => {
    expect(page).toMatch(/invites go out on \$\{checkInBy\}, not before/)
    expect(page).toContain('Save this. Your invites go out straight away.')
  })

  it('offers a date where there is no Setup page to send anybody to', () => {
    expect(block).toMatch(/renderStartDate/)
    const still = page.slice(page.indexOf('<WhatThisCheckInStillNeeds'))
    expect(still).toMatch(/startDateUnset=\{!checkInBy\}/)
    expect(still).toMatch(/renderStartDate=/)
  })

  it('never offers a start date in the past', () => {
    expect(page).toMatch(/min=\{new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\}/)
  })
})
