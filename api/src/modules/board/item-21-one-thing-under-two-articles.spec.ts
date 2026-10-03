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
