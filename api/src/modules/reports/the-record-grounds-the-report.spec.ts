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

const svc = (over: { objectives?: any[]; blockers?: any[]; deliveries?: any[] } = {}) => {
  const s = Object.create(ReportsService.prototype) as any;
  s.logger = { warn: () => {} };
  s.prisma = {
    personObjective: { findMany: async () => over.objectives ?? [] },
    groundDependency: { findMany: async () => over.blockers ?? [] },
    delivery: { findMany: async () => over.deliveries ?? [] },
  };
  return s;
};

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
  it('inventing a fifth explanation', async () => {
    const out = await svc({ objectives: [objective()] }).whatTheRecordShows('g1', labels);
    expect(out).toContain('Do not invent a different explanation');
    expect(out).toContain('only four');
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
