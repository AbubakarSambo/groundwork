import { AssistantService } from './assistant.service';
import { WhatIsTrueService } from './what-is-true.service';
import { BoardService } from '../board/board.service';
import { route } from './the-router-is-deterministic';

/**
 * DECISION 82, ITEM 7: A WAIT FROM A CHECK-IN KEPT IN THE APP IS NEVER MERGED INTO ONE SAID ON WHATSAPP.
 *
 * Baridi, as in a-check-in-kept-in-the-app-never-reaches-ask-groundwork-on-whatsapp.spec.ts. Femi waits
 * on Wairimu for the same thing in two check-ins. In "Sales team, Q3" he said he is waiting on "the new
 * price list for Kilimani". In "Performance plan, Femi", kept in the app, he said it again with more:
 * "the new price list for Kilimani before my Westgate review in the plan".
 *
 * The board merges alike waits across check-ins and keeps the fullest words. Ask Groundwork on WhatsApp
 * used to leave out the kept check-in only AFTER that merge, so the plan's words rode on the sales
 * team's wait and were said on the phone (or, the other way round, the sales team's wait vanished with
 * the kept one). Now the board leaves the kept check-in out of its own query, before merging.
 *
 * The board and the assistant are the real ones; the database is pretend but honours the where clause.
 */

const ORG = 'org-baridi';
const TEAM_WORDS = 'the new price list for Kilimani';
const KEPT_WORDS = 'the new price list for Kilimani before my Westgate review in the plan';
const KEPT = ['Westgate', 'review in the plan', 'Performance plan, Femi'];

const PEOPLE: Record<string, any> = {
  'pe-wairimu': { id: 'pe-wairimu', externalId: 'x-wairimu', email: 'wairimu@baridi.test', linkedUserId: 'u-wairimu', displayName: 'Wairimu Kamau', role: 'LEAD' },
  'pe-femi': { id: 'pe-femi', externalId: 'x-femi', email: 'femi@baridi.test', linkedUserId: 'u-femi', displayName: 'Femi Ade', role: 'MEMBER' },
};
const GROUNDS = [
  { id: 'g-sales', organizationId: ORG, label: 'Sales team, Q3', overWhatsApp: null },
  { id: 'g-pip', organizationId: ORG, label: 'Performance plan, Femi', overWhatsApp: false },
];

function aWait(groundId: string, what: string, createdAt: Date) {
  const label = GROUNDS.find((g) => g.id === groundId)!.label;
  return {
    fromParticipantId: `gp-femi-${groundId}`, onParticipantId: `gp-wairimu-${groundId}`, onLabel: 'Wairimu Kamau', what,
    status: 'WAITING', createdAt, groundId, ground: { label },
    fromParticipant: { email: 'femi@baridi.test' }, onParticipant: { email: 'wairimu@baridi.test' },
  };
}

/** Whether a where clause on a row's `groundId` lets this check-in through. */
function allowed(groundId: string, w: any): boolean {
  const g = w?.groundId;
  if (!g) return true;
  if (g.notIn && g.notIn.includes(groundId)) return false;
  if (g.in && !g.in.includes(groundId)) return false;
  return true;
}

