import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { railAttention } from './rail-attention'
import { aServedCount } from './a-served-count-for-a-spec'

/**
 * Release check, 9 October. Baraka set up an anchor check-in for Kito and Lerato. His page read "Two of the three have not answered
 * yet." above "Nobody has checked in yet.": his set-up conversation was counted as an answer, and he was counted as one of the people.
 */
const ground = {
  status: 'ACTIVE',
  /* Baraka's check-in is the anchor's. The server's rule (the-lead-who-only-asks.ts, a0728ceb) never counts a lead who only
     manages on the anchor; on other kinds she still gives session 1. The fixture names its scenario so it reads that rule. */
  scenario: 'HELP_TEAM_UNDERSTAND',
  participants: [
    { id: 'p-lead', userId: 'u-lead', managingOnly: true },
    { id: 'p-kito', userId: 'u-kito', managingOnly: false },
    { id: 'p-lerato', userId: 'u-lerato', managingOnly: false },
  ],
  checkIns: [
    { participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED', availableFrom: null, isSetup: true },
    { participantId: 'p-kito', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: null, isSetup: false },
    { participantId: 'p-lerato', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: null, isSetup: false },
  ],
  /* As the server counts it: the anchor's managing lead is never in a round. */
  theCount: aServedCount({ 1: { on: ['p-kito', 'p-lerato'], answered: [] } }),
}

describe('the lead who only manages, and her set-up conversation, are not counted', () => {
  it('waits on two of two, not two of three', () => {
    expect(railAttention(ground, 'u-lead')).toEqual({ kind: 'waiting', done: 0, total: 2 })
  })
  /* Changed 3 November (F5 part 3): the sentence is the server's one count (api grounds/this-sessions-count.ts); the page says it whole. */
  it('says everybody still out in the server\'s one sentence', () => {
    const page = readFileSync(resolve(__dirname, '../pages/grounds/GroundAdminPage.tsx'), 'utf8')
    expect(page).toContain('if (thisSession?.says) parts.push(thisSession.says)')
    expect(page).not.toContain('howManyHaveNotAnsweredYet')
  })
})
