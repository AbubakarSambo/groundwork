import { whatToWorkOnNext } from './what-to-work-on-next';
import { whatToProbe } from './what-to-probe';

/**
 * THE TWO COACHING SURFACES READ THE SAME ROWS AND MUST NOT CONTRADICT EACH OTHER.
 *
 * The member is told what to move before the next session. The lead is told what to probe each
 * person on. If a lead raises something the person was never told about, the conversation is an
 * ambush - which is the opposite of a product whose claim is that everybody sees the same record.
 *
 * AND NEITHER OF THEM RENDERS A VERDICT. Not on character, not on motivation, not on effort. The
 * words this bans are the ones a manager reaches for when a record shows somebody stuck, and every
 * one of them is a conclusion the record cannot carry and the person cannot answer.
 */
const waiting = { what: 'the on-call rota', who: 'Hafsah', daysOld: 26, escalated: false };

const memberBase = {
  patterns: [],
  role: 'ward coordinator',
  detectedFunction: null as string | null,
  functionConfidence: null as number | null,
  noticedBehaviour: null as string | null,
  sessionNumber: 2,
  totalSessions: 6,
  scenario: 'NEW_HIRE',
  waitingOn: [] as any[],
  holdingUp: [] as any[],
  saidSomethingSpecific: true,
  anythingDocumented: false,
};

const leadBase = {
  who: 'Zainab',
  participantId: 'p1',
  role: 'ward coordinator',
  answeredThisSession: true,
  waitingOn: [] as any[],
  holdingUp: [] as any[],
  concrete: [] as string[],
  documentsAttached: 0,
  sessionNumber: 2,
  totalSessions: 6,
  scenario: 'NEW_HIRE',
};

const VERDICTS = /\b(excuse|excuses|not trying|lazy|underperform|underperforming|poor performer|unwilling|cannot be trusted|dishonest|complacent)\b/i;

describe('neither surface passes a verdict', () => {
  const member = whatToWorkOnNext({ ...memberBase, waitingOn: [waiting] });
  const lead = whatToProbe({ ...leadBase, waitingOn: [waiting] });

  it('the member note carries none of the words a manager reaches for', () => {
    expect(JSON.stringify(member)).not.toMatch(VERDICTS);
  });

  it('nor does the lead section', () => {
    expect(JSON.stringify(lead)).not.toMatch(VERDICTS);
  });

  it('and silence in the record is reported as silence, never as not having tried', () => {
    /* F2: the record's silence about what more was done is not stated as a finding. */
    expect(lead.triedToUnblock).toBe('It was asked for.');
    expect(lead.triedToUnblock).not.toMatch(/not (?:trying|tried)|no effort/i);
  });
});

describe('the same blocker reaches both, so the conversation is not an ambush', () => {
  const member = whatToWorkOnNext({ ...memberBase, waitingOn: [waiting] });
  const lead = whatToProbe({ ...leadBase, waitingOn: [waiting] });

  it('the lead is pointed at the rota', () => {
    expect(lead.probe.join(' ')).toContain('the on-call rota');
  });

  it('and the person was already told to move the rota', () => {
    expect(member.beforeNextTime.join(' ')).toContain('the on-call rota');
  });

  it('and neither of them says "ask again", which is the thing that has not worked', () => {
    expect(member.beforeNextTime.join(' ')).toMatch(/in writing|above them/);
    expect(member.beforeNextTime.join(' ')).not.toMatch(/\bask again\b/i);
  });
});

describe('what somebody is blocking outranks what they are waiting on', () => {
  const member = whatToWorkOnNext({
    ...memberBase,
    waitingOn: [waiting],
    holdingUp: [{ what: 'the ward handover note', who: 'Tunde', daysOld: 9, escalated: false }],
  });

  it('leads with the person who is stopped', () => {
    expect(member.beforeNextTime[0]).toContain('the ward handover note');
    expect(member.beforeNextTime[0]).toContain('Tunde');
  });

  it('says it as this person\'s own conduct, and asks nothing of anybody else', () => {
    /* "You are named as the holdup on X" is about the reader. "Tunde should chase you" is not, and
       a private note that instructs somebody about a third party is a management memo. */
    expect(member.beforeNextTime[0]).toMatch(/waiting on you/);
    expect(member.beforeNextTime[0]).toMatch(/Either do it, or give a date/);
  });
});

