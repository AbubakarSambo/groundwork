import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SuggestionsService, REFUSED } from './suggestions.service';
import { labelsForParties } from '../reports/party-labels';

/**
 * SUGGESTIONS FROM A VERDICT, AND APPEALS, AS EACH PERSON IS SERVED THEM (C3, U.13; rule 6).
 *
 * Baridi Appliances. Wairimu runs "Daniel, the next six weeks", with Daniel in it, and "Sales team,
 * Q3", with Daniel and Miriam in it. Grace and Omar are admins in neither. Kofi is a member in
 * neither. The engine has made one suggestion about Daniel on each check-in, stored in labels.
 *
 * The rules under test, each read from what the server actually hands each reader:
 *   - Wairimu reads the suggestion, decides with reasons, and reads Daniel's side and appeal;
 *   - Daniel reads the facts and the decision with its reasons, never the headline, the lead's why
 *     or the verdict; he adds his side and appeals;
 *   - Grace reads a suggestion only once it is appealed, and decides the appeal;
 *   - Miriam, a colleague in the team check-in, reads nothing about Daniel; Kofi is refused;
 *   - nobody is served a label on a person, the verdict, or how anybody's answers were rated.
 */

const ORG = 'org-baridi';
const people = {
  wairimu: { userId: 'u-wairimu', firstName: 'Wairimu', role: 'MEMBER' },
  daniel: { userId: 'u-daniel', firstName: 'Daniel', role: 'MEMBER' },
  miriam: { userId: 'u-miriam', firstName: 'Miriam', role: 'MEMBER' },
  grace: { userId: 'u-grace', firstName: 'Grace', role: 'ADMIN' },
  omar: { userId: 'u-omar', firstName: 'Omar', role: 'ADMIN' },
  kofi: { userId: 'u-kofi', firstName: 'Kofi', role: 'MEMBER' },
};
type Who = keyof typeof people;

const party = (id: string, who: Who, partyType: string, role: string, at: number) => ({
  id, userId: people[who].userId, partyType, roleAsDescribed: role, email: `${who}@baridi.test`,
  createdAt: new Date(2026, 7, at),
  user: { firstName: people[who].firstName, lastName: 'X', email: `${who}@baridi.test` },
});

const grounds: Record<string, any> = {
  'g-daniel': {
    id: 'g-daniel', label: 'Daniel, the next six weeks', organizationId: ORG, initiatorId: 'u-wairimu',
    scenario: 'PIP', peersVisibleToEachOther: null,
    participants: [party('p-w1', 'wairimu', 'INITIATOR', 'Sales lead', 1), party('p-d1', 'daniel', 'PARTICIPANT', 'Sales rep', 2)],
  },
  'g-sales': {
    id: 'g-sales', label: 'Sales team, Q3', organizationId: ORG, initiatorId: 'u-wairimu',
    scenario: 'TEAM_PROJECT', peersVisibleToEachOther: null,
    participants: [
      party('p-w2', 'wairimu', 'INITIATOR', 'Sales lead', 1),
      party('p-d2', 'daniel', 'PARTICIPANT', 'Field rep', 2),
      party('p-m2', 'miriam', 'PARTICIPANT', 'Account rep', 3),
    ],
  },
};

/** Daniel's label on his own check-in, which is what the engine's stored text calls him. */
const D = labelsForParties(grounds['g-daniel'].participants).get('p-d1')!;

function aSuggestion(over: Partial<any> = {}) {
  return {
    groundId: 'g-daniel',
    aboutParticipantId: 'p-d1',
    verdict: 'plan',
    headline: `Groundwork suggests a performance plan for ${D}`,
    why: `In the last 4 weeks, ${D} kept 11 of 20 commitments. That is 55%. Below 6 in 10, Groundwork suggests a plan.`,
    whatWouldChangeIt: 'Keeping 8 in 10 of the commitments for the next 4 weeks.',
    theirOwnAnswer: 'Most of my time goes on cleaning the customer records, which I was asked to do.',
    ifYouAgree: 'A 6-week plan, with one hour a week together, and the customer records moved to Brian.',
    otherChoices: ['Extra help, without a plan', 'Keep things as they are'],
    factsForThem: `In the last 4 weeks, ${D} kept 11 of 20 commitments. When fewer than 6 in 10 are kept, Groundwork suggests extra help to the manager.`,
    whatWouldChangeItForThem: 'Keeping 8 in 10 for the next 4 weeks.',
    ...over,
  };
}

