import { AssistantService } from './assistant.service';
import { WhatIsTrueService } from './what-is-true.service';
import { BoardService } from '../board/board.service';
import { NOT_A_RANKING, WHAT_IT_ASKS } from '../detectors/who-needs-you-this-week';
import { whatIsNotPlainIn } from '../reports/a-product-sentence-is-plain';
import { WHAT_NEEDS_YOU_SOURCE } from './a-source-says-where-it-came-from';
import { Logger } from '@nestjs/common';

/* The model is off on purpose; its warning is not what is being read. */
beforeAll(() => { jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined); });

/**
 * WHO IS WAITING IS SAID BY NAME, IN FULL SENTENCES, WITH THE DAY IT BEGAN (3 October 2026).
 *
 * Asked "where am I needed", Wairimu read "femi@baridi.test: waiting on you for the new price list for
 * Kilimani, 22 days." An address where a name belongs, pieces joined with a colon, and a count of days
 * that changed every time she asked. "Who is waiting on me" opened "Waiting on you:" and each line was
 * "- the new price list for Kilimani (Sales team, Q3) - waiting, 22 days", with nobody in it.
 *
 * Baridi Appliances. "Sales team, Q3" is run by Wairimu, and its people are named to each other. Femi
 * (signed in), Juma (on the roster only) and Kofi (no name anywhere) wait on her. Femi also waits on
 * Miriam, and says he cannot go on without it. "Performance plan, Tom" is about Tom: Miriam gives a view
 * there and waits on Tom, and decision 17 says Tom is never told who. "Westgate review" is kept in the
 * app, so its wait is never said on WhatsApp (decision 82, item 7). Grace is an admin in no check-in.
 *
 * The board and the assistant are the real ones; the database is pretend but honours the where clause.
 * The model is off, so what is read is exactly what the product wrote.
 */

const ORG = 'org-baridi';
const SALES = 'Sales team, Q3';
const PIP = 'Performance plan, Tom';
const KEPT = 'Westgate review';

const PEOPLE: Record<string, any> = {
  wairimu: { id: 'pe-wairimu', externalId: 'x-wairimu', email: 'wairimu@baridi.test', linkedUserId: 'u-wairimu', role: 'LEAD' },
  femi: { id: 'pe-femi', externalId: 'x-femi', email: 'femi@baridi.test', linkedUserId: 'u-femi', role: 'MEMBER' },
  miriam: { id: 'pe-miriam', externalId: 'x-miriam', email: 'miriam@baridi.test', linkedUserId: 'u-miriam', role: 'MEMBER' },
  tom: { id: 'pe-tom', externalId: 'x-tom', email: 'tom@baridi.test', linkedUserId: 'u-tom', role: 'MEMBER' },
  grace: { id: 'pe-grace', externalId: 'x-grace', email: 'grace@baridi.test', linkedUserId: 'u-grace', role: 'ADMIN' },
  /* On the roster only: no sign-in, and no name given at the end of a link. */
  juma: { id: 'pe-juma', externalId: 'x-juma', email: 'juma@baridi.test', displayName: 'Juma Otieno', linkedUserId: null, role: null },
};

const at = (day: string) => new Date(`2026-09-${day}T09:00:00.000Z`);
const row = (id: string, email: string, partyType: string, created: string, extra: any = {}) => ({
  id, userId: extra.userId ?? null, email, partyType, managingOnly: false, createdAt: at(created), ...extra,
});
const GROUNDS: Record<string, any> = {
  'g-sales': {
    id: 'g-sales', organizationId: ORG, label: SALES, overWhatsApp: null, scenario: null, initiatorId: 'u-wairimu', peersVisibleToEachOther: true,
    participants: [
      row('gs-wairimu', 'wairimu@baridi.test', 'INITIATOR', '01', { userId: 'u-wairimu' }),
      row('gs-femi', 'femi@baridi.test', 'PARTICIPANT', '02', { userId: 'u-femi' }),
      row('gs-miriam', 'miriam@baridi.test', 'PARTICIPANT', '02', { userId: 'u-miriam' }),
      row('gs-juma', 'juma@baridi.test', 'PARTICIPANT', '03'),
      row('gs-kofi', 'kofi@baridi.test', 'PARTICIPANT', '03'),
    ],
  },
  'g-pip': {
    id: 'g-pip', organizationId: ORG, label: PIP, overWhatsApp: null, scenario: 'PIP', initiatorId: 'u-wairimu', peersVisibleToEachOther: true,
    participants: [
      row('gp-wairimu', 'wairimu@baridi.test', 'INITIATOR', '01', { userId: 'u-wairimu' }),
      row('gp-tom', 'tom@baridi.test', 'PARTICIPANT', '02', { userId: 'u-tom' }),
      row('gp-miriam', 'miriam@baridi.test', 'PARTICIPANT', '04', { userId: 'u-miriam' }),
    ],
  },
  'g-kept': {
    id: 'g-kept', organizationId: ORG, label: KEPT, overWhatsApp: false, scenario: null, initiatorId: 'u-wairimu', peersVisibleToEachOther: true,
    participants: [
      row('gk-wairimu', 'wairimu@baridi.test', 'INITIATOR', '01', { userId: 'u-wairimu' }),
      row('gk-femi', 'femi@baridi.test', 'PARTICIPANT', '02', { userId: 'u-femi' }),
    ],
  },
};

