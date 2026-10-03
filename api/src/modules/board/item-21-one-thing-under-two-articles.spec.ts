import { boardAs, answered, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE LAW FIRM MATTER BOARD: ONE THING UNDER TWO ARTICLES IS ONE RECORD.
 *
 * "What we think we signed up to" (local test database, 595d8fa6): Adaeze's deadlines held "a four-hour
 * acknowledgement" and "the four-hour acknowledgement" as two rows, both Frank's.
 */
const item = (id: string, name: string, owner: string, at: string) => ({
  id, groundId: 'g-1', kind: 'deadline', name, stage: null, ownerParticipantId: owner, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date(at), updatedAt: new Date(at),
});
const setup = {
  kindOfWork: 'a law firm matter',
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  items: [item('w-1', 'a four-hour acknowledgement', 'p-rukia', '2026-09-16T17:00:00Z'), item('w-2', 'the four-hour acknowledgement', 'p-rukia', '2026-09-16T18:00:00Z'), item('w-3', 'the contract start date', 'p-rukia', '2026-09-16T19:00:00Z')],
};
const names = async (reader: readonly [string, string]) => ((await boardAs(setup as any, ...reader)).workRecords ?? []).flatMap((s: any) => (s.rows ?? []).map((r: any) => r.name));

describe('the deadlines, as each reader reads them', () => {
  it.each([['Amina, who runs it', AMINA], ['Rukia, whose they are', RUKIA], ['Juma, an admin', JUMA]])('%s reads the acknowledgement once', async (_w, reader) => {
    expect(await names(reader as readonly [string, string])).toEqual(['a four-hour acknowledgement', 'the contract start date']);
  });
});

describe('two people\'s records under the same name', () => {
  /* The loans board: Chinedu's "the tricycle" and Yakubu's "a tricycle" are two loans, and both are served. */
  const loans = {
    kindOfWork: 'asset loans',
    checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
    items: [
      { ...item('l-1', 'the tricycle', 'p-rukia', '2026-09-16T17:00:00Z'), kind: 'loan' },
      { ...item('l-2', 'a tricycle', 'p-baraka', '2026-09-16T18:00:00Z'), kind: 'loan' },
    ],
  };
  it.each([['Amina, who runs it', AMINA], ['Juma, an admin', JUMA]])('%s reads both', async (_w, reader) => {
    const n = ((await boardAs(loans as any, ...(reader as readonly [string, string]))).workRecords ?? []).flatMap((s: any) => (s.rows ?? []).map((r: any) => r.name));
    expect(n).toEqual(['the tricycle', 'a tricycle']);
  });
});

describe('a theme said with "to" before it', () => {
  /* The where-next board (52d4fd15): Omar's themes held "improve our customer retention" and "to improve our customer retention". */
  const themes = {
    kindOfWork: 'MarketView where next',
    checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
    items: [
      { ...item('t-1', 'improve our customer retention', 'p-rukia', '2026-09-16T17:00:00Z'), kind: 'priority' },
      { ...item('t-2', 'to improve our customer retention', 'p-baraka', '2026-09-16T18:00:00Z'), kind: 'priority' },
    ],
  };
  it.each([['Amina, who runs it', AMINA], ['Juma, an admin', JUMA]])('%s reads it once', async (_w, reader) => {
    const n = ((await boardAs(themes as any, ...(reader as readonly [string, string]))).workRecords ?? []).flatMap((s: any) => (s.rows ?? []).map((r: any) => r.name));
    expect(n).toEqual(['improve our customer retention']);
  });
});
