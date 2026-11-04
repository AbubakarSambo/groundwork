import { AssistantService } from './assistant.service';
import { WhatIsTrueService } from './what-is-true.service';
import { BoardService } from '../board/board.service';
import { NOT_A_RANKING, STUCK_AND_RAISED_FOR_SOMEBODY_WHO_DOES_NOT_RUN_IT, WHAT_IT_ASKS } from '../detectors/who-needs-you-this-week';
import { whatIsNotPlainIn } from '../reports/a-product-sentence-is-plain';
import { WHAT_NEEDS_YOU_SOURCE } from './a-source-says-where-it-came-from';
import { Logger } from '@nestjs/common';

/* The model is off on purpose; its warning is not what is being read. */
beforeAll(() => { jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined); });

/**
 * A WAIT THAT WAS TAKEN FURTHER IS SAID TO ANYBODY WHO ASKS "WHERE AM I NEEDED" (3 October 2026; widened by decision 93, row 2).
 *
 * CHANGED ON 5 OCTOBER (decision 93, row 2): it was said to whoever runs that check-in and to nobody else, and the
 * tests below for Miriam, Tom, Femi and Grace pinned "nothing". Hafsah removed that restriction. They now pin what
 * each reads instead. The names are still said only as each reader may read them, a performance plan is still not
 * listed to somebody who is not in it (the Company page keeps its row 23), and the person it is about reads
 * their own queue only. Wairimu's tests are unchanged.
 *
 * "Where am I needed" has a group for waits that were taken further. It could never show: the waits across
 * the organisation never selected `escalatedAt`, so nothing ever reached it. And its sentence said the
 * person "has raised that they are stuck", when the stamp is Groundwork's own overnight check on a wait
 * still open after 14 days (webhooks.cron.ts). The person raised it only where they said so themselves.
 *
 * Baridi Appliances. Wairimu runs "Sales team, Q3", "Performance plan, Tom" and "Westgate review" (kept in
 * the app, so never said on WhatsApp, decision 82, item 7).
 *   - Femi waits on Miriam for the signed delivery schedule (10 September), says he cannot go on without
 *     it, and Groundwork stamped it on 24 September. This is the wait taken further.
 *   - Juma waits on the finance office for the approved budget (12 September) and said himself that he
 *     took it to the head of finance. Not stamped.
 *   - Miriam waits on Tom, in Tom's performance plan, for the handover notes (16 September), stamped
 *     30 September. Tom is never told who (decision 17).
 *   - Femi waits on the Westgate landlord for the margin figures (11 September), stamped 25 September,
 *     in the check-in kept in the app.
 *   - Femi waits on Wairimu for the new price list (20 September). Not stamped: Wairimu's own queue.
 * Miriam is a colleague in the sales check-in, Tom the person a performance plan is about, Grace an admin
 * in none of them.
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

const asParty = (g: any, email: string) => {
  const r = g.participants.find((p: any) => p.email === email);
  return { email, userId: r.userId, partyType: r.partyType, nameGiven: null, organisationGiven: null, user: SIGNED_IN[email] ?? null };
};

function aWait(groundId: string, from: string, on: string | { label: string }, what: string, day: string, extra: { status?: string; escalated?: string; triedSaid?: string } = {}) {
  const g = GROUNDS[groundId];
  const fromRow = g.participants.find((p: any) => p.email === from);
  const onRow = typeof on === 'string' ? g.participants.find((p: any) => p.email === on) : null;
  return {
    fromParticipantId: fromRow.id, onParticipantId: onRow?.id ?? null, onLabel: typeof on === 'string' ? null : on.label,
    what, status: extra.status ?? 'WAITING', createdAt: at(day), groundId,
    escalatedAt: extra.escalated ? at(extra.escalated) : null, triedSaid: extra.triedSaid ?? null,
    /* The assessment's reading of their words (F2, 2 November 2026): taken above the person it was with. */
    takenFurther: /took it to the head of/.test(extra.triedSaid ?? ''),
    ground: g,
    fromParticipant: asParty(g, from),
    onParticipant: typeof on === 'string' ? asParty(g, on) : null,
  };
}

