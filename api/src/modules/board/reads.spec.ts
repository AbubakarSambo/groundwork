import { CheckInStatus, DependencyStatus } from '@prisma/client';
import {
  ReadInput,
  buildContribution,
  buildCoverage,
  blockerHasSubstance,
  confidenceOf,
  withoutRepeats,
  MIN_READ_CONFIDENCE,
} from './reads';
import { CoverageKind } from './coverage';
import { GROUND_TRUTH, MUST_FLAG, MUST_NOT_FLAG, byKey } from './__fixtures__/ground-truth';
import * as REAL_RUN from './__fixtures__/real-run.json';

/**
 * THE REPRODUCIBILITY HARNESS.
 *
 * Every read on the board is a sentence about a real person that their lead will
 * read. Until now the only way to find out what those sentences said was to run
 * a twelve-session conversation against a live model - three hours, real money,
 * and a different answer each time. Two separate fixes to the same read
 * regressed between runs and nobody could have known.
 *
 * real-run.json is the captured output of one of those runs: 6 people, 66
 * check-ins, 86 record entries, 36 attributions, 8 handoffs, all produced by the
 * live model. ground-truth.ts is what is ACTUALLY true about each of those
 * people, which is knowable because each was given a deliberate, scripted shape.
 *
 * These tests replay the real record through the reads in milliseconds and check
 * the answers against the truth - not against whatever the code happens to
 * produce today, which would only freeze today's bugs in place.
 *
 * The two failures being guarded against are not symmetrical. Missing a real
 * drop costs a conversation that should have happened. Telling a lead that
 * someone who delivered all quarter is slipping costs that person something you
 * cannot give back. The false positives are the tests that matter most.
 */

// ---------------------------------------------------------------------------
// Adapt the captured run into the reads' input shape.
// ---------------------------------------------------------------------------

const fixture = (REAL_RUN as any).default ?? REAL_RUN;

function realRun(): ReadInput {
  const sessionOfCheckIn = new Map<string, number>(
    fixture.checkIns.map((c: any) => [c.id, c.sessionNumber]),
  );
  return {
    participants: fixture.participants.map((p: any) => ({
      id: p.id,
      roleAsDescribed: p.roleAsDescribed ?? null,
      managingOnly: !!p.managingOnly,
      detectedFunction: p.detectedFunction ?? null,
      detectedFunctionConfidence: p.detectedFunctionConfidence ?? null,
    })),
    checkIns: fixture.checkIns.map((c: any) => ({
      participantId: c.participantId,
      sessionNumber: c.sessionNumber,
      status: c.status as CheckInStatus,
    })),
    entries: fixture.entries.map((e: any) => ({
      participantId: e.participantId,
      sessionNumber: e.checkInId ? (sessionOfCheckIn.get(e.checkInId) ?? null) : null,
      text: e.text,
    })),
    mentions: fixture.mentions,
    dependencies: fixture.dependencies ?? fixture.deps,
  };
}

const nameOf = (id: string) => id;
const NEGATIVE = [CoverageKind.LEAKING];

describe('the captured run is intact', () => {
  it('still holds the record these tests are asserting against', () => {
    const i = realRun();
    expect(i.participants.length).toBeGreaterThanOrEqual(5);
    expect(i.checkIns.length).toBeGreaterThan(50);
    expect(i.entries.length).toBeGreaterThan(50);
    // If attribution ever silently stops populating again - it did once, and
    // every coverage read went quiet without failing - this is the tripwire.
    expect(i.mentions.length).toBeGreaterThan(10);
    expect(i.dependencies.length).toBeGreaterThan(0);
  });

  it('covers every person the answer key describes', () => {
    const ids = new Set(realRun().participants.map((p) => p.id));
    for (const g of GROUND_TRUTH) expect(ids.has(g.key)).toBe(true);
  });
});