function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (k === 'about') {
      const p = Object.values(grounds).flatMap((g) => g.participants).find((x: any) => x.id === row.aboutParticipantId);
      return p?.userId === v.userId;
    }
    if (v && typeof v === 'object' && 'not' in v) return row[k] !== v.not && row[k] != null;
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    return (row[k] ?? null) === v;
  });
}

/** A row as it would sit in the table, written before the engine stopped reaching anything on a team check-in. */
function aRowAlreadyThere(over: Partial<any> = {}) {
  return {
    id: 's-old', organizationId: ORG, ...aSuggestion(), ifYouAgree: null, otherChoices: [], forTheEnding: null,
    decision: null, decisionReason: null, decidedById: null, decidedAt: null, theirSide: null, theirSideAt: null,
    appeal: null, appealedAt: null, appealOutcome: null, appealReason: null, appealDecidedById: null, appealDecidedAt: null,
    createdAt: new Date(2026, 8, 1), ...over,
  };
}

function setup() {
  const suggestions: any[] = [];
  let n = 0;
  const prisma: any = {
    ground: { findUnique: jest.fn(async ({ where }: any) => grounds[where.id] ?? null) },
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) =>
        grounds[where.groundId]?.participants.find((p: any) => p.id === where.id) ?? null),
    },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const who = Object.values(people).find((p) => p.userId === where.userId_organizationId.userId);
        return who && where.userId_organizationId.organizationId === ORG ? { role: who.role } : null;
      }),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) =>
        Object.values(people).filter((p) => where.id.in.includes(p.userId)).map((p) => ({ id: p.userId, firstName: p.firstName }))),
    },
    suggestion: {
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `s-${++n}`, decision: null, decisionReason: null, decidedById: null, decidedAt: null,
          theirSide: null, theirSideAt: null, appeal: null, appealedAt: null, appealOutcome: null,
          appealReason: null, appealDecidedById: null, appealDecidedAt: null, createdAt: new Date(2026, 8, n), ...data,
        };
        suggestions.push(row);
        return { id: row.id };
      }),
      findMany: jest.fn(async ({ where }: any) => suggestions.filter((r) => matches(r, where))),
      findFirst: jest.fn(async ({ where }: any) => suggestions.find((r) => matches(r, where)) ?? null),
      findUnique: jest.fn(async ({ where }: any) => {
        const r = suggestions.find((x) => x.id === where.id);
        if (!r) return null;
        const p = Object.values(grounds).flatMap((g) => g.participants).find((x: any) => x.id === r.aboutParticipantId);
        return { ...r, about: { userId: p?.userId ?? null } };
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(suggestions.find((x) => x.id === where.id), data)),
    },
  };
  const svc = new SuggestionsService(prisma);
  const as = (who: Who) => ({ userId: people[who].userId, organizationId: ORG });
  return { svc, prisma, as, suggestions };
}

/** Everything a reader was handed, as one string, for the scans. */
const served = (x: unknown) => JSON.stringify(x);
const LABELS = /\b(PIP|at[- ]risk|exit|low[- ]performer|underperform\w*)\b/i;
const RATINGS = /specificity|confidence|severity|rating|score|"verdict"|"plan"/i;

