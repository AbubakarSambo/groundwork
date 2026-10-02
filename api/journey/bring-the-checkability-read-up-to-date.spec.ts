import { run, whatWouldChange } from './bring-the-checkability-read-up-to-date';
import { raisedToTheCurrentRule, readTheTurns } from '../src/modules/conversation/the-specificity-read';
import { howCheckableIsYoursAlone } from '../src/modules/grounds/how-checkable-is-yours-alone';

/**
 * SCREENS REQUEST 103: A SESSION SCORED BEFORE REQUEST 45'S FIX IS BROUGHT UP TO THE CURRENT RULE.
 *
 * Amani's session 1 on "Sales team, Q3" closed on 27 September. She said a date and who she was
 * waiting on, and her stored read still said neither was there, so the Done page told her "One date,
 * number or document. Groundwork did not pick this up this time." No test here touches a database:
 * the database is a fake that records every write.
 */
const HOSTED = 'postgresql://release:secret@db.example-host.net:5432/groundwork?sslmode=require';
const LOCAL = 'postgresql://someone@localhost:5432/gw_test';

/* What Amani typed in session 1, and the read stored for it before 29 September. */
const AMANI_SAID = [
  'I visited four shops in Kilimani this week.',
  'My next step is to deliver three cookers to Tuskys Kilimani on 9 October and ask for the signed order form that day.',
  'I am waiting on Rukia for the price list.',
];
const STORED_BEFORE_THE_FIX = { delivery: 'directional', evidence: 'vague', enablement: 'managed', coverage: 'managed', commitment: 'directional', checkable: 'specific' };
/* Baraka's, scored after the fix, read higher by the old rule on one part than the current rule would. */
const BARAKA_SAID = ['fine', 'no'];
const BARAKA_STORED = { delivery: 'specific', evidence: 'managed', enablement: 'managed', coverage: 'managed', commitment: 'managed', checkable: 'managed' };

function aDatabase() {
  const rows: Record<string, any> = {
    'c-amani-1': { id: 'c-amani-1', groundId: 'g1', participantId: 'p-amani', startedAt: new Date('2026-09-26T08:00:00Z'), status: 'COMPLETED', specificityLevel: 'directional', specificityDimensions: { ...STORED_BEFORE_THE_FIX } },
    'c-baraka-1': { id: 'c-baraka-1', groundId: 'g1', participantId: 'p-baraka', startedAt: new Date('2026-09-26T08:00:00Z'), status: 'COMPLETED', specificityLevel: 'managed', specificityDimensions: { ...BARAKA_STORED } },
    'c-neema-1': { id: 'c-neema-1', groundId: 'g1', participantId: 'p-neema', startedAt: null, status: 'COMPLETED', specificityLevel: null, specificityDimensions: null },
  };
  const turns: Record<string, string[]> = { 'c-amani-1': AMANI_SAID, 'c-baraka-1': BARAKA_SAID, 'c-neema-1': ['I mapped the shops.'] };
  const writes: { id: string; data: any }[] = [];
  const prisma = {
    checkIn: {
      findMany: jest.fn(async () => Object.values(rows).map((r) => ({ ...r }))),
      update: jest.fn(async ({ where, data }: any) => { writes.push({ id: where.id, data }); Object.assign(rows[where.id], data); return rows[where.id]; }),
    },
    conversationTurn: { findMany: jest.fn(async ({ where }: any) => (turns[where.checkInId] ?? []).map((content) => ({ content }))) },
    groundDocument: { count: jest.fn(async () => 0) },
    $disconnect: jest.fn(async () => undefined),
  };
  return { prisma, rows, writes, turns };
}

/* The Done page's own rule (client/src/components/gw/TheFiveThingsThatMakeItCheckable.tsx, wasItThere). */
const wasItThere = (level: unknown) => level === 'specific' || level === 'directional';
const doneLine = (part: string, words: string, dims: any) => `${words}. ${wasItThere(dims?.[part]) ? 'Groundwork found this.' : 'Groundwork did not pick this up this time.'}`;
const PARTICIPANTS = [
  { id: 'p-rukia', userId: 'u-rukia' }, { id: 'p-amani', userId: 'u-amani' }, { id: 'p-baraka', userId: 'u-baraka' },
];

describe('the rule, brought up to date', () => {
  it('reads Amani\'s date and her wait on Rukia under the current rule', () => {
    const now = readTheTurns(AMANI_SAID, false);
    expect(wasItThere(now.dimensions.evidence)).toBe(true);
    expect(wasItThere(now.dimensions.enablement)).toBe(true);
  });

  it('raises a part, never lowers one, and keeps the parts it was not given', () => {
    const up = raisedToTheCurrentRule(STORED_BEFORE_THE_FIX, readTheTurns(AMANI_SAID, false).dimensions)!;
    expect(up.raised.sort()).toEqual(['enablement', 'evidence']);
    expect(up.dimensions.delivery).toBe('directional');
    expect(raisedToTheCurrentRule(BARAKA_STORED, readTheTurns(BARAKA_SAID, false).dimensions)).toBeNull();
    expect(raisedToTheCurrentRule(null, readTheTurns(AMANI_SAID, false).dimensions)).toBeNull();
  });
});

