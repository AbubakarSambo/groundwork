import { boardAs, answered, person, PEOPLE, AMINA, BARAKA, JUMA, SETUP_ADMIN, handoff } from './the-switchboards-sections-harness';
import { howCheckableIsYoursAlone } from '../grounds/how-checkable-is-yours-alone';

/**
 * REQUEST 116 (b) AND (c), AS EACH READER READS IT (decisions 38, 40, 43 and 76).
 *
 * (b) The lead and the admins read "Nothing checkable" with what to ask next, never "nothing to do"
 *     and never a "Nothing checkable" with nothing to ask. Baraka said nothing checkable this round and
 *     is also waiting on Rukia for something he has already chased, three days old. Before, his row
 *     said "Nothing checkable" and asked nothing, because the wait gave no ask of its own.
 * (c) Nobody gets a read on answers they never gave. Faraji Odhiambo has never checked in. The lead
 *     read "Nothing Faraji Odhiambo has said so far is checkable"; now she reads that he has not
 *     checked in yet, and he reads "You have not checked in yet."
 */

const NONE_OF_FIVE = { delivery: 'managed', evidence: 'managed', enablement: 'managed', coverage: 'managed', commitment: 'managed' };
const FARAJI = person('p-faraji', 'u-faraji', 'Faraji', 'Odhiambo');
const FARAJI_READS = ['u-faraji', 'MEMBER'] as const;

const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
const setup = {
  people: [...PEOPLE, FARAJI],
  createdByUserId: 'u-setup',
  checkIns: [
    answered('p-rukia', 1),
    { ...answered('p-baraka', 1), specificityLevel: 'managed', specificityDimensions: NONE_OF_FIVE },
  ],
  lines: [
    { id: 'e1', participantId: 'p-rukia', type: 'PROGRESS', text: 'I signed Tuskys Westgate on 3 September for 40 cookers.', verifiability: 'HIGH', checkIn: { sessionNumber: 1 }, disputedAt: null },
    { id: 'e2', participantId: 'p-baraka', type: 'PROGRESS', text: 'Things are going fine.', verifiability: 'LOW', checkIn: { sessionNumber: 1 }, disputedAt: null },
  ],
  dependencies: [
    handoff('d-baraka', 'p-baraka', 'the stock count', { onParticipantId: 'p-rukia', status: 'WAITING', triedSaid: 'I asked her twice.', createdAt: threeDaysAgo }),
  ],
};

function everyString(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, out));
  else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v).forEach((x) => everyString(x, out));
  return out;
}

const NOTHING_CHECKABLE_TODAY = 'Nothing Baraka Otieno said this round can be checked yet. A number, a date or a document for what moved would change that.';
const WHAT_TO_ASK_BARAKA = 'Ask Baraka Otieno for a photo, a message or a document that shows what moved.';

describe('request 116 (b): "Nothing checkable" with what to ask next, to the lead and the admins', () => {
  it.each([
    ['Amina, the lead', AMINA],
    ['the admin who set it up', SETUP_ADMIN],
    ['Juma, an admin who only reads', JUMA],
  ])('%s reads "Nothing checkable" beside Baraka, with what to ask next, though he is also waiting on Rukia', async (_who, reader) => {
    const board = await boardAs(setup as any, ...(reader as readonly [string, string]));
    const row = board.eachPerson.find((r: any) => r.participantId === 'p-baraka');
    expect(row.reason).toBe('nothing checkable');
    expect(row.says).toBe(NOTHING_CHECKABLE_TODAY);
    expect(row.ask).toBe(WHAT_TO_ASK_BARAKA);
    /* Nobody who said nothing checkable is "nothing to do". */
    expect(board.eachPerson.filter((r: any) => r.reason === 'nothing to do').map((r: any) => r.participantId)).not.toContain('p-baraka');
  });

  it('the lead reads the same line in "The team today"', async () => {
    const board = await boardAs(setup as any, ...AMINA);
    expect(board.eachPersonToday.find((r: any) => r.participantId === 'p-baraka').line).toBe(NOTHING_CHECKABLE_TODAY);
  });

  it('Baraka reads no "Nothing checkable" row about anybody, and his own read only through his own check-in', async () => {
    const board = await boardAs(setup as any, ...BARAKA);
    expect(board.eachPerson).toBeUndefined();
    const own = howCheckableIsYoursAlone(structuredClone(setup.checkIns) as any[], [...PEOPLE, FARAJI] as any[], 'u-baraka');
    expect(own.find((r) => r.participantId === 'p-baraka')!.specificityDimensions).toEqual(NONE_OF_FIVE);
    expect(own.find((r) => r.participantId === 'p-rukia')!.specificityDimensions).toBeNull();
  });
});

