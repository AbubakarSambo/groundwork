import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A CADENCE YOU DID NOT CHOOSE SAYS SO. `cadenceStated` and `timelineStated` exist to tell a number
 * the lead set from one the product chose; the setup chat and the end-of-session report read them,
 * the card an admin approves a check-in from did not (fix plan B13, P6-002 as the audit narrowed it).
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

describe('the approval card', () => {
  it('says, in a sentence, that Groundwork suggested a rhythm or a length nobody chose', () => {
    /* U.5: "30 days (suggested) · weekly (suggested)" became sentences: "It runs for 30 days, which
       Groundwork suggested. People check in weekly, which Groundwork suggested." */
    const list = strip(readFileSync(join(__dirname, 'GroundsListPage.tsx'), 'utf8'))
    expect(list).toMatch(/a\.timelineStated === false \? ', which Groundwork suggested' : ''/)
    expect(list).toMatch(/a\.cadenceStated === false \? ', which Groundwork suggested' : ''/)
  })

  it('because the server says which it was', () => {
    const grounds = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'grounds', 'grounds.service.ts'), 'utf8'))
    const awaiting = grounds.slice(grounds.indexOf('async listAwaitingApproval('), grounds.indexOf('async listAwaitingApproval(') + 2500)
    expect(awaiting).toContain('cadenceStated: g.cadenceStated,')
    expect(awaiting).toContain('timelineStated: g.timelineStated,')
  })
})
