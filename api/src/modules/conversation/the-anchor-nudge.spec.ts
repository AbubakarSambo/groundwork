import { PartyType } from '@prisma/client';
import { person, answered, commitment, handoff, boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, type Setup } from '../board/the-switchboards-sections-harness';
import { theAnchorNudgeLine, theAnchorNudgeFor, theAnchorNudgeOnWhatsApp, IT_HAS_BEEN_A_FEW_DAYS } from './the-anchor-nudge';
import { EmailService } from '../email/email.service';
import { whatIsWrongForThisReader } from '../../../journey/anchor/what-each-reader-may-be-served';

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
      platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : null)) },
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
    platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : null)) },
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
  it('the WhatsApp shape holds her first name, her own promise and the check-in, and is null with no promise', () => {
    expect(theAnchorNudgeOnWhatsApp('Rukia', 'Everyone pulling the same way', 'send your manager the deck')).toEqual({ template: 'anchor_checkin_follow_up', params: ['Rukia', 'send your manager the deck', 'Everyone pulling the same way'] });
    expect(theAnchorNudgeOnWhatsApp('Rukia', 'x', null)).toBeNull();
  });
});