describe('the lead, Wairimu, reads the suggestion and decides', () => {
  it('reads nothing until Daniel has had his turn (decision 53: the person sees it first)', async () => {
    const { svc, as } = setup();
    await svc.record(aSuggestion());
    /* Nothing said yet, and no time passed since it was reached (test rows are stamped early in
       the month; `now` here is the same moment, before the three days decision 53 waits). */
    const justReached = new Date(2026, 8, 1);
    expect((await svc.forGround('g-daniel', as('wairimu'), justReached)).suggestions).toEqual([]);
    /* And three days later, unanswered, Wairimu reads it anyway. */
    const threeDaysOn = new Date(2026, 8, 4);
    expect((await svc.forGround('g-daniel', as('wairimu'), threeDaysOn)).suggestions).toHaveLength(1);
  });

  it('is served the suggestion in the prototype’s parts, with Daniel named, once Daniel has answered', async () => {
    const { svc, as } = setup();
    const { id } = await svc.record(aSuggestion());
    /* Decision 53: whoever runs the check-in reads it only once the person has had their turn. */
    await svc.addSide(id, as('daniel'), { side: 'Most of my time goes on cleaning the customer records.' });
    const { suggestions } = await svc.forGround('g-daniel', as('wairimu'));
    expect(suggestions).toHaveLength(1);
    const s: any = suggestions[0];
    expect(s.headline).toBe('Groundwork suggests a performance plan for Daniel X');
    expect(s.why).toContain('Daniel X kept 11 of 20 commitments');
    expect(s.whatWouldChangeIt).toBe('Keeping 8 in 10 of the commitments for the next 4 weeks.');
    expect(s.theirOwnAnswer).toBe('Most of my time goes on cleaning the customer records, which I was asked to do.');
    expect(s.aboutName).toBe('Daniel');
    expect(s.ifYouAgree).toContain('A 6-week plan');
    expect(s.otherChoices).toEqual(['Extra help, without a plan', 'Keep things as they are']);
    expect(s.decision).toBeNull();
    expect(s.mayChangeTheDecision).toBe(true);
    expect(s).not.toHaveProperty('verdict');
    expect(s).not.toHaveProperty('factsForThem');
  });

  it('decides with reasons, and is refused a decision with no reasons or no decision', async () => {
    const { svc, as } = setup();
    const { id } = await svc.record(aSuggestion());
    await expect(svc.decide(id, as('wairimu'), { decision: 'A 6-week plan.', reasons: '  ' })).rejects.toThrow(REFUSED.sayWhy);
    await expect(svc.decide(id, as('wairimu'), { decision: '', reasons: 'Because.' })).rejects.toThrow(REFUSED.sayWhatYouDecided);
    const { suggestions } = await svc.decide(id, as('wairimu'), {
      decision: 'Extra help, without a plan',
      reasons: 'The customer records took his time. Brian takes them over from Monday.',
    });
    expect((suggestions[0] as any).decision).toMatchObject({
      says: 'Extra help, without a plan',
      reasons: 'The customer records took his time. Brian takes them over from Monday.',
    });
  });

  it('nobody but the lead may decide: not Daniel, not an admin, not a colleague', async () => {
    const { svc, as } = setup();
    const { id } = await svc.record(aSuggestion());
    for (const who of ['daniel', 'grace', 'miriam', 'kofi'] as Who[]) {
      await expect(svc.decide(id, as(who), { decision: 'Keep things as they are', reasons: 'x' })).rejects.toThrow(REFUSED.onlyTheLead);
    }
  });
});

