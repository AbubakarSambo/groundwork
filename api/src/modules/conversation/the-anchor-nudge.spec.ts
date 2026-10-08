import { PartyType } from '@prisma/client';
import { person, answered, commitment, handoff, boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, type Setup } from '../board/the-switchboards-sections-harness';
import { theAnchorNudgeLine, theAnchorNudgeFor, IT_HAS_BEEN_A_FEW_DAYS } from './the-anchor-nudge';
import { GroundsCron } from '../grounds/grounds.cron';
import { itFollowsUpTheirPromise, aPromiseForABlank, yourViewMatters } from '../whatsapp/what-goes-to-a-phone';
import { TEMPLATES, FIRST_MESSAGES } from '../whatsapp/a-message-outside-the-window';
import { EmailService } from '../email/email.service';
import { whatIsWrongForThisReader } from '../board/the-anchor-readers';

/**
 * ANCHOR PIECE 30: THE NUDGE REPEATS THE PERSON'S OWN PROMISE, TO THEM ONLY (section 26; decision 105 item 3).
 * In the app, by email, and in a WhatsApp template's shape (built, not sent). Nobody else's words, ever.
 */
const lead = { ...person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR), managingOnly: false };
const PEOPLE = [lead, person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'), person('p-baraka', 'u-baraka', 'Baraka', 'Otieno')];
const OPENED = new Date('2026-09-08T08:00:00Z');

function anchor(on = true, startedFrom: string | null = 'anchor'): Setup {
  const checkIns = [
    { ...answered('p-amina', 1, '2026-09-09T10:00:00Z'), availableFrom: OPENED },
    { ...answered('p-baraka', 1, '2026-09-09T10:00:00Z'), availableFrom: OPENED },
    { id: 'c1-p-rukia', participantId: 'p-rukia', sessionNumber: 1, status: 'NOT_STARTED', isSetup: false, completedAt: null, availableFrom: OPENED },
  ];
  const commitments = [
    commitment('k1', 'p-rukia', 'I will send my manager the deck.'),
    commitment('k2', 'p-baraka', 'I will call the supplier about the Westgate order.'),
  ];
  return {
    people: PEOPLE, checkIns, commitments, dependencies: [], groundRow: { startedFrom, startsAt: OPENED },
    prismaExtras: {
      platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : { value: { on: false } })) },
      groundDependency: { findMany: jest.fn(async () => []) },
      recommendation: { findMany: jest.fn(async () => []) },
      checkIn: {
        findMany: jest.fn(async () => checkIns), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
        findFirst: jest.fn(async (a: any) => checkIns.find((c) => c.participantId === a?.where?.participantId && c.status === 'COMPLETED') ?? null),
      },
      groundCommitment: { findMany: jest.fn(async (a: any) => commitments.filter((c) => !a?.where?.participantId || c.participantId === a.where.participantId)) },
    },
  };
}

