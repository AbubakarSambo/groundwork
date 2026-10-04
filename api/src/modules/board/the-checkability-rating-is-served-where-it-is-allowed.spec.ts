import { GroundScenario } from '@prisma/client';
import { boardAs, answered, PEOPLE, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN } from './the-switchboards-sections-harness';
import { howCheckableIsYoursAlone } from '../grounds/how-checkable-is-yours-alone';

/**
 * THE CHECKABILITY RATING IS STILL SERVED, EXACTLY WHERE DECISIONS 40, 43 AND 76 SAY.
 *
 * Request 111 (a) took every rating number off what readers are sent. Decision 76 (item 1): the rating
 * of how specific and checkable a person's answers are stays, in the prototype's form, for exactly
 * these readers, and never as a number to anybody but the person:
 *  - the person reads their own "How checkable today's check-in was" (done.txt: "4 of 5", the five
 *    parts, "This is about the check-in. Only you see it.");
 *  - the lead and the admins read "Nothing checkable" beside the name, with what to ask next, as
 *    sentences with no number in them (`eachPerson`, the prototype's "The team today");
 *  - the lead, and the admin who set the check-in up, also read it in "contribution against role";
 *    an admin who did not set it up does not read that section at all (decision 75, item 1, request 88);
 *  - a colleague reads nothing of it about anybody else.
 *
 * Served as every reader, on a team check-in where people see each other and where they do not, and
 * on an evaluation check-in (a performance plan).
 */

/** The five parts as the engine reads them, and the rule the Done page counts them by. */
const THE_FIVE = ['delivery', 'evidence', 'enablement', 'coverage', 'commitment'] as const;
const thereIn = (level: unknown) => level === 'specific' || level === 'directional';
const countOf = (dims: Record<string, string> | null | undefined) => (dims ? THE_FIVE.filter((k) => thereIn(dims[k])).length : null);

const FOUR_OF_FIVE = { delivery: 'specific', evidence: 'specific', enablement: 'vague', coverage: 'directional', commitment: 'specific' };
const NONE_OF_FIVE = { delivery: 'managed', evidence: 'managed', enablement: 'managed', coverage: 'managed', commitment: 'managed' };

const said = (p: string, dims: Record<string, string>, level: string) => ({ ...answered(p, 1), specificityLevel: level, specificityDimensions: dims });

const LINES = [
  { id: 'e1', participantId: 'p-rukia', type: 'PROGRESS', text: 'I have signed Tuskys Westgate on 3 September for 40 cookers.', verifiability: 'HIGH', checkIn: { sessionNumber: 1 }, disputedAt: null },
  { id: 'e3', participantId: 'p-baraka', type: 'PROGRESS', text: 'Things are going fine.', verifiability: 'LOW', checkIn: { sessionNumber: 1 }, disputedAt: null },
];

/** Every string anywhere in a payload. */
function everyString(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, out));
  else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v).forEach((x) => everyString(x, out));
  return out;
}

/** A number that rates a person, or a reading of somebody's answers, anywhere in a payload. */
function anyRatingIn(v: unknown, path = ''): string[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => anyRatingIn(x, `${path}[${i}]`));
  if (!v || typeof v !== 'object' || v instanceof Date) return [];
  return Object.entries(v).flatMap(([k, x]) => [
    ...((/^(confidence|evidenceCount|pct|score)$/.test(k) && typeof x === 'number') ? [`${path}.${k}`] : []),
    ...((/^(specificity\w*|verifiability)$/.test(k) && x != null) ? [`${path}.${k}`] : []),
    ...anyRatingIn(x, `${path}.${k}`),
  ]);
}

/** What the lead and an admin with access read about somebody whose answers held nothing checkable. */
const NOTHING_CHECKABLE_ON_THE_BOARD = (name: string) =>
  `Nothing ${name} has said so far is checkable, because nobody else can check it yet. A number, a date or a document for what moved would change that.`;
const NOTHING_CHECKABLE_TODAY = (name: string) =>
  `Nothing ${name} said this round can be checked yet. A number, a date or a document for what moved would change that.`;
const WHAT_TO_ASK = (name: string) => `Ask ${name} for a photo, a message or a document that shows what moved.`;

/** "Nothing checkable" beside the name, with what to ask next, as the lead and the admins read it. */
function expectNothingCheckableBeside(board: any, participantId: string, name: string) {
  const row = board.eachPerson.find((r: any) => r.participantId === participantId);
  expect(row.who).toBe(name);
  expect(row.reason).toBe('nothing checkable');
  expect(row.says).toBe(NOTHING_CHECKABLE_TODAY(name));
  expect(row.ask).toBe(WHAT_TO_ASK(name));
}