const SIGNED_IN: Record<string, any> = {
  'femi@baridi.test': { firstName: 'Femi', lastName: 'Ade' },
  'miriam@baridi.test': { firstName: 'Miriam', lastName: 'Njeri' },
  'tom@baridi.test': { firstName: 'Tom', lastName: 'Mwangi' },
  'wairimu@baridi.test': { firstName: 'Wairimu', lastName: 'Kamau' },
};

function aWait(groundId: string, from: string, on: string, what: string, day: string, status = 'WAITING') {
  const g = GROUNDS[groundId];
  const fromRow = g.participants.find((p: any) => p.email === from);
  const onRow = g.participants.find((p: any) => p.email === on);
  return {
    fromParticipantId: fromRow.id, onParticipantId: onRow.id, onLabel: null, what, status, createdAt: at(day), groundId,
    ground: g,
    fromParticipant: { email: from, userId: fromRow.userId, partyType: fromRow.partyType, nameGiven: null, organisationGiven: null, user: SIGNED_IN[from] ?? null },
    onParticipant: { email: on },
  };
}

const WAITS = [
  aWait('g-sales', 'femi@baridi.test', 'wairimu@baridi.test', 'the new price list for Kilimani', '10'),
  aWait('g-sales', 'juma@baridi.test', 'wairimu@baridi.test', 'the delivery van for the Karen route', '12'),
  aWait('g-sales', 'kofi@baridi.test', 'wairimu@baridi.test', 'the stock count for the Ngong Road shop', '18'),
  aWait('g-sales', 'femi@baridi.test', 'miriam@baridi.test', 'the signed delivery schedule for Westgate', '15', 'BLOCKING'),
  aWait('g-pip', 'miriam@baridi.test', 'tom@baridi.test', 'the handover notes for the Gigiri account', '16'),
  aWait('g-kept', 'femi@baridi.test', 'wairimu@baridi.test', 'the Westgate margin figures', '20'),
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

const FROM_OTHERS = 'That is from what other people said about their own work, not from anyone assigning it to you.';
const DOORS = ['app', 'whatsapp'] as const;

/** Every line a person reads, each list item on its own, checked by the product's own wording rules. */
function plainLines(text: string): string[] {
  return text.split('\n').map((l) => l.replace(/^- /, '').trim()).filter(Boolean)
    .flatMap((l) => whatIsNotPlainIn(l).map((f) => `${f.rule}: "${f.found}" in "${l}"`));
}

describe('Wairimu, who runs the check-in and is waited on', () => {
  it('"where am I needed" names each person waiting, in a full sentence with the day it began, in the app', async () => {
    expect(await aBaridi().ask('app', 'wairimu', 'where am I needed')).toBe([
      WHAT_IT_ASKS.WAITING_ON_YOU,
      '- Femi Ade has been waiting on you for the new price list for Kilimani since 10 September.',
      '- Juma Otieno has been waiting on you for the delivery van for the Karen route since 12 September.',
      `- Somebody in ${SALES} has been waiting on you for the stock count for the Ngong Road shop since 18 September.`,
      `- Femi Ade has been waiting on you for the Westgate margin figures since 20 September.`,
      '',
      NOT_A_RANKING.join(' '),
      '',
      WHAT_NEEDS_YOU_SOURCE.says,
    ].join('\n'));
  });

  it('and on WhatsApp the same, without the check-in kept in the app', async () => {
    const wa = aBaridi();
    expect(await wa.ask('whatsapp', 'wairimu', 'where am I needed')).toBe([
      WHAT_IT_ASKS.WAITING_ON_YOU,
      '- Femi Ade has been waiting on you for the new price list for Kilimani since 10 September.',
      '- Juma Otieno has been waiting on you for the delivery van for the Karen route since 12 September.',
      `- Somebody in ${SALES} has been waiting on you for the stock count for the Ngong Road shop since 18 September.`,
      '',
      NOT_A_RANKING.join(' '),
      '',
      WHAT_NEEDS_YOU_SOURCE.says,
    ].join('\n'));
    expect(wa.prompts.filter((p) => p.includes('Westgate margin'))).toEqual([]);
  });

  it('"who is waiting on me" is full sentences, each saying where, and "somebody in" says it once', async () => {
    expect(await aBaridi().ask('app', 'wairimu', 'who is waiting on me')).toBe([
      'Other people have said they are waiting on you for these things.',
      `- Femi Ade has been waiting on you for the new price list for Kilimani since 10 September, in the check-in ${SALES}.`,
      `- Juma Otieno has been waiting on you for the delivery van for the Karen route since 12 September, in the check-in ${SALES}.`,
      `- Somebody in ${SALES} has been waiting on you for the stock count for the Ngong Road shop since 18 September.`,
      `- Femi Ade has been waiting on you for the Westgate margin figures since 20 September, in the check-in ${KEPT}.`,
      '',
      FROM_OTHERS,
    ].join('\n'));
    const onThePhone = await aBaridi().ask('whatsapp', 'wairimu', 'who is waiting on me');
    expect(onThePhone).not.toContain('Westgate margin');
    expect(onThePhone).not.toContain(KEPT);
    expect(onThePhone).toContain(`- Femi Ade has been waiting on you for the new price list for Kilimani since 10 September, in the check-in ${SALES}.`);
  });

  it('"what should I do next" starts with Femi by name, and the day his wait began', async () => {
    for (const door of DOORS) {
      const said = await aBaridi().ask(door, 'wairimu', 'what should I do next');
      expect(said).toContain('Start with Femi Ade. Femi Ade has been waiting on you for the new price list for Kilimani since 10 September. Nobody else can clear this one.');
    }
  });
});

describe('Miriam, a colleague in the check-in, who is waited on and waits herself', () => {
  it('reads Femi by name, says what he said it stops, and reads her own wait as "you"', async () => {
    for (const door of DOORS) {
      expect(await aBaridi().ask(door, 'miriam', 'who is waiting on me')).toBe([
        `Femi Ade says they cannot go on without the signed delivery schedule for Westgate, and has been waiting on you for it since 15 September, in the check-in ${SALES}.`,
        '',
        FROM_OTHERS,
        '',
        `You have been waiting for the handover notes for the Gigiri account since 16 September, in the check-in ${PIP}.`,
      ].join('\n'));
    }
  });
});

describe('Tom, the person a performance plan is about', () => {
  it('is never told who is waiting on him there (decision 17), only "somebody in" the check-in', async () => {
    for (const door of DOORS) {
      const stuck = await aBaridi().ask(door, 'tom', 'who is waiting on me');
      expect(stuck).toBe([`Somebody in ${PIP} has been waiting on you for the handover notes for the Gigiri account since 16 September.`, '', FROM_OTHERS].join('\n'));
      const needed = await aBaridi().ask(door, 'tom', 'where am I needed');
      expect(needed).toBe([
        WHAT_IT_ASKS.WAITING_ON_YOU,
        `Somebody in ${PIP} has been waiting on you for the handover notes for the Gigiri account since 16 September.`,
        '',
        NOT_A_RANKING.join(' '),
        '',
        WHAT_NEEDS_YOU_SOURCE.says,
      ].join('\n'));
      for (const text of [stuck, needed]) expect(text).not.toMatch(/Miriam|Njeri/);
    }
  });
});

describe('Femi, who waits on others', () => {
  it('reads his own waits as "you", and nobody waiting on anyone else', async () => {
    const said = await aBaridi().ask('app', 'femi', 'what am I waiting on');
    expect(said).toBe([
      'You have said you are waiting for these things.',
      `- You have been waiting for the new price list for Kilimani since 10 September, in the check-in ${SALES}.`,
      `- You said you cannot go on without the signed delivery schedule for Westgate, and you have been waiting for it since 15 September, in the check-in ${SALES}.`,
      `- You have been waiting for the Westgate margin figures since 20 September, in the check-in ${KEPT}.`,
    ].join('\n'));
    expect(said).not.toMatch(/Juma|Kofi|Gigiri|Ngong/);
  });
});

describe('Grace, an admin who is in none of these check-ins', () => {
  it('reads that nothing needs her, and nothing of anybody else\'s waits', async () => {
    for (const door of DOORS) {
      expect(await aBaridi().ask(door, 'grace', 'where am I needed')).toBe(
        'Nothing in the record needs you this week. That is not the same as everybody being fine. It is the record being quiet,'
        + ' and the people who most need a conversation are often the quietest in it.',
      );
      expect(await aBaridi().ask(door, 'grace', 'who is waiting on me')).toBe('Nothing is recorded as waiting on you, and you have not named anything you are waiting on.');
    }
  });
});

describe('for every reader, at either door', () => {
  const QUESTIONS = ['where am I needed', 'who is waiting on me', 'what am I waiting on', 'what should I do next'];

  it('never says an email address', async () => {
    for (const who of Object.keys(PEOPLE)) {
      for (const door of DOORS) {
        for (const q of QUESTIONS) expect(await aBaridi().ask(door, who, q)).not.toMatch(/@/);
      }
    }
  });

  it('writes no colon-joined pieces, no dash-joined pieces and no count of days, line by line', async () => {
    for (const who of Object.keys(PEOPLE)) {
      for (const door of DOORS) {
        for (const q of QUESTIONS) {
          const text = await aBaridi().ask(door, who, q);
          expect(plainLines(text)).toEqual([]);
          expect(text).not.toMatch(/\b\d+ days?\b/);
        }
      }
    }
  });
});