describe('the nudge, as each reader is served it in the app', () => {
  it('Rukia, who has not checked in, reads her own promise said back to her', async () => {
    const b = await boardAs(anchor(), ...RUKIA);
    expect(b.aNudgeForYou).toBe("You mentioned you would send your manager the deck. I'd love to hear how it went.");
    expect(b.aNudgeForYou).not.toMatch(/Westgate|Baraka|supplier/);
    expect(whatIsWrongForThisReader('a person in it', b, { othersNames: ['Amina', 'Baraka'] })).toEqual([]);
  });
  it('Baraka, who has checked in, is not nudged', async () => {
    expect((await boardAs(anchor(), ...BARAKA)).aNudgeForYou).toBeNull();
  });
  it('the lead, an admin with access and an admin who only reads are served nobody\'s nudge', async () => {
    for (const [r, who] of [[AMINA, 'the lead'], [SETUP_ADMIN, 'an admin with access'], [JUMA, 'an admin who only reads']] as const) {
      const setup = who === 'an admin with access' ? ({ ...anchor(), createdByUserId: 'u-setup' } as any) : anchor();
      const b = await boardAs(setup, r[0], r[1]);
      expect('aNudgeForYou' in b).toBe(false);
      expect(JSON.stringify(b)).not.toMatch(/I'd love to hear how it went/);
    }
  });
  it('with the switch off, or not an anchor check-in, nobody is served one', async () => {
    expect('aNudgeForYou' in (await boardAs(anchor(false), ...RUKIA))).toBe(false);
    expect('aNudgeForYou' in (await boardAs(anchor(true, null), ...RUKIA))).toBe(false);
  });
});

describe('the line, by email and in a WhatsApp template\'s shape', () => {
  const prisma = (on: boolean, rows: any[]) => ({
    platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : { value: { on: false } })) },
    groundCommitment: { findMany: jest.fn(async (a: any) => rows.filter((c) => c.participantId === a.where.participantId && c.status === a.where.status && c.source === a.where.source)) },
  });
  const ROWS = [
    { participantId: 'p-rukia', text: 'I will send my manager the deck.', status: 'UNKNOWN', source: 'CHECK_IN', explicit: true },
    { participantId: 'p-baraka', text: 'I will call the supplier.', status: 'UNKNOWN', source: 'CHECK_IN', explicit: true },
    { participantId: 'p-rukia', text: 'Rukia will prepare the budget.', status: 'UNKNOWN', source: 'LEAD', explicit: false },
  ];
  it('is the person\'s own promise, never another\'s or a lead\'s', async () => {
    expect(await theAnchorNudgeFor(prisma(true, ROWS), { id: 'g', startedFrom: 'anchor' }, 'p-rukia')).toBe("You mentioned you would send your manager the deck. I'd love to hear how it went.");
    expect(await theAnchorNudgeFor(prisma(true, ROWS.slice(2)), { id: 'g', startedFrom: 'anchor' }, 'p-rukia')).toBe(IT_HAS_BEEN_A_FEW_DAYS);
  });
  it('does not say a promise back that names nobody but "her" (anchor walk, 8 October: "last time you said you would ask her")', async () => {
    const rows = [{ participantId: 'p-neema', text: 'I will ask her tomorrow.', status: 'UNKNOWN', source: 'CHECK_IN', explicit: true }];
    expect(await theAnchorNudgeFor(prisma(true, rows), { id: 'g', startedFrom: 'anchor' }, 'p-neema')).toBe(IT_HAS_BEEN_A_FEW_DAYS);
    const named = [{ participantId: 'p-neema', text: 'I will ask Zawadi to text them the list.', status: 'UNKNOWN', source: 'CHECK_IN', explicit: true }];
    expect(await theAnchorNudgeFor(prisma(true, named), { id: 'g', startedFrom: 'anchor' }, 'p-neema')).toBe("You mentioned you would ask Zawadi to text them the list. I'd love to hear how it went.");
  });
  it('is nothing with the switch off or on another check-in', async () => {
    expect(await theAnchorNudgeFor(prisma(false, ROWS), { id: 'g', startedFrom: 'anchor' }, 'p-rukia')).toBeNull();
    expect(await theAnchorNudgeFor(prisma(true, ROWS), { id: 'g', startedFrom: null }, 'p-rukia')).toBeNull();
  });
  it('the email Rukia receives carries her line, and the email without one is as before', async () => {
    const out: any[] = [];
    const email = new EmailService({ get: () => undefined } as any, {} as any, { groundParticipant: { findUnique: jest.fn(async () => null) } } as any);
    jest.spyOn(email as any, 'sendEmail').mockImplementation(async (m: any) => { out.push(m); return undefined; });
    await email.sendNudge('rukia@x.test', 'Everyone pulling the same way', 'http://x/checkin/c1', undefined, false, theAnchorNudgeLine('send your manager the deck'), 'p-rukia');
    await email.sendNudge('rukia@x.test', 'Everyone pulling the same way', 'http://x/checkin/c1', undefined, false, undefined, 'p-rukia');
    expect(out[0].html).toContain('You mentioned you would send your manager the deck.');
    expect(out[1].html).not.toContain('You mentioned');
  });

});

