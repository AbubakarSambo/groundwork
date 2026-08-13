import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { assess, failuresIn } from './gate-assertions';

/**
 * THE GATE'S ASSERTIONS, CHECKED AGAINST A REAL RUN AND AGAINST DAMAGED COPIES OF IT. Stage 2.
 *
 * G43 in this plan records four separate occasions where a check in this harness could not have
 * failed - including a run that reported success having completed one session of twelve, and a
 * landing check that counted clicks rather than arrivals. The habit that caught all four is breaking
 * the thing first and confirming red.
 *
 * So this does it permanently rather than once: takes the artifacts from the 13 August run, confirms
 * they pass, then damages them one way at a time and confirms each damage is caught. If somebody
 * loosens a floor in `gate-assertions.ts`, one of these goes red.
 */
const OUT = join(__dirname, 'out-w1410');
const has = existsSync(join(OUT, 'grounds.json'));
const read = (f: string) => JSON.parse(readFileSync(join(OUT, f), 'utf8'));

/**
 * Skipped rather than failed when the artifacts are absent: they are a run's output, and a fresh
 * clone has not run the gate yet. The `it` for their presence is the thing that would tell us they
 * were deleted on purpose.
 */
const when = has ? describe : describe.skip;

when('the real twelve-session run', () => {
  it('passes every check', () => {
    const fails = failuresIn(assess(read('grounds.json'), read('findings.json')));
    expect(fails.map(f => `${f.what} - ${f.detail}`)).toEqual([]);
  });
});

when('and each way it could have gone wrong is caught', () => {
  const real = () => read('grounds.json');
  const findings = () => read('findings.json');
  /** One damage at a time, so a passing check is never covering for a broken one. */
  const damaged = (mutate: (g: any[]) => void) => {
    const g = JSON.parse(JSON.stringify(real()));
    mutate(g);
    return failuresIn(assess(g, findings())).map(f => f.what);
  };

  it('a run that did one session of twelve', () => {
    // The exact false pass in G43.
    expect(damaged(g => { g[0].sessions = g[0].sessions.slice(0, 1); })).toContain('12 sessions');
  });

  it('a check-in with no conversation in it', () => {
    expect(damaged(g => { g[0].sessions[3].people[0].turns = []; }))
      .toContain('every check-in is a real conversation');
  });

  it('a session whose report never came back', () => {
    expect(damaged(g => { g[0].reports[5].released = false; })).toContain('12 reports released');
  });

  it('a report released with nothing in it', () => {
    // `released: true` alone was not enough: an empty synthesis still sets it.
    expect(damaged(g => { delete g[0].reports[5].report.sharedPicture; })).toContain('12 reports released');
  });

  it('conversations that all hit the turn cap', () => {
    expect(damaged(g => g[0].sessions.forEach((s: any) => s.people.forEach((p: any) => { p.naturalClose = false; }))))
      .toContain('at least 23 check-ins closed naturally');
  });

  it('one party dropping out halfway', () => {
    expect(damaged(g => { g[0].sessions[6].people = g[0].sessions[6].people.slice(0, 1); }))
      .toContain('24 check-ins');
  });

  it('the ground failing outright', () => {
    expect(damaged(g => { g[0].fatal = 'boom'; })).toContain('the ground ran to the end');
  });

  it('and a finding the harness recorded', () => {
    const fails = failuresIn(assess(real(), [{ ground: 1, area: 'billing', detail: 'x' }]));
    expect(fails.map(f => f.what)).toContain('no findings recorded');
  });
});

describe('one check-in short of the floor still passes', () => {
  /**
   * THE ONE THAT MUST NOT BE TIGHTENED. The 13 August run had 23 of 24 closing naturally, and the
   * product reported that itself: the synthesis opens by saying one record is thinner than the
   * other. Demanding 24 would make the gate fail on the model being a model, and the first thing
   * anybody does with a gate that fails for no reason is stop running it.
   */
  it('because a model in the loop is allowed one hard stop', () => {
    const g = [{
      sessions: Array.from({ length: 12 }, (_, i) => ({
        session: i + 1,
        people: [
          { naturalClose: true, turns: [{}, {}] },
          { naturalClose: i !== 11, turns: [{}, {}] },
        ],
      })),
      reports: Array.from({ length: 12 }, (_, i) => ({ session: i + 1, released: true, report: { sharedPicture: 'x' } })),
    }];
    expect(failuresIn(assess(g, []))).toEqual([]);
  });
});