describe('what the board says about people who delivered', () => {
  const reads = () => buildCoverage(realRun(), nameOf).reads;

  it.each(MUST_NOT_FLAG)('never reads %s as losing ownership of their work', (key) => {
    const r = reads().find((x) => x.participantId === key)!;
    expect(r).toBeDefined();
    const truth = byKey(key);
    // The message on failure has to say WHY this is wrong, because whoever hits
    // it will be looking at a plausible-sounding sentence.
    if (NEGATIVE.includes(r.kind)) {
      throw new Error(
        `The board reads ${truth.name} as ${r.kind}, which is false.\n` +
          `TRUTH: ${truth.truth}\n` +
          `WHY PROTECTED: ${truth.protectedBecause}\n` +
          `BOARD SAID: ${r.what}`,
      );
    }
  });

  it('protects the quiet load-bearer because others keep crediting him', () => {
    const r = reads().find((x) => x.participantId === 'abubakar')!;
    expect(r.kind).not.toBe(CoverageKind.LEAKING);
    // Not merely un-flagged - his hidden contribution has to actually surface,
    // otherwise the person carrying the work is simply invisible instead.
    expect(r.what).toMatch(/credit/i);
  });

  it('does not read the genuinely blocked person as the person who stopped', () => {
    const r = reads().find((x) => x.participantId === 'nate')!;
    expect(r.kind).not.toBe(CoverageKind.LEAKING);
    expect(r.coupledToBlocker).toBe(true);
  });
});

describe('what the board says about the person who actually drifted', () => {
  it.each(MUST_FLAG)('does not stay silent about %s', (key) => {
    const truth = byKey(key);
    const input = realRun();
    const cov = buildCoverage(input, nameOf).reads.find((x) => x.participantId === key)!;
    const con = buildContribution(input, nameOf).find((x) => x.participantId === key)!;

    // The signal may land in either read - the drop shows up as ownership
    // leaking, or as the shape of the record over time. Requiring a specific one
    // would be pinning the implementation rather than the outcome.
    const flagged = cov.kind === CoverageKind.LEAKING;
    const shaped = /Nothing checkable from session|Nothing checkable since/.test(con.reason ?? '');
    if (!flagged && !shaped) {
      throw new Error(
        `The board says nothing about ${truth.name}, who genuinely went quiet for five sessions.\n` +
          `TRUTH: ${truth.truth}\n` +
          `COVERAGE SAID: ${cov.what}\n` +
          `CONTRIBUTION SAID: ${con.reason}`,
      );
    }
  });

  it('describes the dip as a dip, not as a total', () => {
    const con = buildContribution(realRun(), nameOf).find((x) => x.participantId === 'kavon')!;
    // The whole point of the trajectory read: a quarter-long total hid the
    // collapse inside it, and on totals alone he outscored the person who
    // delivered every week.
    expect(con.reason).toMatch(/session \d/);
  });
});