/** `keptFirst`: the plan's wait was said before the sales team's, instead of after. */
function aBaridi(keptFirst = false) {
  const prompts: string[] = [];
  const waits = keptFirst
    ? [aWait('g-pip', KEPT_WORDS, new Date('2026-09-10')), aWait('g-sales', TEAM_WORDS, new Date('2026-09-20'))]
    : [aWait('g-sales', TEAM_WORDS, new Date('2026-09-10')), aWait('g-pip', KEPT_WORDS, new Date('2026-09-20'))];
  const prisma: any = {
    person: {
      findFirst: jest.fn(async ({ where }: any) => (where.id ? PEOPLE[where.id] : Object.values(PEOPLE).find((p) => p.externalId === where.externalId)) ?? null),
      findMany: jest.fn(async () => []),
    },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: Object.values(PEOPLE).find((p) => p.linkedUserId === where.userId_organizationId.userId)?.role ?? null })) },
    ground: {
      findMany: jest.fn(async ({ where }: any) => GROUNDS.filter((g) => g.organizationId === where.organizationId
        && (where.overWhatsApp === undefined || g.overWhatsApp === where.overWhatsApp))),
    },
    groundDependency: { findMany: jest.fn(async ({ where }: any) => waits.filter((w) => allowed(w.groundId, where))) },
    /* Nobody asked to be shown how; the read is still made, and must still leave out the kept check-in. */
    checkIn: { findMany: jest.fn(async () => []) },
    commitment: { findMany: jest.fn(async () => []) },
    todo: { findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []) },
    knowledgeCard: { findMany: jest.fn(async () => []) },
    assistantProposal: { findFirst: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => ({ id: 'pr', ...data })) },
    assistantTurn: { count: jest.fn(async () => 3), createMany: jest.fn(async () => ({ count: 2 })) },
  };
  const engine: any = {
    extract: jest.fn(async (system: string, messages: any[]) => { prompts.push(`${system}\n${messages.map((m) => m.content).join('\n')}`); return null; }),
    respond: jest.fn(async (system: string, messages: any[]) => { prompts.push(`${system}\n${messages.map((m) => m.content).join('\n')}`); throw new Error('model off'); }),
  };
  const board = new BoardService(prisma, {} as any, {} as any, {} as any);
  const service = new AssistantService(
    prisma, engine, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    board,
    {} as any, { pendingFor: async () => [] } as any, {} as any,
    new WhatIsTrueService(prisma), {} as any, {} as any, {} as any,
    { sessionReport: jest.fn(async () => { throw new Error('no reports here'); }) } as any,
  );
  const ask = async (door: 'whatsapp' | 'app', personId: string, q: string) => {
    const r: any = door === 'whatsapp' ? await service.respondOnWhatsApp(ORG, personId, q) : await service.respond(ORG, personId, q);
    return r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
  };
  return { ask, prompts, prisma };
}

const keptIn = (text: string) => KEPT.filter((k) => text.includes(k));

describe('a wait kept in the app, alike a team wait, asked about on WhatsApp', () => {
  it('the questions go to the lanes that read the board', () => {
    expect(route('who is waiting on me').lane).toBe('what_is_stuck');
    expect(route('where am I needed').lane).toBe('where_am_i_needed');
  });

  it.each([
    ['the plan\'s wait said after the team\'s', false],
    ['the plan\'s wait said before the team\'s', true],
  ])('"who is waiting on me" (%s): Wairimu hears the sales team\'s wait in its own words on WhatsApp', async (_label, keptFirst) => {
    const wa = aBaridi(keptFirst);
    const onThePhone = await wa.ask('whatsapp', 'pe-wairimu', 'who is waiting on me');
    expect(keptIn(onThePhone)).toEqual([]);
    /* Said as a full sentence since 3 October; this fixture has no names or rows, so Femi is "somebody in" the check-in. */
    expect(onThePhone).toMatch(new RegExp(`^Somebody in Sales team, Q3 has been waiting on you for ${TEAM_WORDS} since \\d+ September\\.$`, 'm'));
    expect(wa.prompts.filter((p) => keptIn(p).length)).toEqual([]);
    /* The kept check-in was never selected, not read and then hidden. */
    for (const [args] of wa.prisma.groundDependency.findMany.mock.calls) expect(args.where.groundId).toEqual({ notIn: ['g-pip'] });
  });

  it.each([false, true])('"where am I needed" on WhatsApp never says the plan\'s words (kept first: %s)', async (keptFirst) => {
    const wa = aBaridi(keptFirst);
    const onThePhone = await wa.ask('whatsapp', 'pe-wairimu', 'where am I needed');
    expect(keptIn(onThePhone)).toEqual([]);
    expect(onThePhone).toContain(TEAM_WORDS);
    expect(wa.prompts.filter((p) => keptIn(p).length)).toEqual([]);
    for (const [args] of wa.prisma.checkIn.findMany.mock.calls) expect(args.where.groundId).toEqual({ notIn: ['g-pip'] });
  });

  it('in the app nothing changes: the board merges the two and keeps the fuller words, as before', async () => {
    const app = aBaridi();
    const inTheApp = await app.ask('app', 'pe-wairimu', 'who is waiting on me');
    expect(inTheApp).toContain(KEPT_WORDS);
    for (const [args] of app.prisma.groundDependency.findMany.mock.calls) expect(args.where.groundId).toBeUndefined();
    expect(await aBaridi().ask('app', 'pe-wairimu', 'where am I needed')).toContain(KEPT_WORDS);
  });
});
