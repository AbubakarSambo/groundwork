import { describe, it, expect } from 'vitest'
import { withTheNamedAdded } from './TheTeamBox'

/**
 * FIX PLAN 16 NOVEMBER, GROUP 3: the people box and the conversation write one list, and neither writes over or doubles the other.
 * (End-to-end I-2: names typed in the box were joined by bare copies of the same names, and a typed full name was not the "Ruth" the chat named.)
 */
describe('the people box, as the lead reads it after the conversation names people', () => {
  it('a line typed with spaces is the same person the conversation named', () => {
    const typed = 'Ruth ruth@msingi.test\nSam sam@msingi.test'
    expect(withTheNamedAdded(typed, ['Ruth', 'Sam'])).toBe(typed)
  })

  it('a full name typed in the box is the first name the conversation used, and is not added a second time', () => {
    expect(withTheNamedAdded('Ruth Njeri, ruth@msingi.test', ['Ruth'])).toBe('Ruth Njeri, ruth@msingi.test')
  })

  it('somebody the conversation names who is not in the box is added under what was typed', () => {
    expect(withTheNamedAdded('Ruth Njeri, ruth@msingi.test', ['Ruth', 'Asha'])).toBe('Ruth Njeri, ruth@msingi.test\nAsha')
  })

  it('an email the conversation learned is written onto the typed bare name, and what the lead typed is never overwritten', () => {
    expect(withTheNamedAdded('Ruth', ['Ruth, ruth@msingi.test'])).toBe('Ruth, ruth@msingi.test')
    expect(withTheNamedAdded('Ruth, ruth@typed.test', ['Ruth, ruth@chat.test'])).toBe('Ruth, ruth@typed.test')
  })

  it('two people with different first names are two people', () => {
    expect(withTheNamedAdded('Ruth, ruth@msingi.test', ['Rita'])).toBe('Ruth, ruth@msingi.test\nRita')
  })
})

describe('a first name in the box takes the fuller line the conversation gives later (evaluation lead, 23 November 2026)', () => {
  it('"Catherine" becomes "Catherine Mwangi, catherine@..., +254..." and nobody is added twice', async () => {
    const { withTheNamedAdded } = await import('./TheTeamBox')
    const out = withTheNamedAdded('Catherine\nNafiu\nMaureen', ['Catherine Mwangi, catherine@rollout.test, +254711000001', 'Nafiu Bello, nafiu@rollout.test, +2348021000002', 'Maureen Achieng, maureen@rollout.test, +254711000003'])
    expect(out.split('\n')).toEqual(['Catherine Mwangi, catherine@rollout.test, +254711000001', 'Nafiu Bello, nafiu@rollout.test, +2348021000002', 'Maureen Achieng, maureen@rollout.test, +254711000003'])
  })
})
