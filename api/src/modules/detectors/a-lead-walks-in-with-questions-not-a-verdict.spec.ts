import { theReadFor, sayHandoff, howCompleteThePictureIs, REFUSAL, NOTHING_ON_RECORD, Material } from './what-a-lead-should-read-first';
import { ESCALATE_AFTER_DAYS } from '../webhooks/a-handoff-that-has-sat-too-long';

/**
 * THE READ BEFORE A CONVERSATION ABOUT SOMEBODY.
 *
 * Asked directly: "does this give comments to their leads before a performance evaluation?" Every
 * part existed and nothing assembled them, so a lead prepared from memory - which is the failure
 * this product exists to end, happening inside the product.
 *
 * The tests that matter here are the refusals. This is the one surface where the product hands a
 * manager material about a named person shortly before a decision, and everything that makes that
 * safe has to be provable rather than intended.
 */
const NOW = new Date('2026-06-01T09:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

/** A handoff with substance and nobody told yet, unless a test says otherwise. */
const handoff = (over: Partial<Material['othersWaiting'][number]> = {}) => ({
  what: 'the schema sign-off', status: 'BLOCKING', waitingDays: 12,
  onLabel: 'Tom', escalatedAt: null, hasSubstance: true, ...over,
});

const material = (over: Partial<Material> = {}): Material => ({
  personLabel: 'Priya',
  finishedCheckIns: 2,
  commitments: [],
  waitingOnOthers: [],
  othersWaiting: [],
  findings: [],
  carrying: [],
  now: NOW,
  ...over,
});

describe('a lead walks in with questions, not a verdict', () => {
  it('never scores, ranks, or recommends anything about the person', () => {
    const read = theReadFor(material({
      commitments: [{ text: 'Send the migration plan', state: 'OPEN', dueAt: daysAgo(9), statedAt: daysAgo(30) }],
      othersWaiting: [handoff()],
      findings: [{ key: 'not_shipping', says: 'Nothing has been marked done on Atlas since April.', subjectExternalId: 'OKR-1', firstSeenAt: daysAgo(20) }],
    }));
    /*
     * The CONTENT, not the refusal. The refusal has to be allowed to name what it refuses - it says
     * "nothing here has been weighed, scored or ranked", and a check that reads it too fails on the
     * one sentence doing the work. The first version of this did exactly that.
     */
    const all = JSON.stringify({ sections: read.sections, notInHere: read.notInHere }).toLowerCase();

    /* The words that would turn this into the thing every other guard here prevents. */
    for (const forbidden of ['score', 'rating', 'rank', 'underperform', 'should be promoted', 'not meeting', 'below expectation', 'top performer']) {
      expect(all).not.toContain(forbidden);
    }
    expect(read.refusal).toBe(REFUSAL);
  });

  it('shows both sides of a handoff, because one side is a charge sheet', () => {
    /*
     * Somebody blocked for three weeks on a thing they cannot start looks identical to somebody who
     * has not started it. The only way to tell them apart is to show what they are waiting on.
     */
    const read = theReadFor(material({
      othersWaiting: [handoff()],
      waitingOnOthers: [handoff({ what: 'the vendor contract', waitingDays: 21, onLabel: 'Finance' })],
    }));
    const headings = read.sections.map(s => s.heading);
    expect(headings).toContain('What other people are waiting on them for');
    expect(headings).toContain('What they are waiting on other people for');
  });

  it('never calls an undated promise late', () => {
    /* Calling it late invents a deadline nobody agreed to, and the invented one is what gets used. */
    const read = theReadFor(material({
      commitments: [{ text: 'Look at the billing edge cases', state: 'OPEN', dueAt: null, statedAt: daysAgo(40) }],
    }));
    const said = read.sections.find(s => s.heading === 'What they said they would do')!;
    expect(said.lines[0]).toContain('no date');
    /*
     * It may say NEITHER SIDE CAN TELL whether it is late - that is the honest statement and the
     * whole point. What it may never do is assert that it is. A regex for /late/ fails on the
     * careful sentence and passes the careless one, so the assertion has to be about the claim.
     */
    expect(said.lines[0]).toContain('neither of you can tell whether it is late');
    /* The honest clause is removed, then nothing accusatory may remain. A lookahead cannot tell
       "whether it is late" from "it is late" reliably; taking the allowed sentence out can. */
    const rest = said.lines[0].replace('neither of you can tell whether it is late', '');
    expect(rest).not.toMatch(/late|overdue|missed|behind/i);

    /* And it is nudged rather than noted - the coach asks for the date. */
    expect(said.lines[0]).toMatch(/put a date on it/);
  });

  it('says an objective with no measure has nothing to be judged against', () => {
    const read = theReadFor(material({
      carrying: [{ externalId: 'OKR-1', title: 'Ship the billing rewrite', measure: null, lastSeenAt: daysAgo(3) }],
    }));
    const carrying = read.sections.find(s => s.heading === 'What they are carrying')!;
    expect(carrying.lines.join(' ')).toContain('nothing to be doing well or badly against')
  });

  it('attaches a source to every section, so none of it has to be taken on trust', () => {
    const read = theReadFor(material({
      commitments: [{ text: 'x', state: 'OPEN', dueAt: daysAgo(1), statedAt: daysAgo(9) }],
      findings: [{ key: 'gone_quiet', says: null, subjectExternalId: null, firstSeenAt: daysAgo(5) }],
      carrying: [{ externalId: 'S1', title: 'A thing', measure: 'revenue', lastSeenAt: daysAgo(2) }],
    }));
    expect(read.sections.length).toBeGreaterThan(0);
    for (const s of read.sections) expect(s.source.length).toBeGreaterThan(20);
  });

  it('states what it does not know every time, not only when the record is thin', () => {
    /*
     * A read that lists four findings and stops implies those four are the whole picture. A lead
     * who walks in believing that is worse off than one who brought nothing.
     */
    const rich = theReadFor(material({
      commitments: [{ text: 'a', state: 'OPEN', dueAt: daysAgo(2), statedAt: daysAgo(9) }],
      othersWaiting: [handoff({ what: 'b', status: 'WAITING', waitingDays: 4 })],
      findings: [{ key: 'not_shipping', says: 'c', subjectExternalId: null, firstSeenAt: daysAgo(6) }],
      carrying: [{ externalId: 'S1', title: 'd', measure: 'x', lastSeenAt: daysAgo(1) }],
    }));
    expect(rich.notInHere.length).toBeGreaterThanOrEqual(4);
    expect(rich.notInHere.join(' ')).toContain('Most of what somebody does is not in here');
    expect(rich.notInHere.join(' ')).toContain('Why any of it happened');
  });

  it('has a plain answer for an empty record rather than padding one', () => {
    const read = theReadFor(material());
    expect(read.sections).toEqual([]);
    expect(NOTHING_ON_RECORD).toContain('That is not a finding about them');
    expect(NOTHING_ON_RECORD).toContain('Go in and ask');
  });

  /*
   * THE THREE THINGS THAT WERE MISSING, AND WHY THEY WERE MISSING.
   *
   * All three engines already existed and the first version of this read used none of them: the
   * handoff escalation, the coach's nudge, and the confidence band. It listed facts where the
   * product already knew what to do about them.
   */
  describe('and it uses the engines rather than restating them', () => {
    it('tells you the other side has been told, or exactly when they will be', () => {
      const told = sayHandoff(handoff({ waitingDays: 20, escalatedAt: daysAgo(6) }), NOW);
      expect(told).toContain('Tom has been told');
      expect(told).toContain(String(ESCALATE_AFTER_DAYS));
      /* Advice, not just a flag - and advice about the work, not about the person. */
      expect(told).toContain('what they need in order to finish it');

      const notYet = sayHandoff(handoff({ waitingDays: 12 }), NOW);
      expect(notYet).toContain('has not been told yet');
      expect(notYet).toContain('2 days');
      expect(notYet).toContain('say so to Tom today');
    });

    it('refuses to launder a remark into a blocker', () => {
      /*
       * Being blocked switches off every negative read about somebody, which makes it the most
       * valuable thing on the board to claim. `blockerHasSubstance` decides whether a claim names
       * who and what; repeating one that does not, as though it were a handoff, is an excuse being
       * given the protection meant for people who are actually stuck.
       */
      const thin = sayHandoff(handoff({ hasSubstance: false, onLabel: null }), NOW);
      expect(thin).toContain('remark rather than a handoff');
      expect(thin).toContain('nothing has been sent to anybody');
      expect(thin).toContain('Ask what exactly is needed and from whom');
    });

    it('knows how complete the picture is instead of disclaiming it', () => {
      const nothing = howCompleteThePictureIs(material({ finishedCheckIns: 0 }));
      expect(nothing.band).toBe('nothing yet');
      expect(nothing.line).toContain('about the record rather than about them');

      const thin = howCompleteThePictureIs(material({
        finishedCheckIns: 0,
        commitments: [{ text: 'a', state: 'OPEN', dueAt: null, statedAt: daysAgo(9) }],
      }));
      expect(thin.band).toBe('thin');
      expect(thin.gaps.join(' ')).toContain('No check-in of theirs has finished');

      const full = howCompleteThePictureIs(material({
        finishedCheckIns: 3,
        commitments: [{ text: 'a', state: 'OPEN', dueAt: daysAgo(2), statedAt: daysAgo(9) }],
        carrying: [{ externalId: 'S1', title: 'A thing', measure: 'revenue', lastSeenAt: daysAgo(1) }],
      }));
      expect(full.band).toBe('well covered');
      expect(full.gaps).toEqual([]);
      /* Even a full picture is still not an assessment. */
      expect(full.line).toContain('still not an assessment');
    });

    it('names the gaps so they can be closed, rather than only grading them', () => {
      const c = howCompleteThePictureIs(material({
        finishedCheckIns: 2,
        carrying: [{ externalId: 'S1', title: 'A thing', measure: null, lastSeenAt: daysAgo(1) }],
        commitments: [{ text: 'a', state: 'OPEN', dueAt: null, statedAt: daysAgo(3) }],
      }));
      expect(c.band).toBe('partly covered');
      expect(c.gaps.join(' ')).toContain('no measure');
      expect(c.gaps.join(' ')).toContain('no date');
    });

    it('gives the completeness on every read, both sides seeing the same answer', () => {
      /* A lead told the picture is thin while the person believes they are read in full is the
         asymmetry this product exists to remove. One function answers for whoever asks. */
      const read = theReadFor(material({ finishedCheckIns: 0 }));
      expect(read.completeness.band).toBe('nothing yet');
      expect(read.completeness).toEqual(howCompleteThePictureIs(material({ finishedCheckIns: 0 })));
    });
  });
});
