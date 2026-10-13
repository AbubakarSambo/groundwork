import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecommendedCheckInsService } from './recommended-check-ins.service';
import { theOffers } from '../detectors/the-anchor-recommendations';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * RECOMMENDED CHECK-INS (anchor piece 24), read as the lead reads them, and as nobody else does.
 *
 * Wairimu leads "Help the team understand". Kennedy and she keep waiting on each other; Femi, Bisi and
 * Omar are tangled in the same handoffs; "Win the Nairobi tender" has no owner while Kennedy, Femi and
 * Bisi each carry something open.
 */
const GROUND = 'g-anchor';
const LEAD = 'u-wairimu';

function aWorld(opts: { switchOn?: boolean; startedFrom?: string | null; scenario?: string } = {}) {
  const switchOn = opts.switchOn ?? true;
  const person = (id: string, userId: string | null, first: string | null, email: string) => ({ id, userId, nameGiven: null, managingOnly: false, email, user: first ? { firstName: first, lastName: null } : null });
  const participants = [
    person('p-wairimu', LEAD, 'Wairimu', 'wairimu@baridi.test'), person('p-kennedy', 'u-k', 'Kennedy', 'kennedy@baridi.test'),
    person('p-femi', 'u-f', 'Femi', 'femi@baridi.test'), person('p-bisi', 'u-b', 'Bisi', 'bisi@baridi.test'), person('p-omar', 'u-o', 'Omar', 'omar@baridi.test'),
  ];
  const rows: any[] = [];
  const created: string[] = [];
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => (switchOn ? { value: { on: true } } : { value: { on: false } })) },
    ground: {
      findUnique: jest.fn(async () => ({ id: GROUND, organizationId: 'org-1', initiatorId: LEAD, startedFrom: opts.startedFrom === undefined ? 'anchor' : opts.startedFrom, scenario: opts.scenario ?? 'NEW_PROJECT' })),
      create: jest.fn(async () => { created.push('ground'); }),
    },
    groundParticipant: {
      findMany: jest.fn(async ({ where }: any) => (where?.id?.in ? participants.filter((p) => where.id.in.includes(p.id)) : participants)),
      create: jest.fn(async () => { created.push('participant'); }),
    },
    groundDependency: {
      findMany: jest.fn(async () => [
        { fromParticipantId: 'p-wairimu', onParticipantId: 'p-kennedy' }, { fromParticipantId: 'p-kennedy', onParticipantId: 'p-wairimu' },
        { fromParticipantId: 'p-femi', onParticipantId: 'p-bisi' }, { fromParticipantId: 'p-omar', onParticipantId: null },
      ]),
    },
    groundObjective: { findMany: jest.fn(async () => [{ id: 'o1', name: 'Win the Nairobi tender', ownerParticipantId: null }]) },
    groundCommitment: { findMany: jest.fn(async () => [{ participantId: 'p-kennedy' }, { participantId: 'p-femi' }, { participantId: 'p-bisi' }, { participantId: 'p-bisi' }]) },
    recommendation: {
      findFirst: jest.fn(async ({ where }: any) => rows.find((r) => r.kind === where.kind && r.subjectExternalId === where.subjectExternalId && r.rationale.key === where.rationale.equals && where.state.in.includes(r.state)) ?? null),
      create: jest.fn(async ({ data }: any) => { rows.push({ id: `r${rows.length + 1}`, state: 'PROPOSED', proposedAt: new Date(rows.length), ...data }); }),
      findMany: jest.fn(async ({ where }: any) => rows.filter((r) => r.subjectExternalId === where.subjectExternalId && r.state === where.state && where.kind.in.includes(r.kind))),
      findFirstOrThrow: jest.fn(),
      updateMany: jest.fn(async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id && x.state === where.state); if (!r) return { count: 0 }; Object.assign(r, data); return { count: 1 }; }),
    },
  };
  // findFirst for the answer path matches on id; the same fake serves both uses.
  const looked = prisma.recommendation.findFirst;
  prisma.recommendation.findFirst = jest.fn(async (args: any) => (args.where.id ? rows.find((r) => r.id === args.where.id && r.state === args.where.state && r.subjectExternalId === args.where.subjectExternalId) ?? null : looked(args)));
  return { prisma, rows, created, service: new RecommendedCheckInsService(prisma) };
}