/* Hafsah, 5 October: the WhatsApp nudge actually sends, through the same sender, gates and count as every first message. */
describe('the nudge on WhatsApp, as the morning job sends it', () => {
  const DAY = 86_400_000;
  const aCron = (rows: any[], opts: { on?: boolean; onLeave?: boolean; promise?: string | null; before?: any[] } = {}) => {
    const sendFor = jest.fn(async (..._a: any[]) => ({ sent: true }));
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => (opts.on === false ? { value: { on: false } } : { value: { on: true } })) },
      checkIn: { findMany: jest.fn(async (q: any) => (q.where.sessionNumber !== undefined ? [{ status: 'NOT_STARTED', participant: { managingOnly: false, user: { awaitingOrgApproval: false } } }, { status: 'NOT_STARTED', participant: { managingOnly: false, user: { awaitingOrgApproval: false } } }] : rows)) },
      groundParticipant: { findMany: jest.fn(async () => rows.map((r) => ({ id: r.participantId, userId: r.participant.userId, ground: { organizationId: 'org-1' } }))) },
      organization: { findMany: jest.fn(async () => [{ id: 'org-1' }]) },
      leaveRequest: { findMany: jest.fn(async () => (opts.onLeave ? [{ userId: 'u-rukia', organizationId: 'org-1', startsOn: new Date(Date.now() - DAY), endsOn: new Date(Date.now() + DAY) }] : [])) },
      whatsAppSend: { findMany: jest.fn(async () => opts.before ?? []), findFirst: jest.fn(async () => null) },
      person: { findFirst: jest.fn(async ({ where }: any) => ({ phone: where.email === 'rukia@x.test' ? '+254711111111' : '+254722222222' })) },
      groundCommitment: { findMany: jest.fn(async (a: any) => (a.where.participantId === 'p-rukia' && opts.promise !== null ? [{ text: opts.promise ?? 'I will send my manager the deck.', explicit: true, participantId: 'p-rukia', source: 'CHECK_IN', status: 'UNKNOWN' }] : [])) },
    };
    const cron = new GroundsCron(prisma, {} as any, { get: () => undefined } as any, {} as any, {} as any, { sendFor, isEnabled: async () => true } as any, {} as any);
    (cron as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    return { cron, sendFor };
  };
  const row = (who: 'rukia' | 'baraka', over: any = {}) => ({
    id: `ci-${who}`, groundId: 'g-1', sessionNumber: 2, participantId: `p-${who}`, createdAt: new Date(Date.now() - 3 * DAY - 3_600_000), availableFrom: null,
    ground: { label: 'Everyone pulling the same way', scenario: 'REALIGN_TEAM', organizationId: 'org-1', overWhatsApp: null, cadence: 'ONE_TIME', chaseAfterDays: [3, 7, 14], chasingStopped: false, tellTheLead: true, startedFrom: 'anchor', initiator: { firstName: 'Amina' } },
    participant: { id: `p-${who}`, email: `${who}@x.test`, userId: `u-${who}`, user: { firstName: who === 'rukia' ? 'Rukia' : 'Baraka', email: `${who}@x.test`, phoneNumber: null, isActive: true, deletedAt: null } },
    ...over,
  });

  it('Rukia receives her own promise, word for word as the body reads, and Baraka, who has none, the ordinary chase', async () => {
    const { cron, sendFor } = aCron([row('rukia'), row('baraka')]);
    await cron.sendWhatsAppRemindersInner();
    const toRukia = sendFor.mock.calls.find((c) => c[1] === '+254711111111')!;
    expect(toRukia[2]).toBe("Hi Rukia, last time you said you would send your manager the deck. I'd love to hear how it went. Your check-in for Everyone pulling the same way is open, and you can answer here.");
    expect(toRukia[3]).toMatchObject({ kind: 'anchor-follow-up', params: ['Rukia', 'send your manager the deck', 'Everyone pulling the same way'] });
    const toBaraka = sendFor.mock.calls.find((c) => c[1] === '+254722222222')!;
    expect(toBaraka[2]).toBe(yourViewMatters({ firstName: 'Baraka', label: 'Everyone pulling the same way' }, 'Amina').text);
    expect(String(toBaraka[2])).not.toContain('deck');
  });
  it('nothing about her promise goes with the switch off, to somebody on leave, or about a check-in kept off WhatsApp', async () => {
    const off = aCron([row('rukia')], { on: false }); await off.cron.sendWhatsAppRemindersInner();
    expect(JSON.stringify(off.sendFor.mock.calls)).not.toContain('deck');
    const away = aCron([row('rukia')], { onLeave: true }); await away.cron.sendWhatsAppRemindersInner();
    expect(away.sendFor).not.toHaveBeenCalled();
    const kept = aCron([row('rukia', { ground: { ...row('rukia').ground, overWhatsApp: false } })]); await kept.cron.sendWhatsAppRemindersInner();
    expect(kept.sendFor).not.toHaveBeenCalled();
  });
  it('not twice: a follow-up already tried today counts as the chase', async () => {
    const { cron, sendFor } = aCron([row('rukia')], { before: [{ kind: 'anchor-follow-up', createdAt: new Date(Date.now() - 2 * 3_600_000) }] });
    await cron.sendWhatsAppRemindersInner();
    expect(sendFor).not.toHaveBeenCalled();
  });
  it('the template keeps Meta\'s rules, and counts as a first message (so "not now" and the one a day hold it)', () => {
    const body = TEMPLATES['anchor-follow-up'].body;
    expect(body).toBe("Hi {{1}}, last time you said you would {{2}}. I'd love to hear how it went. Your check-in for {{3}} is open, and you can answer here.");
    expect(body.startsWith('{{')).toBe(false);
    expect(body.trim().endsWith('}}')).toBe(false);
    expect(body).not.toMatch(/\}\}\s*\{\{/);
    expect(FIRST_MESSAGES.has('anchor-follow-up')).toBe(true);
  });
  it('a promise is made safe for its blank', () => {
    expect(aPromiseForABlank('send the deck\n\tto the client.')).toBe('send the deck to the client');
    const long = aPromiseForABlank('call every one of the forty shops in Westlands and Kilimani about the new price list and the delivery days that start next month for each of them');
    expect(long.length).toBeLessThanOrEqual(120);
    /* Review: a promise that was cut says so. */
    expect(long.endsWith('…')).toBe(true);
    expect(long).not.toMatch(/\s…$|[.,]…$/);
    expect(aPromiseForABlank('send the deck to the client')).toBe('send the deck to the client');
    expect(itFollowsUpTheirPromise({ firstName: 'Rukia', label: 'x' }, 'a\nb').params[1]).toBe('a b');
  });
});