describe('request 116 (c): nobody gets a read on answers they never gave', () => {
  const aReadOnFaraji = (s: string) => /Faraji/.test(s) && /checkable|can be checked/i.test(s);

  it.each([
    ['Amina, the lead', AMINA],
    ['the admin who set it up', SETUP_ADMIN],
  ])('%s reads "Faraji Odhiambo has not checked in yet.", never a read on what he said', async (_who, reader) => {
    const board = await boardAs(setup as any, ...(reader as readonly [string, string]));
    const faraji = board.contribution.find((r: any) => r.participantId === 'p-faraji');
    expect(faraji.reason).toBe('Faraji Odhiambo has not checked in yet.');
    expect(faraji.nothingCheckable).toBe(false);
    expect(everyString(board).filter(aReadOnFaraji)).toEqual([]);
    const row = board.eachPerson.find((r: any) => r.participantId === 'p-faraji');
    expect(row.reason).toBe('has not answered');
    expect(row.says).toBe('Faraji Odhiambo has not checked in yet.');
    expect(row.ask).toBe('Ask Faraji Odhiambo to check in.');
  });

  it('Juma, an admin who only reads, reads that Faraji has not checked in, and no read on what he said', async () => {
    const board = await boardAs(setup as any, ...JUMA);
    expect(everyString(board).filter(aReadOnFaraji)).toEqual([]);
    expect(board.eachPerson.find((r: any) => r.participantId === 'p-faraji').says).toBe('Faraji Odhiambo has not checked in yet.');
  });

  it('Faraji reads "You have not checked in yet." on his own row, and nothing about anybody else', async () => {
    const board = await boardAs(setup as any, ...FARAJI_READS);
    expect(board.contribution.map((r: any) => r.participantId)).toEqual(['p-faraji']);
    expect(board.contribution[0].reason).toBe('You have not checked in yet.');
    expect(board.contribution[0].nothingCheckable).toBe(false);
    expect(everyString(board).filter((s) => /checkable|can be checked/i.test(s) && /Baraka|Rukia/.test(s))).toEqual([]);
  });

  it('somebody who has checked in and said nothing checkable still reads as that', async () => {
    const board = await boardAs(setup as any, ...AMINA);
    const baraka = board.contribution.find((r: any) => r.participantId === 'p-baraka');
    expect(baraka.nothingCheckable).toBe(true);
    expect(baraka.reason).toBe('Nothing Baraka Otieno has said so far is checkable, because nobody else can check it yet. A number, a date or a document for what moved would change that.');
  });

  it('on an evaluation check-in, the manager reads that the person reviewed has not checked in yet', async () => {
    const board = await boardAs({ ...setup, scenario: 'PIP' as any } as any, ...AMINA);
    expect(board.eachPerson.find((r: any) => r.participantId === 'p-faraji').says).toBe('Faraji Odhiambo has not checked in yet.');
    expect(everyString(board).filter(aReadOnFaraji)).toEqual([]);
  });
});


/*
 * ONLY WHERE NOTHING IN THE WHOLE RECORD CAN BE CHECKED (Hafsah, 2 November 2026: silence is never a finding). Baraka's first check-in
 * named a number and a date, and his second said only that things were fine. Proof from any check-in counts, so no reader is told that
 * nothing he said can be checked; with nothing checkable in either, the lead still reads the prototype's line.
 */
describe('"Nothing checkable" only where nothing in the person\'s whole record can be checked', () => {
  const twoRounds = (firstIsCheckable: boolean) => ({
    ...setup,
    checkIns: [
      answered('p-rukia', 1), answered('p-rukia', 2),
      firstIsCheckable ? answered('p-baraka', 1) : { ...answered('p-baraka', 1), specificityLevel: 'managed', specificityDimensions: NONE_OF_FIVE },
      { ...answered('p-baraka', 2), specificityLevel: 'managed', specificityDimensions: NONE_OF_FIVE },
    ],
    dependencies: [],
  });

  it.each([
    ['Amina, the lead', AMINA],
    ['the admin who set it up', SETUP_ADMIN],
    ['Juma, an admin who only reads', JUMA],
  ])('%s reads no "Nothing ... can be checked yet" beside Baraka when his first check-in could be checked', async (_who, reader) => {
    const board = await boardAs(twoRounds(true) as any, ...(reader as readonly [string, string]));
    const row = board.eachPerson.find((r: any) => r.participantId === 'p-baraka');
    expect(row.reason).not.toBe('nothing checkable');
    expect(everyString(board).filter((s) => /Baraka/.test(s) && /said this round can be checked yet/.test(s))).toEqual([]);
  });

  it('Amina reads the prototype\'s line, with the two check-ins in a row, when nothing in either can be checked', async () => {
    const board = await boardAs(twoRounds(false) as any, ...AMINA);
    const row = board.eachPerson.find((r: any) => r.participantId === 'p-baraka');
    expect(row.reason).toBe('nothing checkable');
    expect(row.says).toBe('Nothing Baraka Otieno said this round can be checked yet. This is the second week in a row. A number, a date or a document for what moved would change that.');
  });
});
