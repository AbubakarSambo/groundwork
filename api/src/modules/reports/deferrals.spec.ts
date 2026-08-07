import { findDeferrals, findWaitingBehind, buildDeferralNotice } from './deferrals';
import * as REAL_RUN from '../board/__fixtures__/real-run.json';

/**
 * The leadership pass, checked against a real run instead of hoped for.
 *
 * A twelve-session run contained textbook abdication - a decision deferred for
 * six sessions with two people blocked behind it, and a hard conversation
 * promised in session 4 and had in session 8 - and the synthesis reported zero
 * leadership gaps. The rules were right; the model was being asked to do
 * bookkeeping across twenty pages, which is the thing it is worst at.
 *
 * These tests assert on the COUNTS handed to the synthesis, because that is the
 * part that can be right or wrong on its own. What the model writes from them is
 * checked elsewhere.
 */

const fixture = (REAL_RUN as any).default ?? REAL_RUN;
const sessionOf = new Map<string, number>(fixture.checkIns.map((c: any) => [c.id, c.sessionNumber]));
const entries = fixture.entries.map((e: any) => ({
  label: e.participantId,
  sessionNumber: sessionOf.get(e.checkInId) ?? null,
  text: e.text,
}));
const id = (x: string) => x;

describe('who other people kept waiting on', () => {
  it('finds the lead two people were blocked behind, from their accounts not hers', () => {
    const found = findWaitingBehind(fixture.mentions, id);
    expect(found.map((f) => f.label)).toEqual(['hafsah']);
    expect(found[0].people).toBe(2);
    expect(found[0].sessions.length).toBeGreaterThanOrEqual(3);
  });

  it('needs three separate sessions, so one bad week is not a pattern', () => {
    const twice = findWaitingBehind(
      [
        { sourceParticipantId: 'a', aboutParticipantId: 'lead', kind: 'BLOCKED_BY', sessionNumber: 1 },
        { sourceParticipantId: 'b', aboutParticipantId: 'lead', kind: 'BLOCKED_BY', sessionNumber: 2 },
      ],
      id,
    );
    expect(twice).toEqual([]);
  });

  it('does not count someone naming themselves as their own blocker', () => {
    const self = findWaitingBehind(
      [1, 2, 3, 4].map((n) => ({
        sourceParticipantId: 'a',
        aboutParticipantId: 'a',
        kind: 'BLOCKED_BY',
        sessionNumber: n,
      })),
      id,
    );
    expect(self).toEqual([]);
  });

  it('never counts credit or coverage as someone being waited on', () => {
    const other = findWaitingBehind(
      [1, 2, 3, 4].map((n) => ({
        sourceParticipantId: 'a',
        aboutParticipantId: 'b',
        kind: n % 2 ? 'CREDIT' : 'COVERAGE',
        sessionNumber: n,
      })),
      id,
    );
    expect(other).toEqual([]);
  });
});