describe.each([
  ['a team check-in where people see each other', { peersVisibleToEachOther: true }],
  ['a team check-in where people see only themselves', { peersVisibleToEachOther: false }],
])('on %s (Rukia said four of the five, Baraka none)', (_what, how) => {
  const CHECK_INS = [said('p-rukia', FOUR_OF_FIVE, 'specific'), said('p-baraka', NONE_OF_FIVE, 'managed')];
  const setup = { ...how, lines: LINES, checkIns: CHECK_INS, createdByUserId: 'u-setup' };

  it('Amina, the lead, reads "Nothing checkable" beside Baraka\'s name with what to ask next, and no number', async () => {
    const board = await boardAs(setup, ...AMINA);
    const baraka = board.contribution.find((r: any) => r.participantId === 'p-baraka');
    expect(baraka.nothingCheckable).toBe(true);
    expect(baraka.reason).toBe(NOTHING_CHECKABLE_ON_THE_BOARD('Baraka Otieno'));
    const today = board.eachPersonToday.find((r: any) => r.participantId === 'p-baraka');
    expect(today.line).toBe(NOTHING_CHECKABLE_TODAY('Baraka Otieno'));
    expectNothingCheckableBeside(board, 'p-baraka', 'Baraka Otieno');
    expect(board.eachPerson.find((r: any) => r.participantId === 'p-rukia').reason).not.toBe('nothing checkable');
    /* Rukia said checkable things, so nothing is said beside her name. */
    const rukia = board.contribution.find((r: any) => r.participantId === 'p-rukia');
    expect(rukia.nothingCheckable).toBe(false);
    expect(rukia.reason).toBeNull();
    expect(anyRatingIn(board)).toEqual([]);
    /* No count of anybody's checkable lines reaches the lead. */
    expect(everyString(board).filter((s) => /checkable things? named|lines? taken from what|\bof 5\b/.test(s))).toEqual([]);
  });

  it('the admin who set it up, and so has access, reads the same plain form and no number', async () => {
    const board = await boardAs(setup, ...SETUP_ADMIN);
    const baraka = board.contribution.find((r: any) => r.participantId === 'p-baraka');
    expect(baraka.reason).toBe(NOTHING_CHECKABLE_ON_THE_BOARD('Baraka Otieno'));
    expectNothingCheckableBeside(board, 'p-baraka', 'Baraka Otieno');
    expect(anyRatingIn(board)).toEqual([]);
    expect(everyString(board).filter((s) => /checkable things? named|lines? taken from what|\bof 5\b/.test(s))).toEqual([]);
  });

  it('Juma, an admin who only reads, reads "Nothing checkable" beside Baraka\'s name with what to ask next, and no number', async () => {
    const board = await boardAs(setup, ...JUMA);
    expectNothingCheckableBeside(board, 'p-baraka', 'Baraka Otieno');
    /* "Contribution against role" is read in full by an admin with access too (decision 93, row 8; this pinned that it was empty). */
    expect(board.contribution.map((r: any) => r.participantId)).toEqual(expect.arrayContaining(['p-rukia', 'p-baraka']));
    expect(anyRatingIn(board)).toEqual([]);
    expect(everyString(board).filter((s) => /checkable things? named|lines? taken from what|\bof 5\b/.test(s))).toEqual([]);
  });

  it('Rukia reads the words of her own read, and nothing about Baraka\'s', async () => {
    const board = await boardAs(setup, ...RUKIA);
    expect(board.contribution.map((r: any) => r.participantId)).toEqual(['p-rukia']);
    expect(board.contribution[0].reason).toMatch(/^1 check-in on record\. 1 line taken from what you said/);
    expect(everyString(board).filter((s) => /Baraka/.test(s) && /checkable|can be checked/i.test(s))).toEqual([]);
    expect(anyRatingIn(board)).toEqual([]);
  });

  it('Baraka reads his own read, in words, and nothing about Rukia\'s', async () => {
    const board = await boardAs(setup, ...BARAKA);
    expect(board.contribution.map((r: any) => r.participantId)).toEqual(['p-baraka']);
    expect(board.contribution[0].nothingCheckable).toBe(true);
    expect(everyString(board).filter((s) => /Rukia/.test(s) && /checkable|can be checked/i.test(s))).toEqual([]);
    expect(anyRatingIn(board)).toEqual([]);
  });

  /* "How checkable today's check-in was", sent with the check-in rows of GET /grounds/:id. */
  const own = (userId: string) => howCheckableIsYoursAlone(structuredClone(CHECK_INS) as any[], PEOPLE as any[], userId);

  it('Rukia is sent her own five parts, which the Done page counts as 4 of 5, and nobody else\'s', () => {
    const rows = own('u-rukia');
    const hers = rows.find((r) => r.participantId === 'p-rukia')!;
    expect(hers.specificityDimensions).toEqual(FOUR_OF_FIVE);
    expect(`${countOf(hers.specificityDimensions as any)} of 5`).toBe('4 of 5');
    expect(rows.find((r) => r.participantId === 'p-baraka')!.specificityDimensions).toBeNull();
  });

  it('Baraka is sent his own five parts, 0 of 5, and nobody else\'s', () => {
    const rows = own('u-baraka');
    expect(countOf(rows.find((r) => r.participantId === 'p-baraka')!.specificityDimensions as any)).toBe(0);
    expect(rows.find((r) => r.participantId === 'p-rukia')!.specificityDimensions).toBeNull();
  });

  it.each([['Amina, the lead', 'u-amina'], ['Juma, an admin', 'u-juma'], ['the admin who set it up', 'u-setup']])(
    '%s is sent nobody\'s five parts and nobody\'s count',
    (_who, userId) => {
      const rows = own(userId).filter((r) => r.participantId !== 'p-amina');
      expect(rows.every((r) => r.specificityDimensions === null && r.specificityLevel === null)).toBe(true);
    },
  );
});

