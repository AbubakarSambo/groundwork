import { ReportsService } from './reports.service';

/**
 * WHAT REACHES THE SYNTHESIS, AND WHAT IT IS TOLD TO DO WITH IT.
 *
 * Blockers were recorded from both sides and never reached the report, so "he could not get pricing
 * approval" and "he did not do it" arrived looking identical to the person reading it. This is the
 * grounding that separates them - facts somebody wrote, with the explanation decided in code before
 * the model sees it.
 */
/* Comfortably behind, and stays behind however long this repository lives. */
const PAST = new Date('2020-10-30T00:00:00Z');

const svc = (over: { objectives?: any[]; blockers?: any[]; deliveries?: any[]; saidWhy?: any[] } = {}) => {
  const s = Object.create(ReportsService.prototype) as any;
  s.logger = { warn: () => {} };
  s.prisma = {
    personObjective: { findMany: async () => over.objectives ?? [] },
    groundDependency: { findMany: async () => over.blockers ?? [] },
    delivery: { findMany: async () => over.deliveries ?? [] },
    /*
     * HONOURS THE WHERE CLAUSE rather than returning everything, because the thing worth proving
     * about this read is that it is scoped - a stub that hands back every turn regardless would
     * pass just as happily against code that had dropped `role: 'PERSON'`.
     */
    /*
     * THE VERDICT, NOT THE TRANSCRIPT. This stubbed conversation turns at first, which is how the
     * feature was originally built - and a guard on "it never shows anyone's raw answers" said the
     * shared report may not touch a transcript at all. The deciding moved into the conversation and
     * this row is what crosses over.
     */
    checkIn: { findMany: async () => over.saidWhy ?? [] },
    /* Somebody's own account of work no system recorded - see `theirAccounts` in the service. */
    ground: { findUnique: async () => ({ organizationId: 'org1' }) },
    interaction: { findMany: async () => (over as any).theirAccounts ?? [] },
  };
  return s;
};

/*
 * ONLY THE RECORDED LINES. The instructions below them now name every explanation, including the
 * two personal ones, so a test asserting a phrase is ABSENT has to look at what was written about
 * the people - or the prompt's own rule about a phrase satisfies a check meant to prove the phrase
 * never reached anybody's line.
 */
const recorded = (out: string) => out.slice(0, out.indexOf('USING THIS.'));

const labels = new Map([['ed', 'the engagement director'], ['ceo', 'the initiator']]);
const objective = (over: any = {}) => ({
  participantId: 'ed', text: 'Three proposals out', dueDate: PAST, dueSaid: 'end of October',
  status: 'OPEN', seenBySubject: true, awareness: 'TOLD', kind: 'TARGET', ...over,
});

describe('what the model is given', () => {
  it('the promise, the date, and what the record shows about it', async () => {
    const out = await svc({ objectives: [objective()] }).whatTheRecordShows('g1', labels);
    expect(out).toContain('"Three proposals out"');
    expect(out).toContain('Due 2020-10-30');
    expect(out).toContain('they said "end of October"');
    expect(out).toContain('no blocker has been recorded');
  });

  it('a blocker, from the side that recorded it', async () => {
    const out = await svc({
      objectives: [objective()],
      blockers: [{ fromParticipantId: 'ed', onParticipantId: 'ceo', onLabel: null, what: 'pricing approval', escalatedAt: null }],
    }).whatTheRecordShows('g1', labels);
    expect(out).toContain('pricing approval');
    expect(out).toContain('not theirs to clear alone');
    /* And the execution reading is gone, because something is in the way. */
    expect(out).not.toContain('no blocker has been recorded');
  });

  it('what somebody said themselves about why, reaching the assembled grounding', async () => {
    /*
     * Proved HERE and not only against the function, because the two explanations a person can only
     * give about themselves are worth nothing if the words never reach the prompt - and the join
     * that carries them is where that breaks.
     */
    const out = await svc({
      objectives: [objective()],
      saidWhy: [{ participantId: 'ed', saidWhy: 'SKILL' }],
    }).whatTheRecordShows('g1', labels);
    expect(recorded(out)).toContain('said themselves that they do not know how');
    expect(recorded(out)).toContain('not something to ask them to try harder at');
    /*
     * AND NOT THE SENTENCE. A shared report is read by the person's colleagues, and the site
     * promises the product never shows anyone's raw answers. The explanation travels; the words
     * stay in the conversation they were said in.
     */
    expect(out).not.toContain('I have never done one before, honestly.');
    /* And the execution reading is gone, because they answered the question. */
    expect(out).not.toContain('no blocker has been recorded');
  });

  it('never one person\'s verdict as another person\'s explanation', async () => {
    const out = await svc({
      objectives: [objective()],
      saidWhy: [{ participantId: 'ceo', saidWhy: 'CONFIDENCE' }],
    }).whatTheRecordShows('g1', labels);
    expect(recorded(out)).toContain('no blocker has been recorded');
    expect(recorded(out)).not.toContain('putting it off');
  });

  it('labels, never names, so this cannot be the one place a name reaches a stored report', async () => {
    const out = await svc({ objectives: [objective()] }).whatTheRecordShows('g1', labels);
    expect(out).toContain('the engagement director');
    expect(out).not.toContain('ed:');
  });

  it('and nothing at all when there is nothing on the record', async () => {
    expect(await svc().whatTheRecordShows('g1', labels)).toBe('');
  });
});