describe('restating last month\'s win is not this month\'s work', () => {
  it('drops the same achievement when it reappears in a later session', () => {
    const kept = withoutRepeats(realRun().entries).filter((e) => e.participantId === 'kavon');
    const loop = kept.filter((e) => /closed Loop/i.test(e.text));
    // It was recorded three times in the live run - sessions 1, 2 and 4 - so one
    // customer became three pieces of evidence and filled a quiet stretch with
    // old news.
    expect(loop).toHaveLength(1);
    expect(loop[0].sessionNumber).toBe(1);
  });

  it('is actually applied by the reads, not merely available to them', () => {
    // The call site, not the function. A restore once left buildContribution
    // reading raw entries while every test still passed, because they all
    // exercised withoutRepeats directly. One customer counted three times is
    // invisible from here unless the read itself is asserted.
    const con = buildContribution(realRun(), nameOf).find((x) => x.participantId === 'kavon')!;
    const named = /(\d+) of (\d+) things named/.exec(con.reason ?? '');
    expect(named).toBeTruthy();
    // 14 entries are on record for this person; two of them are the same close
    // restated, so the read must work from 12.
    expect(Number(named![2])).toBeLessThan(realRun().entries.filter((e) => e.participantId === 'kavon').length);
  });

  it('keeps genuinely different things said in the same session', () => {
    const kept = withoutRepeats([
      { participantId: 'a', sessionNumber: 1, text: '[VERIFIABILITY:HIGH] Closed Acme on 3 March' },
      { participantId: 'a', sessionNumber: 1, text: '[VERIFIABILITY:HIGH] Closed Beta on 5 March' },
    ]);
    expect(kept).toHaveLength(2);
  });

  it('does not drop one person\'s work because someone else said the same thing', () => {
    const kept = withoutRepeats([
      { participantId: 'a', sessionNumber: 1, text: '[VERIFIABILITY:HIGH] Closed Acme on 3 March' },
      { participantId: 'b', sessionNumber: 2, text: '[VERIFIABILITY:HIGH] Closed Acme on 3 March' },
    ]);
    expect(kept).toHaveLength(2);
  });
});

describe('an admission of nothing is not evidence of something', () => {
  it('does not let "I have not closed anything" count as a checkable contribution', () => {
    const read = buildContribution(
      {
        participants: [
          { id: 'a', roleAsDescribed: 'Sales', managingOnly: false, detectedFunction: null, detectedFunctionConfidence: null },
        ],
        checkIns: [1, 2, 3].map((n) => ({ participantId: 'a', sessionNumber: n, status: CheckInStatus.COMPLETED })),
        entries: [
          // Exactly how it was stored in the live run: an admission of absence,
          // stamped MEDIUM.
          { participantId: 'a', sessionNumber: 1, text: '[VERIFIABILITY:MEDIUM] I have not closed anything since Loop, if I am honest.' },
        ],
        mentions: [],
        dependencies: [],
      },
      nameOf,
    )[0];
    expect(read.reason).toMatch(/Nothing named so far could be checked/);
  });
});

describe('every read carries how much it rests on', () => {
  it('attaches confidence, an evidence count and a plain basis to each read', () => {
    for (const r of buildContribution(realRun(), nameOf)) {
      expect(typeof r.confidence).toBe('number');
      expect(typeof r.evidenceCount).toBe('number');
      expect(r.basis).toBeTruthy();
    }
    for (const r of buildCoverage(realRun(), nameOf).reads) {
      expect(typeof r.confidence).toBe('number');
      expect(r.basis).toBeTruthy();
    }
  });

  it('withholds a read about someone built on almost nothing', () => {
    const thin = confidenceOf({ sessions: 1, checkableEntries: 1, corroborations: 0 });
    expect(thin.shown).toBe(false);
    expect(thin.confidence).toBeLessThan(MIN_READ_CONFIDENCE);
  });

  it('counts one colleague confirming it for more than five self-reported lines', () => {
    const selfOnly = confidenceOf({ sessions: 6, checkableEntries: 5, corroborations: 0 });
    const confirmed = confidenceOf({ sessions: 6, checkableEntries: 1, corroborations: 3 });
    expect(confirmed.confidence).toBeGreaterThan(selfOnly.confidence);
  });

  it('never states a read confidently off a single check-in, however much was said', () => {
    const loud = confidenceOf({ sessions: 1, checkableEntries: 40, corroborations: 10 });
    expect(loud.confidence).toBeLessThanOrEqual(0.3);
    expect(loud.shown).toBe(false);
  });

  it('still shows a stable read at low confidence, because it makes no claim', () => {
    const stable = buildCoverage(
      {
        participants: [
          { id: 'a', roleAsDescribed: 'Sales', managingOnly: false, detectedFunction: null, detectedFunctionConfidence: null },
        ],
        checkIns: [{ participantId: 'a', sessionNumber: 1, status: CheckInStatus.COMPLETED }],
        entries: [{ participantId: 'a', sessionNumber: 1, text: '[VERIFIABILITY:LOW] talked to people' }],
        mentions: [],
        dependencies: [],
      },
      nameOf,
    ).reads[0];
    expect(stable.kind).toBe(CoverageKind.STABLE);
    expect(stable.shown).toBe(true);
  });
});

