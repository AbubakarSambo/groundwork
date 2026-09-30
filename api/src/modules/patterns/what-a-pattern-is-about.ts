/**
 * WHICH PART OF "WHAT KEEPS COMING UP" A PATTERN BELONGS IN (screens request 82, decision 67).
 *
 * The prototype's board draws "What keeps coming up" in two parts. The first is "About each person's
 * work". The second is "How what people say can run ahead of what happened", for activity reported as
 * an outcome, a finish claimed that the next team does not see, presenting well and delivering late.
 *
 * Hafsah decided on 30 September 2026 (decision 67) that the second part is these patterns, and only
 * these. No pattern is added, removed or changed by this: it is one word on each served pattern, from
 * this fixed list. Every other pattern is about the work.
 *
 *   D1  Said it was finished, the next team says it was not          a finish claimed, not seen
 *   D2  Works in a walkthrough, not in real use                      shown working, not used
 *   D3  What counts as success changed part-way through               success restated to fit
 *   D5  The screens are there, what sits behind them is not          looks done, is not
 *   D8  Keeps breaking after it was called finished                   called finished, was not
 *   B1  Reports upward more brightly than the team describes it      said upward, not as the team says
 *   B2  Presents well, delivers late, more than once                 said well, done late
 *   B3  Others describe doing work they described as theirs          claimed work, done by others
 *   E2  The introductions are always about to happen                  said to be coming, not happening
 */
export type WhatAPatternIsAbout = 'the work' | 'what is said against what happened';

export const SAID_AGAINST_WHAT_HAPPENED: ReadonlySet<string> = new Set(['D1', 'D2', 'D3', 'D5', 'D8', 'B1', 'B2', 'B3', 'E2']);

export function whatAPatternIsAbout(code: string): WhatAPatternIsAbout {
  return SAID_AGAINST_WHAT_HAPPENED.has(code) ? 'what is said against what happened' : 'the work';
}