describe('recurrence is what makes a pattern', () => {
  const once = whatToWorkOnNext({ ...memberBase, patterns: [{ code: 'K3', periodsObserved: 1 }] });
  const twice = whatToWorkOnNext({ ...memberBase, patterns: [{ code: 'K3', periodsObserved: 3 }] });

  it('a single observation is not reported as something that keeps happening', () => {
    expect(once.showingUp).toBeNull();
    expect(once.general).toBe(true);
  });

  it('and one seen across sessions is, with the count that makes it one', () => {
    expect(twice.showingUp).toContain('3 of your check-ins');
    expect(twice.showingUp).toContain('not just once');
    expect(twice.general).toBe(false);
  });

  /*
   * Hafsah, 29 September 2026: CARRYING_CODES (A1, A2, A3) were left out of this file's own
   * LIBRARY map, so a carrying pattern genuinely served to this reader on the board (which reads
   * the plain-name check in patterns/who-reads-a-pattern.ts, and does cover them) found no
   * `recurring` entry here - the note said "Nothing has recurred..." beside a pattern that had.
   */
  it('a carrying pattern is recognised as recurring too, not only a bad-faith or positive one', () => {
    const carrying = whatToWorkOnNext({ ...memberBase, patterns: [{ code: 'A1', periodsObserved: 3 }] });
    expect(carrying.showingUp).not.toBeNull();
    expect(carrying.general).toBe(false);
  });

  it('when nothing has recurred, it says so plainly, with no "which is worth keeping that way"', () => {
    const nothing = whatToWorkOnNext({ ...memberBase, patterns: [], sessionNumber: 4 });
    expect(nothing.whyItMatters).toContain('Nothing has come up often enough yet to be called a pattern.');
    expect(nothing.whyItMatters).not.toContain('recurred');
    expect(nothing.whyItMatters).not.toContain('worth keeping that way');
  });

  /* Hafsah, 29 September 2026: a role map's label can hold an acronym ("Founder or CEO"), and
     lowering the whole label turned it into "founder or ceo work" in the sentence. */
  it('never lower-cases a role, even mid-sentence', () => {
    const founder = whatToWorkOnNext({ ...memberBase, patterns: [], detectedFunction: 'CEO', functionConfidence: 0.9, sessionNumber: 4 });
    expect(founder.whyItMatters).toContain('founder or CEO work');
    expect(founder.whyItMatters).not.toContain('founder or ceo');
  });

  it('the lead\'s probe list states no stored pattern: what the record shows about a person is layer 2\'s', () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const lead = whatToProbe({ ...leadBase } as any);
    expect(lead.probe.join(' ')).not.toMatch(/On record across|Issues flagged repeatedly/);
  });
});

describe('role and stage change what the same fact is worth raising as', () => {
  const early = whatToProbe({ ...leadBase, sessionNumber: 2, waitingOn: [waiting] });
  const later = whatToProbe({ ...leadBase, sessionNumber: 5, waitingOn: [waiting] });

  /* F2 (false-flags.md, cause 1): a record that does not say what somebody did says nothing about them, early or late. */
  it('early or late, the wait is the fact and the lead is given a question, never "nothing on record says it was raised higher"', () => {
    for (const p of [early, later]) {
      expect(p.probe.join(' ')).toContain('Ask Zainab what has happened with it since.');
      expect(p.probe.join(' ')).not.toMatch(/raised higher|what has stopped/);
    }
  });
});

describe('the box never renders empty', () => {
  it('with no pattern and no blocker it still says what to do', () => {
    const out = whatToWorkOnNext(memberBase);
    expect(out.beforeNextTime.length).toBeGreaterThan(0);
    expect(out.whyItMatters).toContain('session 2 of 6');
  });

  it('and the lead section says plainly when nothing is blocked', () => {
    expect(whatToProbe(leadBase).triedToUnblock).toBe("Nothing in the record says Zainab's work is waiting on a named person.");
  });
});