const WAITS = [
  aWait('g-sales', 'femi@baridi.test', 'miriam@baridi.test', 'the signed delivery schedule for Westgate', '10', { status: 'BLOCKING', escalated: '24' }),
  aWait('g-sales', 'juma@baridi.test', { label: 'the finance office' }, 'the approved budget for the Karen shop', '12', { triedSaid: 'I took it to the head of finance last week.' }),
  aWait('g-pip', 'miriam@baridi.test', 'tom@baridi.test', 'the handover notes for the Gigiri account', '16', { escalated: '30' }),
  aWait('g-kept', 'femi@baridi.test', { label: 'the Westgate landlord' }, 'the Westgate margin figures', '11', { escalated: '25' }),
  aWait('g-sales', 'femi@baridi.test', 'wairimu@baridi.test', 'the new price list for Kilimani', '20'),
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

const FEMI_RAISED = `- Femi Ade says they cannot go on without the signed delivery schedule for Westgate, and has been waiting on Miriam Njeri for it since 10 September, in the check-in ${SALES}. It was still open after 14 days, so Groundwork raised it on 24 September.`;
const KEPT_RAISED = `- Femi Ade has been waiting on the Westgate landlord for the Westgate margin figures since 11 September, in the check-in ${KEPT}. It was still open after 14 days, so Groundwork raised it on 25 September.`;
const JUMA_RAISED = `- Juma Otieno has been waiting on the finance office for the approved budget for the Karen shop since 12 September, in the check-in ${SALES}. They have said they took it higher.`;
const MIRIAM_RAISED = `- Miriam Njeri has been waiting on Tom Mwangi for the handover notes for the Gigiri account since 16 September, in the check-in ${PIP}. It was still open after 14 days, so Groundwork raised it on 30 September.`;
const TAIL = ['', NOT_A_RANKING.join(' '), '', WHAT_NEEDS_YOU_SOURCE.says];

function plainLines(text: string): string[] {
  return text.split('\n').map((l) => l.replace(/^- /, '').trim()).filter(Boolean)
    .flatMap((l) => whatIsNotPlainIn(l).map((f) => `${f.rule}: "${f.found}" in "${l}"`));
}

describe('Wairimu, who runs every check-in here', () => {
  it('reads her own queue first, then each wait taken further, longest first, saying who raised it, in the app', async () => {
    expect(await aBaridi().ask('app', 'wairimu', 'where am I needed')).toBe([
      WHAT_IT_ASKS.WAITING_ON_YOU,
      'Femi Ade has been waiting on you for the new price list for Kilimani since 20 September.',
      '',
      WHAT_IT_ASKS.STUCK_AND_RAISED,
      FEMI_RAISED,
      KEPT_RAISED,
      JUMA_RAISED,
      MIRIAM_RAISED,
      ...TAIL,
    ].join('\n'));
  });

  it('and on WhatsApp the same, without the check-in kept in the app', async () => {
    const wa = aBaridi();
    expect(await wa.ask('whatsapp', 'wairimu', 'where am I needed')).toBe([
      WHAT_IT_ASKS.WAITING_ON_YOU,
      'Femi Ade has been waiting on you for the new price list for Kilimani since 20 September.',
      '',
      WHAT_IT_ASKS.STUCK_AND_RAISED,
      FEMI_RAISED,
      JUMA_RAISED,
      MIRIAM_RAISED,
      ...TAIL,
    ].join('\n'));
    expect(wa.prompts.filter((p) => p.includes('Westgate margin') || p.includes('Westgate landlord'))).toEqual([]);
  });

  it('"what should I do next" still starts with her own queue', async () => {
    for (const door of DOORS) {
      expect(await aBaridi().ask(door, 'wairimu', 'what should I do next'))
        .toContain('Start with Femi Ade. Femi Ade has been waiting on you for the new price list for Kilimani since 20 September. Nobody else can clear this one.');
    }
  });
});

const WESTGATE_RAISED_TO_A_STRANGER = `- Somebody in ${KEPT} has been waiting on the Westgate landlord for the Westgate margin figures since 11 September. It was still open after 14 days, so Groundwork raised it on 25 September.`;
const HEADING_FOR_OTHERS = STUCK_AND_RAISED_FOR_SOMEBODY_WHO_DOES_NOT_RUN_IT;

describe('Miriam, the person waited on and a colleague in the sales check-in', () => {
  it('reads Femi waiting on her, and now also each wait taken further, named as she may read it', async () => {
    const app = await aBaridi().ask('app', 'miriam', 'where am I needed');
    expect(app).toBe([
      WHAT_IT_ASKS.WAITING_ON_YOU,
      'Femi Ade has been waiting on you for the signed delivery schedule for Westgate since 10 September.',
      '',
      HEADING_FOR_OTHERS,
      WESTGATE_RAISED_TO_A_STRANGER,
      JUMA_RAISED,
      ...TAIL,
    ].join('\n'));
    /* Her own wait on Tom is hers, not somebody needing her, and the performance plan is hers to read only as a colleague in it. */
    expect(app).not.toContain('Gigiri');
    const phone = await aBaridi().ask('whatsapp', 'miriam', 'where am I needed');
    expect(phone).toBe([
      WHAT_IT_ASKS.WAITING_ON_YOU,
      'Femi Ade has been waiting on you for the signed delivery schedule for Westgate since 10 September.',
      '',
      HEADING_FOR_OTHERS,
      JUMA_RAISED.replace(/^- /, ''),
      ...TAIL,
    ].join('\n'));
  });
});

describe('Tom, the person a performance plan is about', () => {
  it('is never told who waits on him there, and reads the waits taken further elsewhere without a colleague named', async () => {
    for (const door of DOORS) {
      const said = await aBaridi().ask(door, 'tom', 'where am I needed');
      expect(said).toContain([
        WHAT_IT_ASKS.WAITING_ON_YOU,
        `Somebody in ${PIP} has been waiting on you for the handover notes for the Gigiri account since 16 September.`,
      ].join('\n'));
      expect(said).toContain(HEADING_FOR_OTHERS);
      expect(said).toContain(`- Somebody in ${SALES} says they cannot go on without the signed delivery schedule for Westgate, and has been waiting for it since 10 September. It was still open after 14 days, so Groundwork raised it on 24 September.`);
      expect(said).toContain(`- Somebody in ${SALES} has been waiting on the finance office for the approved budget for the Karen shop since 12 September. They have said they took it higher.`);
      expect(said).not.toMatch(/Miriam|Njeri|Femi|Juma/);
    }
  });
});

describe('Femi, whose own waits were taken further', () => {
  it('is not told about his own wait as somebody needing him, and reads the one that is not his', async () => {
    for (const door of DOORS) {
      const said = await aBaridi().ask(door, 'femi', 'where am I needed');
      expect(said).toBe([
        HEADING_FOR_OTHERS,
        JUMA_RAISED.replace(/^- /, ''),
        ...TAIL,
      ].join('\n'));
      expect(said).not.toMatch(/Westgate margin|signed delivery|Gigiri/);
    }
  });
});

describe('Grace, an admin who runs none of these check-ins', () => {
  it('reads each wait taken further by name, except the performance plan she is not in', async () => {
    for (const door of DOORS) {
      const said = await aBaridi().ask(door, 'grace', 'where am I needed');
      expect(said).toContain(HEADING_FOR_OTHERS);
      expect(said).toContain(FEMI_RAISED);
      expect(said).toContain(JUMA_RAISED);
      expect(said).not.toMatch(/Gigiri|Tom Mwangi/);
      expect(said.includes('Westgate margin')).toBe(door === 'app');
    }
  });
});

describe('for every reader, at either door', () => {
  it('never says the person raised what Groundwork raised, never an address, and only plain sentences', async () => {
    for (const who of Object.keys(PEOPLE)) {
      for (const door of DOORS) {
        const text = await aBaridi().ask(door, who, 'where am I needed');
        expect(text).not.toMatch(/has raised that they are stuck/);
        expect(text).not.toMatch(/@/);
        expect(plainLines(text)).toEqual([]);
      }
    }
  });
});

describe('the same wait said twice', () => {
  it('keeps the stamp and the words that say it was taken further, whichever mention carries them', () => {
    const { whatThePlaceIsWaitingOn } = jest.requireActual('../board/what-the-whole-place-is-waiting-on');
    const base = { fromParticipantId: 'p1', onParticipantId: null, onLabel: 'the finance office', status: 'WAITING', groundId: 'g', groundLabel: SALES, fromPersonKey: 'femi@baridi.test', onPersonKey: null };
    const [w] = whatThePlaceIsWaitingOn([
      { ...base, what: 'the approved budget for the Karen shop', createdAt: at('10'), escalatedAt: null, triedSaid: 'I emailed them.' },
      { ...base, what: 'the approved budget for the Karen shop', createdAt: at('20'), escalatedAt: at('25'), triedSaid: 'I took it to the head of finance.', takenFurther: true },
    ], at('30'));
    expect(w.escalatedAt).toEqual(at('25'));
    expect(w.triedSaid).toBe('I took it to the head of finance.');
    expect(w.createdAt).toEqual(at('10'));
  });
});