describe('the person, Daniel, reads the facts and the decision, never the verdict', () => {
  it('before a decision: the facts about his work, in "you", and what would change them', async () => {
    const { svc, as } = setup();
    await svc.record(aSuggestion());
    const { suggestions } = await svc.forGround('g-daniel', as('daniel'));
    const s: any = suggestions[0];
    expect(s.facts).toBe('In the last 4 weeks, you kept 11 of 20 commitments. When fewer than 6 in 10 are kept, Groundwork suggests extra help to the manager.');
    expect(s.whatWouldChangeIt).toBe('Keeping 8 in 10 for the next 4 weeks.');
    expect(s.leadName).toBe('Wairimu');
    expect(s.decision).toBeNull();
    expect(s.mayAppeal).toBe(false);
    for (const hidden of ['headline', 'why', 'verdict', 'ifYouAgree', 'otherChoices', 'theirOwnAnswer']) expect(s).not.toHaveProperty(hidden);
    expect(served(s)).not.toContain('performance plan');
    expect(served(s)).not.toContain('Below 6 in 10');
  });

  it('adds his side, which Wairimu then reads beside the facts', async () => {
    const { svc, as } = setup();
    const { id } = await svc.record(aSuggestion());
    await expect(svc.addSide(id, as('daniel'), { side: ' ' })).rejects.toThrow(REFUSED.writeYourSide);
    const mine = await svc.addSide(id, as('daniel'), { side: 'I was asked to clean 480 customer records.' });
    expect(mine.yourSide).toBe('I was asked to clean 480 customer records.');
    const lead: any = (await svc.forGround('g-daniel', as('wairimu'))).suggestions[0];
    expect(lead.theirSide).toBe('I was asked to clean 480 customer records.');
  });

  it('nobody but Daniel may add his side or appeal', async () => {
    const { svc, as } = setup();
    const { id } = await svc.record(aSuggestion());
    await svc.decide(id, as('wairimu'), { decision: 'A 6-week plan.', reasons: 'The numbers.' });
    for (const who of ['wairimu', 'grace', 'miriam', 'kofi'] as Who[]) {
      await expect(svc.addSide(id, as(who), { side: 'x' })).rejects.toThrow(REFUSED.onlyThePerson);
      await expect(svc.appeal(id, as(who), { why: 'x' })).rejects.toThrow(REFUSED.onlyThePerson);
    }
  });

  it('reads the decision with its reasons, appeals once, and only after a decision', async () => {
    const { svc, as } = setup();
    const { id } = await svc.record(aSuggestion());
    await expect(svc.appeal(id, as('daniel'), { why: 'Unfair.' })).rejects.toThrow(REFUSED.nothingToAppeal);
    await svc.decide(id, as('wairimu'), { decision: 'A 6-week plan, with one hour a week together.', reasons: 'Seven sales have been stuck for three check-ins.' });

    const before: any = (await svc.forGround('g-daniel', as('daniel'))).suggestions[0];
    expect(before.decision).toMatchObject({ says: 'A 6-week plan, with one hour a week together.', reasons: 'Seven sales have been stuck for three check-ins.' });
    expect(before.mayAppeal).toBe(true);

    await expect(svc.appeal(id, as('daniel'), { why: '' })).rejects.toThrow(REFUSED.sayWhyYouDisagree);
    const after = await svc.appeal(id, as('daniel'), { why: 'The records were the job I was given.' });
    expect(after.yourAppeal?.says).toBe('The records were the job I was given.');
    expect(after.mayAppeal).toBe(false);
    await expect(svc.appeal(id, as('daniel'), { why: 'Again.' })).rejects.toThrow(REFUSED.alreadyAppealed);

    /* And the lead can no longer change the decision: an admin decides it now. */
    await expect(svc.decide(id, as('wairimu'), { decision: 'Something else', reasons: 'x' })).rejects.toThrow(REFUSED.appealed);
    const lead: any = (await svc.forGround('g-daniel', as('wairimu'))).suggestions[0];
    expect(lead.appeal.says).toBe('The records were the job I was given.');
    expect(lead.mayChangeTheDecision).toBe(false);
  });

  it('on the You board, reads every suggestion about him, and only those', async () => {
    const { svc, as, suggestions } = setup();
    await svc.record(aSuggestion());
    /* CHANGED 1 October: nothing is reached on a team check-in now (decision 6), so Miriam's is a row written there before that rule. */
    suggestions.push(aRowAlreadyThere({ groundId: 'g-sales', aboutParticipantId: 'p-m2', factsForThem: 'MIRIAM-FACTS', headline: 'MIRIAM-HEADLINE', verdict: 'reward' }));
    const mine = await svc.aboutYou(as('daniel'));
    expect(mine).toHaveLength(1);
    expect(mine[0].checkIn).toEqual({ id: 'g-daniel', label: 'Daniel, the next six weeks' });
    expect(served(mine)).not.toContain('MIRIAM');
  });
});

