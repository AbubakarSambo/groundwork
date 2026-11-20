import { describe, it, expect } from 'vitest'
import {
  whichSessionAreWeOn,
  whichSessionIsThisCheckInOn,
  hasDoneThisSession,
} from './which-session-are-we-on'

/**
 * THE ROSTER AND THE COUNTER COUNT THE SAME SESSION.
 *
 * Reported from staging, with a screenshot: the header said "Session 2 of 6 · 0 of 2 checked in"
 * while the panel directly below it showed BOTH people as "checked in".
 *
 * Both were right. The counter counted the session the check-in is on - one past the lowest number
 * anybody has finished. The roster called `whichSessionAreWeOn` with the VIEWER'S own check-in, so
 * a lead who had finished session 2 before anybody else judged the whole roster against session 1,
 * where everyone had indeed checked in.
 *
 * Two correct numbers, inches apart, reading as the product having lost the record. The rule is one
 * function now and both pages ask it.
 */
describe('GW-ROSTER: the roster counts the session the check-in is on', () => {
  /** Her screenshot: two people, both finished session 1, neither has done session 2. */
  const SESSION_ONE_DONE_BY_BOTH = [[1], [1]]

  it('THE REPORTED BUG: with session 1 done by both, the check-in is on session 2', () => {
    expect(whichSessionIsThisCheckInOn(SESSION_ONE_DONE_BY_BOTH)).toBe(2)
  })

  it('and nobody reads as checked in for it, which is what the counter said', () => {
    const session = whichSessionIsThisCheckInOn(SESSION_ONE_DONE_BY_BOTH)
    const chips = SESSION_ONE_DONE_BY_BOTH.map(done =>
      hasDoneThisSession(done.map(n => ({ sessionNumber: n, status: 'COMPLETED' })), session),
    )
    expect(chips).toEqual([false, false])
    // The counter's number, computed the way the header computes it.
    const countedDone = chips.filter(Boolean).length
    expect(`${countedDone} of ${chips.length} checked in for check-in ${session}`)
      .toBe('0 of 2 checked in for check-in 2')
  })

  it('THE OLD BEHAVIOUR, kept here so the contradiction is visible', () => {
    // What the roster used to ask: the viewer's own position. A lead with nothing open falls back
    // to the last session they finished - session 1 - where everybody had checked in.
    const asTheViewerSawIt = whichSessionAreWeOn(null, [1])
    expect(asTheViewerSawIt).toBe(1)
    const chips = SESSION_ONE_DONE_BY_BOTH.map(done =>
      hasDoneThisSession(done.map(n => ({ sessionNumber: n, status: 'COMPLETED' })), asTheViewerSawIt),
    )
    // Both "checked in", directly above "0 of 2 checked in". This is the screenshot.
    expect(chips).toEqual([true, true])
    expect(asTheViewerSawIt).not.toBe(whichSessionIsThisCheckInOn(SESSION_ONE_DONE_BY_BOTH))
  })

  it('a round stays open until everybody has finished it', () => {
    // One person ahead does not move the check-in on.
    expect(whichSessionIsThisCheckInOn([[1, 2], [1]])).toBe(2)
    expect(whichSessionIsThisCheckInOn([[1, 2, 3], [1]])).toBe(2)
    // Everybody level moves it on.
    expect(whichSessionIsThisCheckInOn([[1, 2], [1, 2]])).toBe(3)
  })

  it('a check-in nobody has started is on session 1, not session 0', () => {
    expect(whichSessionIsThisCheckInOn([[], []])).toBe(1)
    expect(whichSessionIsThisCheckInOn([])).toBe(1)
  })

  it('and a session counted twice for one person still only counts once', () => {
    // Two rows for the same session number must not read as two sessions finished.
    expect(whichSessionIsThisCheckInOn([[1, 1], [1]])).toBe(2)
  })

  it('whichSessionAreWeOn still answers the question it is for: one person, their own position', () => {
    // Not deprecated - it is right for "what am I being asked to do". It was the wrong question for
    // a roster about everybody.
    expect(whichSessionAreWeOn(3, [1, 2])).toBe(3)
    expect(whichSessionAreWeOn(null, [1, 2])).toBe(2)
    expect(whichSessionAreWeOn(null, [])).toBe(1)
  })
})

/** 21 Sep 2026: a one-session check-in everybody had finished read "waiting" beside all twenty-five names. */
describe('there is no session after the last', () => {
  it('caps the session at the planned count, so everyone reads as checked in', () => {
    const everyoneDidOne = [[1], [1], [1]];
    expect(whichSessionIsThisCheckInOn(everyoneDidOne)).toBe(2);
    expect(whichSessionIsThisCheckInOn(everyoneDidOne, 1)).toBe(1);
    expect(hasDoneThisSession([{ sessionNumber: 1, status: 'COMPLETED' }], whichSessionIsThisCheckInOn(everyoneDidOne, 1))).toBe(true);
    expect(whichSessionIsThisCheckInOn([[1], []], 1)).toBe(1);
  });
});
