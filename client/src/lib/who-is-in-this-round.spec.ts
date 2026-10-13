import { describe, it, expect } from 'vitest'
import { whoIsInRound, countsInRound } from './who-is-in-this-round'

/**
 * DECISION 77: SOMEBODY NOT LET IN YET IS NOT COUNTED EITHER (docs/answers-from-engine.md,
 * request 101 (b), ~line 2205).
 *
 * Read live, Rukia's "Reports" rows read "Session 1, 27 Sept / 4 of 6 checked in" and "Session 2,
 * 30 Sept / 2 of 6 checked in", beside the headline's own "4 of 5 people have answered this
 * round." - Faraji Odhiambo, held at the organisation's door, was still in `whoIsInRound`'s own
 * denominator, though the server's count already leaves him out. He was never going to answer,
 * the same reason a managing-only lead is left out past session 1 - so `notLetInYet` is checked
 * here too, and every count this function feeds agrees with the server's.
 */
describe('whoIsInRound: somebody not let in yet is left out', () => {
  it('leaves out a participant with notLetInYet: true', () => {
    const participants = [
      { id: 'p-rukia', managingOnly: false, notLetInYet: false },
      { id: 'p-faraji', managingOnly: false, notLetInYet: true },
    ]
    const rows = whoIsInRound(participants, 1, 'OKR_ALIGNMENT')
    expect(rows.map((p) => p.id)).toEqual(['p-rukia'])
  })

  it('agrees with the server: "4 of 5", never "4 of 6", with one person held at the door', () => {
    const participants = [
      { id: 'p-rukia', managingOnly: false, notLetInYet: false },
      { id: 'p-baraka', managingOnly: false, notLetInYet: false },
      { id: 'p-amani', managingOnly: false, notLetInYet: false },
      { id: 'p-neema', managingOnly: false, notLetInYet: false },
      { id: 'p-colleague', managingOnly: false, notLetInYet: false },
      { id: 'p-faraji', managingOnly: false, notLetInYet: true },
    ]
    expect(whoIsInRound(participants, 1, 'OKR_ALIGNMENT')).toHaveLength(5)
  })

  it('reads false for a person not let in yet, before any other rule is checked', () => {
    expect(countsInRound({ managingOnly: false, notLetInYet: true }, 1, 'OKR_ALIGNMENT')).toBe(false)
    /* A managing-only lead still held at the door is not counted either - not let in beats
       everything else, including the one rule that would otherwise have counted them. */
    expect(countsInRound({ managingOnly: true, notLetInYet: true }, 1, 'OKR_ALIGNMENT')).toBe(false)
  })

  it('counts everybody else exactly as before, when nobody is held at the door', () => {
    const participants = [
      { id: 'p-rukia', managingOnly: false },
      { id: 'p-lead', managingOnly: true },
    ]
    expect(whoIsInRound(participants, 1, 'OKR_ALIGNMENT')).toHaveLength(2)
    expect(whoIsInRound(participants, 2, 'OKR_ALIGNMENT')).toHaveLength(1)
  })

  it('returns an empty list for an empty list, and for one with nobody left in it', () => {
    expect(whoIsInRound([], 1, 'OKR_ALIGNMENT')).toEqual([])
    expect(whoIsInRound(
      [{ id: 'p-faraji', managingOnly: false, notLetInYet: true }],
      1,
      'OKR_ALIGNMENT',
    )).toEqual([])
  })
})

describe("the anchor's lead, whose set-up is not a check-in", () => {
  it('is not counted in round one, the same as the server', () => {
    expect(countsInRound({ managingOnly: true }, 1, 'HELP_TEAM_UNDERSTAND')).toBe(false)
    expect(countsInRound({ managingOnly: false }, 1, 'HELP_TEAM_UNDERSTAND')).toBe(true)
    expect(countsInRound({ managingOnly: true }, 1, 'GOAL_ALIGNMENT')).toBe(true)
  })
})