describe('on an evaluation check-in (a performance plan, Rukia reviewed, Baraka a colleague giving a view)', () => {
  /* This time Rukia, the person reviewed, said nothing checkable. */
  const CHECK_INS = [said('p-rukia', NONE_OF_FIVE, 'managed'), said('p-baraka', FOUR_OF_FIVE, 'specific')];
  const setup = { scenario: GroundScenario.PIP, lines: LINES, checkIns: CHECK_INS, createdByUserId: 'u-setup' };

  it('Amina, the manager, reads "Nothing checkable" beside Rukia\'s name with what to ask next, and no number', async () => {
    const board = await boardAs(setup, ...AMINA);
    const rukia = board.eachPersonToday.find((r: any) => r.participantId === 'p-rukia');
    expect(rukia.line).toBe(NOTHING_CHECKABLE_TODAY('Rukia Mwangi'));
    expectNothingCheckableBeside(board, 'p-rukia', 'Rukia Mwangi');
    expect(anyRatingIn(board)).toEqual([]);
    expect(everyString(board).filter((s) => /\bof 5\b|checkable things? named/.test(s))).toEqual([]);
  });

  it('Baraka, a colleague giving a view, reads nothing of how checkable Rukia\'s answers were', async () => {
    const board = await boardAs(setup, ...BARAKA);
    expect(everyString(board).filter((s) => /Rukia/.test(s) && /checkable|can be checked/i.test(s))).toEqual([]);
    expect(anyRatingIn(board)).toEqual([]);
  });

  it('Rukia, the person reviewed, reads nothing of how checkable Baraka\'s answers were, and no number', async () => {
    const board = await boardAs(setup, ...RUKIA);
    expect(everyString(board).filter((s) => /Baraka/.test(s) && /checkable|can be checked/i.test(s))).toEqual([]);
    expect(anyRatingIn(board)).toEqual([]);
  });

  it('the admin who set it up, and so has access, reads "Nothing checkable" beside Rukia\'s name and no number; Juma, with no access, is refused the board', async () => {
    const board = await boardAs(setup, ...SETUP_ADMIN);
    expectNothingCheckableBeside(board, 'p-rukia', 'Rukia Mwangi');
    expect(anyRatingIn(board)).toEqual([]);
    await expect(boardAs(setup, ...JUMA)).rejects.toBeTruthy();
  });

  it('Rukia is sent her own five parts (0 of 5) and Baraka his (4 of 5); the manager and the admins are sent neither', () => {
    const rows = (userId: string) => howCheckableIsYoursAlone(structuredClone(CHECK_INS) as any[], PEOPLE as any[], userId);
    expect(countOf(rows('u-rukia').find((r) => r.participantId === 'p-rukia')!.specificityDimensions as any)).toBe(0);
    expect(rows('u-rukia').find((r) => r.participantId === 'p-baraka')!.specificityDimensions).toBeNull();
    expect(countOf(rows('u-baraka').find((r) => r.participantId === 'p-baraka')!.specificityDimensions as any)).toBe(4);
    expect(rows('u-baraka').find((r) => r.participantId === 'p-rukia')!.specificityDimensions).toBeNull();
    for (const u of ['u-amina', 'u-juma', 'u-setup']) {
      expect(rows(u).filter((r) => r.participantId !== 'p-amina').every((r) => r.specificityDimensions === null)).toBe(true);
    }
  });
});
