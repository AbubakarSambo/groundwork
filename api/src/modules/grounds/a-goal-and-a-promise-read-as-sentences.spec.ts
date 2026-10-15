import { yourBoard } from './your-board';

/**
 * GOALS AND "WHAT YOU SAID YOU'D DO", AS PLAIN SENTENCES (group 2's review, faults A and B).
 *
 * Rukia's board read "shops. You have 0 of 4.", "success is two shop visits together each week in
 * October" and duplicate to-dos such as "I will plan shorter routes" beside "I will plan shorter
 * routes starting Monday 5 October." This is the fix, as the pure function `yourBoard` produces it:
 * a bare field name is never put in front of a full stop; a lowercase fragment a lead wrote is
 * capitalised and given a stop; a person's own words ("I want it at 162,000 by December.") are kept;
 * and where the same promise was written twice, the fuller, dated copy is the one shown, as an
 * action rather than "I will ...".
 */
const ORG = 'org1';
const reader = { userId: 'u-rukia', organizationId: ORG };

const ground = {
  id: 'g1', label: 'Sales team, Q3', organizationId: ORG, status: 'ACTIVE', initiatorId: 'u-lead',
  closedAt: null, resolvedAt: null,
  participants: [{ id: 'p-rukia', userId: 'u-rukia' }],
  checkIns: [],
};

function board(rows: Partial<Parameters<typeof yourBoard>[2]>) {
  return yourBoard([ground], reader, {
    objectives: [], ownedTargets: [], commitments: [], coaching: [], todos: [], ...rows,
  } as any);
}

describe('a goal built from an owned target', () => {
  it('never puts a bare field name in front of a full stop: it builds the sentence from the number and its unit', () => {
    const b = board({ ownedTargets: [{ id: 't1', groundId: 'g1', name: 'shops', target: 4, count: 0 }] });
    expect(b.goals.map((g) => g.says)).toEqual(['You have 0 of 4 shops.']);
  });

  it('keeps a real phrase, only capitalised and given a stop, with the count beside it', () => {
    const b = board({ ownedTargets: [{ id: 't1', groundId: 'g1', name: '25 sales by 30 September', target: 25, count: 23 }] });
    expect(b.goals.map((g) => g.says)).toEqual(['25 sales by 30 September. You have 23 of 25.']);
  });

  it('says every number so a person can read it, and a goal in the first person is the reader\'s (review of 1 October 2026)', () => {
    const b = board({ ownedTargets: [
      { id: 't1', groundId: 'g1', name: 'N30m disbursed', target: 30_000_000, count: 4_000_000 },
      { id: 't2', groundId: 'g1', name: "I'm aiming for 254000 in new business", target: 254_000, count: 31_000 },
    ] });
    expect(b.goals.map((g) => g.says)).toEqual([
      '30 million naira disbursed. You have 4 million naira of 30 million naira.',
      'You are aiming for 254,000 in new business. You have 31,000 of 254,000.',
    ]);
    expect(JSON.stringify(b.goals)).not.toMatch(/\d{5,}/);
  });

  it('with no target at all, still reads as one capitalised sentence', () => {
    const b = board({ ownedTargets: [{ id: 't1', groundId: 'g1', name: 'keep the customer list tidy', target: null, count: null }] });
    expect(b.goals.map((g) => g.says)).toEqual(['Keep the customer list tidy.']);
  });
});

describe('a goal from what a lead or an admin wrote', () => {
  it('capitalises a lowercase start and adds the stop a fragment is missing', () => {
    const b = board({
      objectives: [{ id: 'o1', groundId: 'g1', participantId: 'p-rukia', text: 'success is two shop visits together each week in October', kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', dueSaid: null }],
    });
    expect(b.goals.map((g) => g.says)).toEqual(['Success is two shop visits together each week in October.']);
  });

  it('keeps a person’s own words exactly, when they already read as a sentence', () => {
    const b = board({
      objectives: [{ id: 'o1', groundId: 'g1', participantId: 'p-rukia', text: 'I want it at 162,000 by December.', kind: 'GOAL', status: 'OPEN', authoredBy: 'self', dueSaid: null }],
    });
    expect(b.goals.map((g) => g.says)).toEqual(['I want it at 162,000 by December.']);
  });
});

describe('what you said you’d do', () => {
  const c = (id: string, text: string, whenSaid: string | null, createdAt: Date) =>
    ({ id, groundId: 'g1', participantId: 'p-rukia', text, whenSaid, status: 'UNKNOWN', createdAt });

  it('takes off a leading "I will", "I\'ll" or "I am going to", and capitalises what is left', () => {
    const b = board({
      commitments: [
        c('k1', 'I will file the bundle', 'Thursday', new Date('2026-09-20')),
        c('k2', 'I’ll call her back', 'today', new Date('2026-09-21')),
        c('k3', 'I am going to send them the price list', 'tomorrow', new Date('2026-09-22')),
      ],
    });
    expect(b.saidYoudDo.map((s) => s.text)).toEqual(['File the bundle', 'Call her back', 'Send them the price list']);
  });

  it('where the same promise was written twice, shows the fuller, dated copy, never the shorter one', () => {
    const b = board({
      commitments: [
        c('k1', 'I will plan shorter routes', null, new Date('2026-09-20')),
        c('k2', 'I will plan shorter routes starting Monday 5 October', 'starting Monday 5 October', new Date('2026-09-20T00:00:01Z')),
      ],
    });
    expect(b.saidYoudDo.map((s) => s.text)).toEqual(['Plan shorter routes starting Monday 5 October']);
  });

  it('the same promise can live twice in two different places - a commitment and a self-authored objective - and still shows only the fuller one', () => {
    const b = board({
      commitments: [c('k1', 'I will plan shorter routes', null, new Date('2026-09-20'))],
      objectives: [{ id: 'o1', groundId: 'g1', participantId: 'p-rukia', text: 'I will plan shorter routes starting Monday 5 October', kind: 'COMMITMENT', status: 'OPEN', authoredBy: 'self', dueSaid: 'starting Monday 5 October', createdAt: new Date('2026-09-20T00:00:01Z') }],
    });
    expect(b.saidYoudDo.map((s) => s.text)).toEqual(['Plan shorter routes starting Monday 5 October']);
  });

  it('a settled copy wins over an open copy of the same words, and a different settled one is kept apart', () => {
    const b = board({
      commitments: [
        c('k1', 'I will call the client on Wednesday 30 September to get the statement signed', 'Wednesday 30 September', new Date('2026-09-20')),
        { ...c('k2', 'I will call the client', null, new Date('2026-09-20T00:00:01Z')), status: 'DONE' },
      ],
    });
    /* Changed at the merge of 1 October to the engine's own rule for one promise said twice
       (request 96, one-promise-is-served-once-on-the-you-board.spec.ts, "does not fold a settled
       promise into an open one"): which promises are the same is the engine's to decide. A settled
       copy wins over an open copy of the very same words and time; a short settled promise and a
       fuller open one are kept as two. */
    expect(b.saidYoudDo.map((s) => [s.text, s.stateSays])).toEqual([
      ['Call the client on Wednesday 30 September to get the statement signed', 'Open'],
      ['Call the client', 'Kept'],
    ]);
  });
});