describe('an admin, Grace, reads a suggestion only once it is appealed, and decides the appeal', () => {
  it('reads nothing on the check-in before an appeal, and nothing in her appeals', async () => {
    const { svc, as } = setup();
    const { id } = await svc.record(aSuggestion());
    expect((await svc.forGround('g-daniel', as('grace'))).suggestions).toEqual([]);
    await svc.decide(id, as('wairimu'), { decision: 'A 6-week plan.', reasons: 'The numbers.' });
    expect((await svc.forGround('g-daniel', as('grace'))).suggestions).toEqual([]);
    expect((await svc.appealsToDecide(as('grace'))).appeals).toEqual([]);
  });

  it('once appealed, reads what she needs to decide it, and decides with reasons both of them read', async () => {
    const { svc, as } = setup();
    const { id } = await svc.record(aSuggestion());
    await svc.addSide(id, as('daniel'), { side: 'I was asked to clean the records.' });
    await svc.decide(id, as('wairimu'), { decision: 'A 6-week plan.', reasons: 'The numbers.' });
    await svc.appeal(id, as('daniel'), { why: 'The records were the job I was given.' });

    const [a] = (await svc.appealsToDecide(as('grace'))).appeals;
    expect(a).toMatchObject({
      aboutName: 'Daniel',
      leadName: 'Wairimu',
      headline: 'Groundwork suggests a performance plan for Daniel X',
      decision: { says: 'A 6-week plan.', reasons: 'The numbers.' },
      theirSide: 'I was asked to clean the records.',
      appeal: { says: 'The records were the job I was given.' },
      mayDecide: true,
    });
    expect(a).not.toHaveProperty('verdict');
    expect(a).not.toHaveProperty('factsForThem');

    await expect(svc.decideAppeal(id, as('grace'), { outcome: 'changed', reasons: '' })).rejects.toThrow(REFUSED.sayWhyToBoth);
    await expect(svc.decideAppeal(id, as('grace'), { outcome: 'maybe', reasons: 'x' })).rejects.toThrow(REFUSED.keepOrChange);
    const left = await svc.decideAppeal(id, as('grace'), { outcome: 'changed', reasons: 'The records were his assigned work, so they count.' });
    expect(left.appeals).toEqual([]);
    await expect(svc.decideAppeal(id, as('omar'), { outcome: 'stands', reasons: 'x' })).rejects.toThrow(REFUSED.alreadyDecided);

    const daniel: any = (await svc.forGround('g-daniel', as('daniel'))).suggestions[0];
    expect(daniel.appealDecision).toMatchObject({ outcome: 'changed', says: 'The decision is changed.', reasons: 'The records were his assigned work, so they count.', by: 'Grace' });
    const wairimu: any = (await svc.forGround('g-daniel', as('wairimu'))).suggestions[0];
    expect(wairimu.appealDecision).toMatchObject({ says: 'The decision is changed.', by: 'Grace' });
  });

  it('nobody but an admin decides an appeal, and never the admin who made the decision', async () => {
    const { svc, as } = setup();
    /* Grace runs this one herself, and is an admin. */
    grounds['g-grace'] = {
      ...grounds['g-daniel'], id: 'g-grace', label: 'Daniel and Grace', initiatorId: 'u-grace',
      participants: [party('p-g3', 'grace', 'INITIATOR', 'Operations', 1), party('p-d3', 'daniel', 'PARTICIPANT', 'Sales rep', 2)],
    };
    try {
      const { id } = await svc.record(aSuggestion());
      await svc.decide(id, as('wairimu'), { decision: 'A 6-week plan.', reasons: 'The numbers.' });
      await svc.appeal(id, as('daniel'), { why: 'Unfair.' });
      for (const who of ['wairimu', 'daniel', 'miriam', 'kofi'] as Who[]) {
        await expect(svc.decideAppeal(id, as(who), { outcome: 'stands', reasons: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
      }
      await expect(svc.appealsToDecide(as('kofi'))).rejects.toThrow(REFUSED.onlyAnAdmin);

      const own = await svc.record(aSuggestion({ groundId: 'g-grace', aboutParticipantId: 'p-d3' }));
      await svc.decide(own.id, as('grace'), { decision: 'A 6-week plan.', reasons: 'The numbers.' });
      await svc.appeal(own.id, as('daniel'), { why: 'Unfair.' });
      await expect(svc.decideAppeal(own.id, as('grace'), { outcome: 'stands', reasons: 'x' })).rejects.toThrow(REFUSED.yourOwnDecision);
      const graces = (await svc.appealsToDecide(as('grace'))).appeals;
      expect(graces.find((x) => x.id === own.id)?.mayDecide).toBe(false);
      await expect(svc.decideAppeal(own.id, as('omar'), { outcome: 'stands', reasons: 'It was fair.' })).resolves.toBeDefined();
    } finally {
      delete grounds['g-grace'];
    }
  });
});

describe('a colleague, Miriam, and somebody outside, Kofi', () => {
  it('Miriam reads nothing about Daniel on the team check-in; Kofi is refused', async () => {
    const { svc, as, suggestions } = setup();
    suggestions.push(aRowAlreadyThere({ groundId: 'g-sales', aboutParticipantId: 'p-d2' }));
    expect((await svc.forGround('g-sales', as('miriam'))).suggestions).toEqual([]);
    await expect(svc.forGround('g-sales', as('kofi'))).rejects.toThrow(REFUSED.notInIt);
  });
});

/**
 * ON A TEAM CHECK-IN, NOTHING (decision 6, clarified 29 September: a verdict is reached only on the
 * evaluation check-ins of decision 17). "Sales team, Q3" is not one. The engine cannot write a
 * suggestion there, and a row already there is served to nobody and cannot be decided, answered or
 * appealed. CHANGED 1 October: Daniel used to read his own there.
 */
describe('on the team check-in, which is not an evaluation check-in', () => {
  it('the engine cannot write one there', async () => {
    const { svc } = setup();
    await expect(svc.record(aSuggestion({ groundId: 'g-sales', aboutParticipantId: 'p-d2' })))
      .rejects.toThrow('A suggestion is only reached on a performance plan, a recognition, a contract renewal or a probation.');
  });

  it('a row already there is served to no reader, anywhere', async () => {
    const { svc, as, suggestions } = setup();
    suggestions.push(aRowAlreadyThere({ groundId: 'g-sales', aboutParticipantId: 'p-d2', appeal: 'I disagree.', appealedAt: new Date(2026, 8, 3), decision: 'A plan', decisionReason: 'Slipping.', decidedById: 'u-wairimu' }));
    for (const who of ['wairimu', 'daniel', 'miriam', 'grace', 'omar'] as const) {
      expect((await svc.forGround('g-sales', as(who))).suggestions).toEqual([]);
    }
    expect(await svc.aboutYou(as('daniel'))).toEqual([]);
    expect((await svc.appealsToDecide(as('grace'))).appeals).toEqual([]);
    expect(await svc.latestForTheLeadAbout('u-daniel', as('wairimu'))).toBeNull();
  });

  it('a row already there cannot be decided, answered or appealed', async () => {
    const { svc, as, suggestions } = setup();
    suggestions.push(aRowAlreadyThere({ id: 's-old', groundId: 'g-sales', aboutParticipantId: 'p-d2', decision: 'A plan', decisionReason: 'Slipping.', decidedById: 'u-wairimu' }));
    await expect(svc.decide('s-old', as('wairimu'), { decision: 'x', reasons: 'y' })).rejects.toThrow(REFUSED.notFound);
    await expect(svc.addSide('s-old', as('daniel'), { side: 'x' })).rejects.toThrow(REFUSED.notFound);
    await expect(svc.appeal('s-old', as('daniel'), { why: 'x' })).rejects.toThrow(REFUSED.notFound);
  });
});

describe('decision 56, item 3: an untold goal counts against Daniel, so Wairimu reads it as a conversation point here too', () => {
  it('Wairimu, the lead, reads it - Daniel does not, and it is absent when there is no untold goal', async () => {
    const { svc, as, prisma } = setup();
    prisma.personObjective = {
      findMany: jest.fn(async ({ where }: any) => (where?.awareness === 'NOT_TOLD'
        ? [{ participantId: 'p-d1', text: 'Take over the scheduling', awareness: 'NOT_TOLD', authoredBy: 'lead' }]
        : [])),
    };
    const { id } = await svc.record(aSuggestion());
    /* Decision 53: Wairimu reads it only once Daniel has had his turn. */
    await svc.addSide(id, as('daniel'), { side: 'Most of my time goes on cleaning the customer records.' });
    const wairimuSees: any = (await svc.forGround('g-daniel', as('wairimu'))).suggestions[0];
    expect(wairimuSees.conversationPoints).toEqual([
      'Daniel has not been told about this goal yet. Talk it through together before reading anything into it.',
    ]);

    const danielSees: any = (await svc.forGround('g-daniel', as('daniel'))).suggestions[0];
    expect(danielSees).not.toHaveProperty('conversationPoints');
  });

  it('is absent for the lead when nothing is untold', async () => {
    const { svc, as, prisma } = setup();
    prisma.personObjective = { findMany: jest.fn(async () => []) };
    const { id } = await svc.record(aSuggestion());
    await svc.addSide(id, as('daniel'), { side: 'Most of my time goes on cleaning the customer records.' });
    const wairimuSees: any = (await svc.forGround('g-daniel', as('wairimu'))).suggestions[0];
    expect(wairimuSees).not.toHaveProperty('conversationPoints');
  });
});

describe('no reader is served a label on a person, the verdict, or a rating', () => {
  it('scans everything each reader is handed, at every step', async () => {
    const { svc, as } = setup();
    const { id } = await svc.record(aSuggestion());
    const everything: unknown[] = [];
    const readAll = async () => {
      everything.push(await svc.forGround('g-daniel', as('wairimu')));
      everything.push(await svc.forGround('g-daniel', as('daniel')));
      everything.push(await svc.forGround('g-daniel', as('grace')));
      everything.push(await svc.aboutYou(as('daniel')));
      everything.push(await svc.appealsToDecide(as('grace')));
    };
    await readAll();
    await svc.decide(id, as('wairimu'), { decision: 'A 6-week plan.', reasons: 'The numbers.' });
    await svc.addSide(id, as('daniel'), { side: 'My side.' });
    await svc.appeal(id, as('daniel'), { why: 'My appeal.' });
    await readAll();
    await svc.decideAppeal(id, as('grace'), { outcome: 'stands', reasons: 'Her reasons.' });
    await readAll();
    for (const x of everything) {
      expect(served(x)).not.toMatch(LABELS);
      expect(served(x)).not.toMatch(RATINGS);
    }
  });

  it('the engine may not store a label on a person, or a verdict that is not one of the five', async () => {
    const { svc } = setup();
    await expect(svc.record(aSuggestion({ headline: 'Groundwork suggests a PIP for Daniel' }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.record(aSuggestion({ factsForThem: 'You are at risk.' }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.record(aSuggestion({ otherChoices: ['Exit'] }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.record(aSuggestion({ verdict: 'fire' }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.record(aSuggestion({ aboutParticipantId: 'p-m2' }))).rejects.toBeInstanceOf(BadRequestException);
  });
});