describe('claiming to be blocked is not enough on its own', () => {
  const base = { fromParticipantId: 'a', status: DependencyStatus.BLOCKING };

  it('accepts a handoff that says who it sits with and what is being waited on', () => {
    expect(
      blockerHasSubstance({ ...base, onParticipantId: 'b', onLabel: null, what: 'the pricing decision for enterprise' }),
    ).toBe(true);
  });

  it('rejects a passing remark with nobody attached to it', () => {
    expect(blockerHasSubstance({ ...base, onParticipantId: null, onLabel: null, what: 'waiting on stuff' })).toBe(false);
  });

  it('rejects a handoff too vague to act on even when someone is named', () => {
    expect(blockerHasSubstance({ ...base, onParticipantId: 'b', onLabel: null, what: 'things' })).toBe(false);
  });

  it('does not treat a resolved handoff as protection', () => {
    expect(
      blockerHasSubstance({
        ...base,
        status: DependencyStatus.CLEARED,
        onParticipantId: 'b',
        onLabel: null,
        what: 'the pricing decision for enterprise',
      }),
    ).toBe(false);
  });

  it('does not let a throwaway mention switch off a real drift read', () => {
    const person = {
      id: 'a',
      roleAsDescribed: 'Sales - close new customers',
      managingOnly: false,
      detectedFunction: null,
      detectedFunctionConfidence: null,
    };
    const checkIns = [1, 2, 3, 4].map((n) => ({
      participantId: 'a',
      sessionNumber: n,
      status: CheckInStatus.COMPLETED,
    }));
    const entries = [{ participantId: 'a', sessionNumber: 1, text: '[VERIFIABILITY:HIGH] Closed Acme on 3 March' }];
    const withVagueClaim = buildCoverage(
      {
        participants: [person],
        checkIns,
        entries,
        mentions: [],
        dependencies: [
          { fromParticipantId: 'a', onParticipantId: null, onLabel: null, what: 'blocked', status: DependencyStatus.BLOCKING },
        ],
      },
      nameOf,
    ).reads[0];
    expect(withVagueClaim.kind).toBe(CoverageKind.LEAKING);

    const withRealClaim = buildCoverage(
      {
        participants: [person],
        checkIns,
        entries,
        mentions: [],
        dependencies: [
          {
            fromParticipantId: 'a',
            onParticipantId: 'b',
            onLabel: null,
            what: 'the enterprise pricing decision',
            status: DependencyStatus.BLOCKING,
          },
        ],
      },
      nameOf,
    ).reads[0];
    expect(withRealClaim.kind).not.toBe(CoverageKind.LEAKING);
  });
});

describe('contribution is read as corroboration, not as volume', () => {
  it('says out loud when someone else independently named the work', () => {
    const con = buildContribution(realRun(), nameOf).find((x) => x.participantId === 'abubakar')!;
    expect(con.reason).toMatch(/independently named by someone else/);
  });

  it('does not let a quiet stretch read as a stop when colleagues kept crediting them', () => {
    const con = buildContribution(realRun(), nameOf).find((x) => x.participantId === 'abubakar')!;
    if (/^.*Nothing checkable/.test(con.reason ?? '')) {
      expect(con.reason).toMatch(/described modestly than work that stopped/);
    }
  });

  it('never shows a position, and never a read without its reason', () => {
    for (const r of buildContribution(realRun(), nameOf)) {
      expect(r.position).toBeNull();
      if (r.remitDefined) expect(r.reason).toBeTruthy();
      else expect(r.reason).toBeNull();
    }
  });
});