describe('what the model is forbidden', () => {
  it('inventing a seventh explanation', async () => {
    const out = await svc({ objectives: [objective()] }).whatTheRecordShows('g1', labels);
    expect(out).toContain('Do not invent a different explanation');
    expect(out).toContain('only six');
  });

  it('reaching the two personal explanations from anything but the person\'s own words', async () => {
    /*
     * The rule that keeps two new explanations from becoming a model's read on somebody's nerve.
     * It went in with them: the prompt said "the only four" for a while after there were six, which
     * is the kind of drift that has a model quietly discarding a real explanation it was handed.
     */
    const out = await svc({ objectives: [objective()] }).whatTheRecordShows('g1', labels);
    expect(out).toContain('only ever there because THEY said so');
    expect(out.replace(/\s+/g, ' ')).toContain('Their actual sentence is deliberately NOT given to you');
  });

  it('turning a blocker into a complaint about the person it names', async () => {
    const out = await svc({ objectives: [objective()] }).whatTheRecordShows('g1', labels);
    expect(out).toContain('A blocker is a reason, not an excuse');
  });

  it('saying anybody failed', async () => {
    const out = await svc({ objectives: [objective()] }).whatTheRecordShows('g1', labels);
    expect(out).toContain('Never write that somebody failed');
  });
});

describe('where a system and a person disagree', () => {
  const theirAccount = {
    personExternalId: 'p-sam', counterpartyExternalId: null, kind: 'CALL',
    happenedAt: new Date('2026-11-03T00:00:00Z'), note: 'Called her from my own phone',
  };

  it('both sides are stated and neither settles the other', async () => {
    const out = await svc({ objectives: [objective()], theirAccounts: [theirAccount] } as any)
      .whatTheRecordShows('g1', labels);
    expect(out).toContain('OWN ACCOUNT IS THE ONLY RECORD');
    expect(out).toContain('Called her from my own phone');
    expect(out).toContain('not in any connected system');
  });

  it('and a missing record is never called evidence that nothing happened', async () => {
    const out = await svc({ objectives: [objective()], theirAccounts: [theirAccount] } as any)
      .whatTheRecordShows('g1', labels);
    expect(out).toContain('a missing record is not evidence it did not happen');
  });

  it('with nothing added when every account is corroborated', async () => {
    const out = await svc({ objectives: [objective()] }).whatTheRecordShows('g1', labels);
    expect(out).not.toContain('OWN ACCOUNT IS THE ONLY RECORD');
  });
});

describe('the fair readings', () => {
  it('an expectation nobody showed them is never read as not doing it', async () => {
    const out = await svc({ objectives: [objective({ seenBySubject: false })] }).whatTheRecordShows('g1', labels);
    expect(out).toContain('not been shown to the person it is about');
    expect(out).not.toContain('no blocker has been recorded');
  });

  it('a promise with no date is said to be undateable, not late', async () => {
    const out = await svc({ objectives: [objective({ dueDate: null, dueSaid: 'soon' })] }).whatTheRecordShows('g1', labels);
    expect(out).toContain('which is not a date');
    expect(out).toContain('cannot be late');
  });
});