describe('the script, on this machine', () => {
  it('a dry run prints how many would change and writes nothing', async () => {
    const db = aDatabase();
    const said: string[] = [];
    const r = await run({ url: LOCAL, args: ['--dry-run'], prismaFor: () => db.prisma, ask: async () => null, say: (l) => said.push(l) });
    expect(r.wrote).toBe(false);
    expect(db.writes).toEqual([]);
    expect(said).toEqual([
      '2 finished check-ins were read again under the current rule.',
      '1 check-in would have a part of the read raised. No part would be lowered, and nobody\'s words would change.',
      '"One date, number or document" would be raised on 1 check-in.',
      '"What you were waiting on, and from whom" would be raised on 1 check-in.',
      'This was a dry run. Nothing was written.',
    ]);
  });

  it('then writes only Amani\'s read, only that column, and her words are untouched', async () => {
    const db = aDatabase();
    const before = Object.values(db.turns).map((t) => [...t]);
    const r = await run({ url: LOCAL, args: [], prismaFor: () => db.prisma, ask: async () => null, say: () => undefined });
    expect(r.wrote).toBe(true);
    expect(db.writes.map((w) => w.id)).toEqual(['c-amani-1']);
    expect(Object.keys(db.writes[0].data)).toEqual(['specificityDimensions']);
    expect(db.rows['c-amani-1'].specificityLevel).toBe('directional');
    expect(db.rows['c-baraka-1'].specificityDimensions).toEqual(BARAKA_STORED);
    expect(Object.values(db.turns)).toEqual(before);
    /* And run again, nothing more changes. */
    expect((await whatWouldChange(db.prisma)).raise).toEqual([]);
  });

  it('what each reader is sent after it, as the Done page draws it', async () => {
    const db = aDatabase();
    const checkIns = () => Object.values(db.rows).filter((r) => r.participantId !== 'p-neema');
    const amaniBefore = howCheckableIsYoursAlone(checkIns(), PARTICIPANTS, 'u-amani').find((c) => c.participantId === 'p-amani')!;
    expect(doneLine('evidence', 'One date, number or document', amaniBefore.specificityDimensions)).toBe('One date, number or document. Groundwork did not pick this up this time.');
    expect(doneLine('enablement', 'What you were waiting on, and from whom', amaniBefore.specificityDimensions)).toBe('What you were waiting on, and from whom. Groundwork did not pick this up this time.');

    await run({ url: LOCAL, args: [], prismaFor: () => db.prisma, ask: async () => null, say: () => undefined });

    /* Amani, her own read. */
    const amani = howCheckableIsYoursAlone(checkIns(), PARTICIPANTS, 'u-amani').find((c) => c.participantId === 'p-amani')!;
    expect(doneLine('evidence', 'One date, number or document', amani.specificityDimensions)).toBe('One date, number or document. Groundwork found this.');
    expect(doneLine('enablement', 'What you were waiting on, and from whom', amani.specificityDimensions)).toBe('What you were waiting on, and from whom. Groundwork found this.');
    /* Rukia who runs it, Baraka a colleague, and an admin: still nothing of Amani's read. */
    for (const reader of ['u-rukia', 'u-baraka', 'u-juma', 'u-grace']) {
      const row = howCheckableIsYoursAlone(checkIns(), PARTICIPANTS, reader).find((c) => c.participantId === 'p-amani')!;
      expect(row.specificityDimensions).toBeNull();
      expect(row.specificityLevel).toBeNull();
    }
  });
});

describe('the script, on a hosted database (decision 74, item 5)', () => {
  it('refuses it without --hosted-database, reading nothing', async () => {
    const db = aDatabase();
    const r = await run({ url: HOSTED, args: [], prismaFor: () => db.prisma, ask: async () => null, say: () => undefined });
    expect(r.refused).toMatch(/not on this machine/);
    expect(db.prisma.checkIn.findMany).not.toHaveBeenCalled();
  });

  it('with --hosted-database alone it is a dry run', async () => {
    const db = aDatabase();
    const r = await run({ url: HOSTED, args: ['--hosted-database'], prismaFor: () => db.prisma, ask: async () => 'db.example-host.net', say: () => undefined });
    expect(r.wrote).toBe(false);
    expect(db.writes).toEqual([]);
  });

  it('with --write it writes only when the host is typed back exactly', async () => {
    const wrong = aDatabase();
    expect((await run({ url: HOSTED, args: ['--hosted-database', '--write'], prismaFor: () => wrong.prisma, ask: async () => 'db.example-host', say: () => undefined })).wrote).toBe(false);
    expect(wrong.writes).toEqual([]);
    const none = aDatabase();
    expect((await run({ url: HOSTED, args: ['--hosted-database', '--write'], prismaFor: () => none.prisma, ask: async () => null, say: () => undefined })).wrote).toBe(false);
    const right = aDatabase();
    expect((await run({ url: HOSTED, args: ['--hosted-database', '--write'], prismaFor: () => right.prisma, ask: async () => 'db.example-host.net', say: () => undefined })).wrote).toBe(true);
    expect(right.writes.map((w) => w.id)).toEqual(['c-amani-1']);
  });
});
