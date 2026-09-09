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
  patterns: [] as any[],
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
    expect(lead.triedToUnblock).toContain('no escalation');
    expect(lead.triedToUnblock).toContain('does not say whether anything happened outside');
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
    expect(member.beforeNextTime[0]).toMatch(/Either do it, or tell them a date/);
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
    expect(twice.showingUp).toContain('3 sessions');
    expect(twice.general).toBe(false);
  });

  it('the lead sees the same threshold, and the history rather than a conclusion', () => {
    const lead = whatToProbe({
      ...leadBase,
      patterns: [{ code: 'K3', periodsObserved: 3, signal: 'Issues flagged repeatedly without resolution.' }],
    });
    expect(lead.probe.join(' ')).toContain('On record across 3 sessions');
  });
});

describe('role and stage change what the same fact is worth raising as', () => {
  const early = whatToProbe({ ...leadBase, sessionNumber: 2, waitingOn: [waiting] });
  const later = whatToProbe({ ...leadBase, sessionNumber: 5, waitingOn: [waiting] });

  it('a new hire in session 2 who has not escalated is somebody to coach', () => {
    expect(early.probe.join(' ')).toContain('worth showing them rather than asking about');
  });

  it('and the same fact later is something to ask about', () => {
    expect(later.probe.join(' ')).toContain('what has stopped them raising it');
  });
});

describe('the box never renders empty', () => {
  it('with no pattern and no blocker it still says what to do', () => {
    const out = whatToWorkOnNext(memberBase);
    expect(out.beforeNextTime.length).toBeGreaterThan(0);
    expect(out.whyItMatters).toContain('session 2 of 6');
  });

  it('and the lead section says plainly when nothing is blocked', () => {
    expect(whatToProbe(leadBase).triedToUnblock).toContain('Nothing recorded as blocked');
  });
});