describe('things one party kept naming as still to do', () => {
  it('does not report the person WAITING for something as the person deferring it', () => {
    // Adam waited six sessions for a sales deck he does not own. An early
    // version counted "waiting" as an intention and reported him as the one who
    // kept failing to produce it - an inversion that would land on exactly the
    // wrong person.
    const found = findDeferrals(entries).filter((d) => d.label === 'adam');
    expect(found).toEqual([]);
  });

  it('counts "I owe the team a decision", which is how people actually say it', () => {
    // The word that was missing. A twelve-session ground had the lead say "I
    // still owe the team the decision on scope" in eight separate sessions; the
    // list had "still need" and "need to" but not "owe", one statement of eight
    // matched, and the clearest leadership pattern in the run was invisible.
    const found = findDeferrals([
      { label: 'lead', sessionNumber: 3, text: 'I still owe the team the decision on scope.' },
      { label: 'lead', sessionNumber: 4, text: 'I still owe the team the decision on scope.' },
      { label: 'lead', sessionNumber: 5, text: 'I still owe the team the decision on scope.' },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].sessions).toEqual([3, 4, 5]);
  });

  it('reads the sentence that CLOSES a deferral as a resolution, not another one', () => {
    // "I made the decision I had been putting off" contains "putting off". Read
    // the wrong way round it becomes one more count against the person, and the
    // pattern never shows as resolved however long ago they fixed it.
    const found = findDeferrals([
      { label: 'lead', sessionNumber: 3, text: 'I still owe the team the decision on scope.' },
      { label: 'lead', sessionNumber: 4, text: 'The scope decision is still open.' },
      { label: 'lead', sessionNumber: 5, text: 'Scope is still sitting with me.' },
      { label: 'lead', sessionNumber: 7, text: 'I made the decision on scope that I had been putting off.' },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].sessions).toEqual([3, 4, 5]);
    expect(found[0].resolvedAt).toBe(7);
  });

  it('does not treat ordinary forward planning as a deferral', () => {
    // "later" and "eventually" are deliberately NOT in the list. Every plan
    // contains them, and counting them would make a deferral out of every
    // sentence about the future.
    expect(findDeferrals([
      { label: 'a', sessionNumber: 1, text: 'We will look at the pricing later in the year.' },
      { label: 'a', sessionNumber: 2, text: 'Eventually we want three regions.' },
      { label: 'a', sessionNumber: 3, text: 'The plan covers the next two quarters.' },
    ])).toEqual([]);
  });

  it('needs three separate sessions before calling anything a pattern', () => {
    const twice = findDeferrals([
      { label: 'a', sessionNumber: 1, text: 'I still need to write the pricing page' },
      { label: 'a', sessionNumber: 2, text: 'I still need to write the pricing page' },
    ]);
    expect(twice).toEqual([]);
  });

  it('reports a genuine repeated intention and whether it ever landed', () => {
    const found = findDeferrals([
      { label: 'a', sessionNumber: 1, text: 'I still need to have that pricing conversation' },
      { label: 'a', sessionNumber: 2, text: 'The pricing conversation is on my list' },
      { label: 'a', sessionNumber: 3, text: 'I have not had the pricing conversation yet' },
      { label: 'a', sessionNumber: 5, text: 'I did finally have the pricing conversation' },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].sessions).toEqual([1, 2, 3]);
    expect(found[0].resolvedAt).toBe(5);
  });

  it('says plainly when it never happened', () => {
    const found = findDeferrals([
      { label: 'a', sessionNumber: 1, text: 'I still need to write the pricing page' },
      { label: 'a', sessionNumber: 2, text: 'The pricing page is on my list' },
      { label: 'a', sessionNumber: 3, text: 'I have not written the pricing page yet' },
    ]);
    expect(found[0].resolvedAt).toBeNull();
  });

  it('keeps two different deferrals apart rather than merging them into one busy person', () => {
    const found = findDeferrals([
      { label: 'a', sessionNumber: 1, text: 'I still need to decide pricing' },
      { label: 'a', sessionNumber: 2, text: 'Pricing, I am close, probably next week' },
      { label: 'a', sessionNumber: 3, text: 'I have not decided pricing yet' },
      { label: 'a', sessionNumber: 1, text: 'I still need to hire a designer' },
      { label: 'a', sessionNumber: 2, text: 'The designer search is on my list' },
      { label: 'a', sessionNumber: 3, text: 'I have not hired a designer yet' },
    ]);
    expect(found).toHaveLength(2);
  });
});

describe('the notice handed to the synthesis', () => {
  const notice = buildDeferralNotice(findDeferrals(entries), findWaitingBehind(fixture.mentions, id));

  it('is not empty on a run where the pattern was there all along', () => {
    // The whole point. Zero gaps came back from this exact record.
    expect(notice).toContain('hafsah');
    expect(notice).toContain('separate sessions');
  });

  it('routes the finding to leadershipGaps rather than divergences', () => {
    expect(notice).toContain('leadershipGaps');
  });

  it('states the count without stating what it means', () => {
    // The count is a fact; the reading is not. A notice that pre-judges it would
    // be handing the model a verdict to launder.
    expect(notice).toMatch(/not interpreted/);
    expect(notice).toMatch(/carrying too much rather than avoiding anything/);
    expect(notice).not.toMatch(/\b(avoidant|failing|neglect|abdicat)/i);
  });

  it('carries the no-quote, no-name rule with it', () => {
    expect(notice).toMatch(/without quoting or naming anyone|never quote or name anyone/);
  });

  it('is empty when there is nothing to report, rather than padding the prompt', () => {
    expect(buildDeferralNotice([], [])).toBe('');
  });
});
