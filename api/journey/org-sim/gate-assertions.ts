/**
 * WHAT "THE TWELVE-SESSION RUN PASSED" MEANS, as code rather than as me reading a log. Stage 2.
 *
 * Kept apart from `gate.ts` so it can be tested against real artifacts, including deliberately
 * damaged copies of them. A gate whose assertions have never been shown to fail is a gate that has
 * never been checked, and this file's own history is the argument: G43 records four separate
 * occasions where a check in this harness could not have failed, including a run that reported
 * success having completed one session of twelve.
 *
 * SHAPE AND FLOORS, NEVER PROSE. The model writes different words every run. A gate that fails on
 * that teaches people to ignore it, and an ignored gate is worse than none because it still gets
 * cited.
 */

export interface GateExpectation {
  sessions: number;
  checkIns: number;
  minNaturalCloses: number;
  reportsReleased: number;
  maxFindings: number;
}

/** Ground 1: the twelve-session weekly new-hire ground, the longest arc the product supports. */
export const GROUND_1: GateExpectation = {
  sessions: 12,
  /** Twelve sessions, two people. */
  checkIns: 24,
  /**
   * One check-in hitting the turn cap is behaviour, not breakage - the synthesis says so itself,
   * opening with "one party's record contains significantly fewer exchanges". Two is a conversation
   * that stopped working.
   */
  minNaturalCloses: 23,
  reportsReleased: 12,
  maxFindings: 0,
};

export interface GateResult {
  what: string;
  ok: boolean;
  detail: string;
}

export function assess(grounds: any[], findings: any[], expect: GateExpectation = GROUND_1): GateResult[] {
  const g = grounds?.[0];
  const sessions: any[] = g?.sessions ?? [];
  const people: any[] = sessions.flatMap(s => s.people ?? []);
  const natural = people.filter(p => p.naturalClose).length;
  /** Fewer than two turns is a check-in that never happened, and it counts as complete elsewhere. */
  const hollow = people.filter(p => (p.turns ?? []).length < 2).length;
  const released = (g?.reports ?? []).filter((r: any) => r?.released && r?.report?.sharedPicture).length;

  return [
    { what: 'the ground ran to the end', ok: !g?.fatal, detail: String(g?.fatal ?? '') },
    { what: `${expect.sessions} sessions`, ok: sessions.length === expect.sessions, detail: `got ${sessions.length}` },
    { what: `${expect.checkIns} check-ins`, ok: people.length === expect.checkIns, detail: `got ${people.length}` },
    {
      what: `at least ${expect.minNaturalCloses} check-ins closed naturally`,
      ok: natural >= expect.minNaturalCloses,
      detail: `got ${natural} of ${people.length}`,
    },
    { what: 'every check-in is a real conversation', ok: hollow === 0, detail: `${hollow} had fewer than two turns` },
    { what: `${expect.reportsReleased} reports released`, ok: released >= expect.reportsReleased, detail: `got ${released}` },
    {
      what: 'no findings recorded',
      ok: (findings?.length ?? 0) <= expect.maxFindings,
      detail: `${findings?.length ?? 0}: ${(findings ?? []).map((f: any) => f.area).join(', ')}`,
    },
  ];
}

export const failuresIn = (results: GateResult[]) => results.filter(r => !r.ok);
