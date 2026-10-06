import { aNumberInWords } from './a-number-in-words';

/**
 * THE NEXT CHECK-IN, FROM WHAT HAPPENED (decision 109; spec sections 11 and 36, journey 12).
 *
 * Never a generic pitch. After a report, the lead is told which of the check-ins Groundwork already has fits what the record shows, and why. Chosen by plain
 * rules over counts that already exist, from a short list of real situations (the ones the assistant already names); where nothing in the record points to
 * another, the answer is the same check-in again. One recommendation, never a list. A "why now" is said only where the record gives one (how long it has been
 * since the report, with nothing moving); otherwise it is left out, never made up.
 */
export interface WhatTheRecordShows { scenario?: string | null; done: number; cleared: number; waiting: number; open: number; daysSinceTheReport?: number }
export interface TheNextCheckIn { scenario: string; kind: 'another' | 'the same again'; says: string; why: string; now: string | null }

const things = (n: number, one: string, many: string) => `${aNumberInWords(n)} ${n === 1 ? one : many}`;

export function theNextCheckInFor(r: WhatTheRecordShows): TheNextCheckIn {
  const moved = r.done + r.cleared;
  /* Handoffs are waiting and nothing has moved: work that has gone off track. */
  if (r.waiting >= 2 && moved === 0 && r.scenario !== 'DRIFT') {
    return {
      scenario: 'DRIFT', kind: 'another', says: 'work that has gone off track',
      why: `${things(r.waiting, 'handoff is', 'handoffs are')} still waiting and nothing has been marked done or cleared since the report`,
      now: r.daysSinceTheReport && r.daysSinceTheReport >= 7 ? `${aNumberInWords(r.daysSinceTheReport)} days have passed since the report went out and nothing has moved in that time` : null,
    };
  }
  /* Things have moved and nothing waits: a regular read to see that it keeps moving. */
  if (moved > 0 && r.waiting === 0 && r.scenario !== 'PULSE_CHECK') {
    return {
      scenario: 'PULSE_CHECK', kind: 'another', says: 'a regular read on live work',
      why: `${things(moved, 'thing has', 'things have')} moved since the report and no handoff is waiting`,
      now: null,
    };
  }
  return {
    scenario: r.scenario ?? 'SAME', kind: 'the same again', says: 'the same check-in again',
    why: moved > 0 || r.waiting > 0 ? 'some things have moved and some have not, and asking the same people again shows which' : 'nothing has been marked done or cleared since the report',
    now: null,
  };
}

/** The one sentence the lead reads. */
export function theSuggestionSaid(n: TheNextCheckIn): string {
  const now = n.now ? ` It is worth doing now because ${n.now}.` : '';
  return n.kind === 'the same again'
    ? `Groundwork suggests running the same check-in again, because ${n.why}.${now}`
    : `Groundwork suggests a check-in for ${n.says}, because ${n.why}.${now}`;
}
