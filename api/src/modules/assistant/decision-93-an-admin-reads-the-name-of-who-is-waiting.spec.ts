import { AssistantService } from './assistant.service';
import { WhatIsTrueService } from './what-is-true.service';
import { BoardService } from '../board/board.service';
import { Logger } from '@nestjs/common';

/* The model is off on purpose; its warning is not what is being read. */
beforeAll(() => { jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined); });

/**
 * DECISION 93, ROW 1: AN ADMIN READS THE NAME OF THE PERSON WAITING (5 October 2026).
 *
 * "Where am I needed" said "somebody in <the check-in>" to anybody who was not allowed to read the name
 * of a colleague, an admin included. Hafsah removed that for admins only: an admin reads the name. A
 * participant keeps "somebody" where the lead set people not to be named to each other.
 *
 * Baridi Appliances. "Stock review" is run by Wairimu and its people are NOT named to each other. Femi waits
 * on Miriam and on Grace there. Grace is an admin and also a participant. Hannah is an admin in none of the
 * check-ins and Femi waits on her in "Stock review" too, as a person on the roster. Tom is a member and a
 * participant, and is waited on by Femi. Zed is a member in no check-in.
 */

const ORG = 'org-baridi';
const STOCK = 'Stock review';

const PEOPLE: Record<string, any> = {
  wairimu: { id: 'pe-wairimu', externalId: 'x-wairimu', email: 'wairimu@baridi.test', linkedUserId: 'u-wairimu', role: 'LEAD' },
  femi: { id: 'pe-femi', externalId: 'x-femi', email: 'femi@baridi.test', linkedUserId: 'u-femi', role: 'MEMBER' },
  miriam: { id: 'pe-miriam', externalId: 'x-miriam', email: 'miriam@baridi.test', linkedUserId: 'u-miriam', role: 'MEMBER' },
  grace: { id: 'pe-grace', externalId: 'x-grace', email: 'grace@baridi.test', linkedUserId: 'u-grace', role: 'ADMIN' },
  hannah: { id: 'pe-hannah', externalId: 'x-hannah', email: 'hannah@baridi.test', linkedUserId: 'u-hannah', role: 'ADMIN' },
};

const at = (day: string) => new Date(`2026-09-${day}T09:00:00.000Z`);
const row = (id: string, email: string, partyType: string, created: string, extra: any = {}) => ({
  id, userId: extra.userId ?? null, email, partyType, managingOnly: false, createdAt: at(created), ...extra,
});
const GROUNDS: Record<string, any> = {
  'g-stock': {
    id: 'g-stock', organizationId: ORG, label: STOCK, overWhatsApp: null, scenario: null, initiatorId: 'u-wairimu', peersVisibleToEachOther: false,
    participants: [
      row('gs-wairimu', 'wairimu@baridi.test', 'INITIATOR', '01', { userId: 'u-wairimu' }),
      row('gs-femi', 'femi@baridi.test', 'PARTICIPANT', '02', { userId: 'u-femi' }),
      row('gs-miriam', 'miriam@baridi.test', 'PARTICIPANT', '02', { userId: 'u-miriam' }),
      row('gs-grace', 'grace@baridi.test', 'PARTICIPANT', '02', { userId: 'u-grace' }),
    ],
  },
};

const SIGNED_IN: Record<string, any> = {
  'femi@baridi.test': { firstName: 'Femi', lastName: 'Ade' },
};

function aWait(groundId: string, from: string, on: string, what: string, day: string, extra: { escalated?: string } = {}) {
  const g = GROUNDS[groundId];
  const fromRow = g.participants.find((p: any) => p.email === from);
  const onRow = g.participants.find((p: any) => p.email === on);
  return {
    fromParticipantId: fromRow.id, onParticipantId: onRow.id, onLabel: null, what, status: 'WAITING', createdAt: at(day), groundId,
    escalatedAt: extra.escalated ? at(extra.escalated) : null,
    ground: g,
    fromParticipant: { email: from, userId: fromRow.userId, partyType: fromRow.partyType, nameGiven: null, organisationGiven: null, user: SIGNED_IN[from] ?? null },
    onParticipant: { email: on },
  };
}

const WAITS = [
  aWait('g-stock', 'femi@baridi.test', 'grace@baridi.test', 'the signed budget for the Karen shop', '10'),
  aWait('g-stock', 'femi@baridi.test', 'miriam@baridi.test', 'the van keys for the Ngong Road route', '12'),
];

function allowed(groundId: string, w: any): boolean {
  const g = w?.groundId;
  if (!g) return true;
  if (g.notIn && g.notIn.includes(groundId)) return false;
  if (g.in && !g.in.includes(groundId)) return false;
  return true;
}

function aBaridi() {
  const prompts: string[] = [];
  const prisma: any = {
    person: {
      findFirst: jest.fn(async ({ where }: any) => Object.values(PEOPLE).find((p) => (where.id ? p.id === where.id : p.externalId === where.externalId)) ?? null),
      findMany: jest.fn(async ({ where }: any) => (where?.email?.in
        ? Object.values(PEOPLE).filter((p) => where.email.in.includes(p.email))
        : [])),
    },
    organizationMembership: { findUnique: jest.fn(async ({ where }: any) => ({ role: Object.values(PEOPLE).find((p) => p.linkedUserId === where.userId_organizationId.userId)?.role ?? null })) },
    ground: {
      findMany: jest.fn(async ({ where }: any) => Object.values(GROUNDS).filter((g) => g.organizationId === where.organizationId
        && (where.overWhatsApp === undefined || g.overWhatsApp === where.overWhatsApp))),
    },
    groundDependency: { findMany: jest.fn(async ({ where }: any) => WAITS.filter((w) => allowed(w.groundId, where))) },
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
  const ask = async (door: 'whatsapp' | 'app', who: string, q: string) => {
    const personId = PEOPLE[who].id;
    const r: any = door === 'whatsapp' ? await service.respondOnWhatsApp(ORG, personId, q) : await service.respond(ORG, personId, q);
    return r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
  };
  return { ask, prompts };
}


const DOORS = ['app', 'whatsapp'] as const;

describe('decision 93, row 1: the name of the person waiting', () => {
  it('Grace, an admin, reads Femi by name, though the lead set people not to be named to each other', async () => {
    for (const door of DOORS) {
      const needed = await aBaridi().ask(door, 'grace', 'where am I needed');
      expect(needed).toContain('Femi Ade has been waiting on you for the signed budget for the Karen shop since 10 September.');
      expect(needed).not.toContain('Somebody in');
      const stuck = await aBaridi().ask(door, 'grace', 'who is waiting on me');
      expect(stuck).toContain('Femi Ade has been waiting on you for the signed budget for the Karen shop since 10 September, in the check-in Stock review.');
    }
  });

  it('Miriam, a participant, still reads "somebody in Stock review", because the lead set people not to be named', async () => {
    for (const door of DOORS) {
      const needed = await aBaridi().ask(door, 'miriam', 'where am I needed');
      expect(needed).toContain(`Somebody in ${STOCK} has been waiting on you for the van keys for the Ngong Road route since 12 September.`);
      expect(needed).not.toContain('Femi');
      const stuck = await aBaridi().ask(door, 'miriam', 'who is waiting on me');
      expect(stuck).toContain(`Somebody in ${STOCK} has been waiting on you for the van keys for the Ngong Road route since 12 September.`);
      expect(stuck).not.toContain('Femi');
    }
  });
});
