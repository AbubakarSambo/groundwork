import { boardAs, answered, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';
import { onlyRecordsTheLinesSay } from './the-kind-of-work';

/**
 * ITEM 21, THE ENGINEERING BOARD: A WORD THAT ONLY POINTS AT SOMETHING ELSE IS NOT A TASK.
 *
 * "Rebuilding the payments integration" (local test database, c6e70dcb): Ifeoma's "releases and tasks"
 * held a row named "it" (from "I expect it to take about five weeks.") and one named "that migration"
 * (from "The focus is purely on that migration."). Neither names anything anybody could find again.
 */
const item = (id: string, name: string, owner: string) => ({
  id, groundId: 'g-1', kind: 'task', name, stage: null, ownerParticipantId: owner, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: null, createdAt: new Date('2026-09-16T17:00:00Z'), updatedAt: new Date('2026-09-16T17:00:00Z'),
});
const setup = {
  kindOfWork: 'engineering release',
  checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)],
  items: [item('w-1', 'it', 'p-rukia'), item('w-2', 'that migration', 'p-rukia'), item('w-3', 'Payment integration', 'p-rukia'),
    /* The support desk board's tickets: "which tickets" and "30 of those". */
    item('w-4', 'which tickets', 'p-rukia'), item('w-5', '30 of those', 'p-rukia'),
    /* The loans board: "something I don't have". */
    item('w-6', "something I don't have", 'p-rukia')],
};
const names = async (reader: readonly [string, string]) => ((await boardAs(setup as any, ...reader)).workRecords ?? []).flatMap((s: any) => (s.rows ?? []).map((r: any) => r.name));

describe('the task list, as each reader reads it', () => {
  it.each([['Amina, who runs it', AMINA], ['Rukia, whose tasks they are', RUKIA], ['Juma, an admin', JUMA]])('%s reads only rows that name something', async (_w, reader) => {
    expect(await names(reader as readonly [string, string])).toEqual(['Payment integration']);
  });
});

describe('when a check-in is read for its records', () => {
  it('a name that only points elsewhere is not kept', () => {
    const lines = [{ id: 'l1', text: 'I expect it to take about five weeks. The focus is purely on that migration and the payment integration.', participantId: 'p-1' }];
    const kept = onlyRecordsTheLinesSay('engineering release', [
      { kind: 'task', name: 'it', lineId: 'l1' }, { kind: 'task', name: 'that migration', lineId: 'l1' }, { kind: 'task', name: 'payment integration', lineId: 'l1' },
    ] as any, lines, null);
    expect(kept.map((k) => k.name)).toEqual(['payment integration']);
  });
});