describe('recommended check-ins, for a check-in with the anchor\'s scenario (decision 114)', () => {
  it('are found and offered when startedFrom is empty but the scenario is the anchor\'s, and not for another scenario', async () => {
    const byScenario = aWorld({ startedFrom: null, scenario: 'HELP_TEAM_UNDERSTAND' });
    await byScenario.service.onCheckInCompleted({ groundId: GROUND });
    expect((await byScenario.service.forTheLead(GROUND, LEAD)).offers).toHaveLength(3);
    const plain = aWorld({ startedFrom: null, scenario: 'OKR_ALIGNMENT' });
    await plain.service.onCheckInCompleted({ groundId: GROUND });
    expect((await plain.service.forTheLead(GROUND, LEAD)).offers).toEqual([]);
    expect(plain.rows).toEqual([]);
  });
});

describe('recommended check-ins, as the lead reads them', () => {
  it('offers the three kinds, in the scenario\'s words, from this check-in\'s own record', async () => {
    const w = aWorld();
    await w.service.onCheckInCompleted({ groundId: GROUND });
    const { offers } = await w.service.forTheLead(GROUND, LEAD);
    expect(offers.map((o) => o.says)).toEqual([
      'You and Kennedy seem to have different expectations about how work is handed over between you. Two handoffs between you are still waiting.',
      'Five people are waiting on each other, and several handoffs keep appearing.',
      'Nobody has been named as the owner of "Win the Nairobi tender", and three people are each carrying something open. Their responsibilities may not be completely clear.',
    ]);
    expect(offers.map((o) => o.question)).toEqual(['Would a separate check-in help you align on this?', 'Set up a project check-in?', 'Set up a check-in for this aim?']);
    expect(offers.every((o) => o.yes === 'Yes, set it up' && o.no === 'Not now')).toBe(true);
    /* Never a label or a score on anybody, and no address or id of a person is served. */
    expect(JSON.stringify(offers)).not.toMatch(/score|at risk|baridi\.test|p-kennedy|u-k/i);
  });

  it('writes nothing twice, however often something new comes in', async () => {
    const w = aWorld();
    await w.service.onCheckInCompleted({ groundId: GROUND });
    await w.service.onCheckInCompleted({ groundId: GROUND });
    expect(w.rows).toHaveLength(3);
  });

  it('a yes creates nothing and invites nobody; it hands back what a new check-in would start from', async () => {
    const w = aWorld();
    await w.service.onCheckInCompleted({ groundId: GROUND });
    const [pair] = (await w.service.forTheLead(GROUND, LEAD)).offers;
    expect(w.created).toEqual([]);
    const out = await w.service.answer(GROUND, pair.id, LEAD, true);
    expect(out).toEqual({
      state: 'ACCEPTED',
      setUp: {
        kind: 'anchor_pair_check_in',
        about: 'You and Kennedy seem to have different expectations about how work is handed over between you. Two handoffs between you are still waiting.',
        aim: null,
        people: [{ name: 'Kennedy', email: 'kennedy@baridi.test' }],
      },
    });
    expect(w.created).toEqual([]);
    expect(w.rows.find((r) => r.id === pair.id)).toMatchObject({ state: 'ACCEPTED', resolvedByExternalId: LEAD });
  });

  it('a "not now" is never asked again', async () => {
    const w = aWorld();
    await w.service.onCheckInCompleted({ groundId: GROUND });
    const [pair] = (await w.service.forTheLead(GROUND, LEAD)).offers;
    expect(await w.service.answer(GROUND, pair.id, LEAD, false)).toEqual({ state: 'DECLINED' });
    await w.service.onCheckInCompleted({ groundId: GROUND });
    const after = (await w.service.forTheLead(GROUND, LEAD)).offers;
    expect(after.map((o) => o.id)).not.toContain(pair.id);
    expect(after).toHaveLength(2);
    expect(w.rows).toHaveLength(3);
  });

  it('nobody but the lead reads or answers them', async () => {
    const w = aWorld();
    await w.service.onCheckInCompleted({ groundId: GROUND });
    await expect(w.service.forTheLead(GROUND, 'u-k')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(w.service.answer(GROUND, 'r1', 'u-k', true)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(w.service.answer(GROUND, 'nope', LEAD, true)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('with the switch off, nothing is looked for and nothing is served', async () => {
    const w = aWorld({ switchOn: false });
    await w.service.onCheckInCompleted({ groundId: GROUND });
    expect(w.rows).toEqual([]);
    expect((await w.service.forTheLead(GROUND, LEAD)).offers).toEqual([]);
  });

  it('a check-in not started from the anchor gets nothing', async () => {
    const w = aWorld({ startedFrom: null });
    await w.service.onCheckInCompleted({ groundId: GROUND });
    expect(w.rows).toEqual([]);
    expect((await w.service.forTheLead(GROUND, LEAD)).offers).toEqual([]);
  });
});

describe('what is offered, in other shapes of the same record', () => {
  const p = (id: string, name: string | null, isTheLead = false) => ({ id, name, isTheLead });
  it('between two colleagues the lead is not one of, they are named and "them" is used', () => {
    const [o] = theOffers({
      people: [p('l', null, true), p('a', 'Kennedy'), p('b', 'Femi')],
      handoffs: [{ fromId: 'a', onId: 'b' }, { fromId: 'b', onId: 'a' }, { fromId: 'a', onId: 'b' }], aims: [], openCommitmentsBy: [],
    });
    expect(o.says).toBe('Kennedy and Femi seem to have different expectations about how work is handed over between them. Three handoffs between them are still waiting.');
  });
  it('one handoff is not a pattern, and a pair nobody can name is not offered', () => {
    expect(theOffers({ people: [p('l', null, true), p('a', 'Kennedy')], handoffs: [{ fromId: 'l', onId: 'a' }], aims: [], openCommitmentsBy: [] })).toEqual([]);
    expect(theOffers({ people: [p('l', null, true), p('a', null)], handoffs: [{ fromId: 'l', onId: 'a' }, { fromId: 'a', onId: 'l' }], aims: [], openCommitmentsBy: [] })).toEqual([]);
  });
  it('an aim the lead set is said to her as her aim, not as a sentence about her by name (anchor walk, 8 October)', () => {
    const people = [p('l', 'Wairimu', true), p('a', 'Amani'), p('b', 'Chidi'), p('c', 'Zawadi')];
    const say = (aim: string) => theOffers({ people, handoffs: [], aims: [{ id: 'o', name: aim, ownerId: null }], openCommitmentsBy: ['a', 'b', 'c'] })[0].says;
    expect(say('Wairimu is aiming for the team to understand that one late truck at 5am becomes a hotel breakfast with no tomatoes.'))
      .toBe('Nobody has been named as the owner of your aim for the team to understand that one late truck at 5am becomes a hotel breakfast with no tomatoes, and three people are each carrying something open. Their responsibilities may not be completely clear.');
    expect(say('Wairimu is trying to stop Msingi losing a third of its income.')).toContain('owner of your aim to stop Msingi losing a third of its income, and');
    /* Any other sentence is quoted as it stands. */
    expect(say('Win the Nairobi tender')).toContain('owner of "Win the Nairobi tender", and');
  });
  it('an aim somebody owns is not offered', () => {
    expect(theOffers({ people: [p('a', 'A'), p('b', 'B'), p('c', 'C')], handoffs: [], aims: [{ id: 'o', name: 'X', ownerId: 'a' }], openCommitmentsBy: ['a', 'b', 'c'] })).toEqual([]);
  });
});

describe('the public API does not list them', () => {
  it('leaves the anchor kinds out of the list and out of accept and decline', () => {
    const src = readFileSync(join(__dirname, '../detectors/detectors.controller.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src.match(/kind: \{ notIn: \[\.\.\.ANCHOR_KINDS\] \}/g)).toHaveLength(2);
  });
});
