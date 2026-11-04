import { aWaitForTheirCheckIn, aLabelNamesOnlyPeopleHere, removeTheWaitsForACheckIn } from './a-wait-for-a-check-in-is-not-a-wait';

/**
 * A WAIT FOR SOMEBODY'S CHECK-IN IS NOT A WAIT ON THEIR WORK (final real-model check, 21 October 2026, item 1).
 *
 * The rows are the ones the run kept on Drop Access's "Sales team, Q4" from Grace's Tuesday and Wednesday check-ins, and the
 * waits beside them that are real and must stay.
 */
const NAMES = [['Grace', 'Achieng'], ['Kevin', 'Omondi'], ['Mercy', 'Wairimu'], ['Joseph', 'Kariuki'], ['Peter', 'Njoroge']];
const ROWS = [
  { id: '2087ed6a', what: 'check-ins', onParticipantId: 'p-peter', onLabel: null },
  { id: '0b6f03f9', what: 'check-ins', onParticipantId: 'p-kevin', onLabel: null },
  { id: '28fd56ac', what: 'check-ins', onParticipantId: 'p-mercy', onLabel: null },
  { id: 'c7594a71', what: 'check-ins', onParticipantId: 'p-joseph', onLabel: null },
  { id: '7433d45f', what: 'their updates', onParticipantId: null, onLabel: 'Kevin, Mercy, Joseph, and Peter' },
  /* Real waits, which stay. */
  { id: 'd4d634d9', what: 'a decision on the proposal for Lavington Business Park', onParticipantId: null, onLabel: 'Mr. Kiprop' },
  { id: 'e9d4f5e9', what: 'thoughts on the payment plan idea for kiosks', onParticipantId: 'p-grace', onLabel: null },
  { id: '71c780be', what: 'a decision on the quote', onParticipantId: null, onLabel: 'Ali' },
  { id: '2b6308fd', what: 'the M-Pesa message', onParticipantId: null, onLabel: 'Mama Pima' },
  { id: '394ab631', what: 'ideas on how to approach schools that have budget constraints', onParticipantId: null, onLabel: 'the team' },
];

describe('a wait for somebody’s check-in is not a wait on their work', () => {
  it.each(ROWS.slice(0, 5).map((r) => [r.what, r.onLabel ?? r.onParticipantId, r]))('"%s" on %s is not a wait', (_w, _o, r) => {
    expect(aWaitForTheirCheckIn(r as any, NAMES)).toBe(true);
  });

  it.each(ROWS.slice(5).map((r) => [r.what, r.onLabel ?? r.onParticipantId, r]))('"%s" on %s is a wait, and stays', (_w, _o, r) => {
    expect(aWaitForTheirCheckIn(r as any, NAMES)).toBe(false);
  });

  it('"their updates" from somebody outside the check-in is not read as a check-in', () => {
    expect(aWaitForTheirCheckIn({ what: 'their updates', onParticipantId: null, onLabel: 'the client' }, NAMES)).toBe(false);
    expect(aLabelNamesOnlyPeopleHere('Kevin, Mercy, Joseph, and Peter', NAMES)).toBe(true);
    expect(aLabelNamesOnlyPeopleHere('Kevin and the client', NAMES)).toBe(false);
  });

  it('the waits recorded before the rule are removed the next time anybody checks in, and only those', async () => {
    let rows = ROWS.map((r) => ({ ...r, status: 'WAITING' }));
    const removedTraces: string[] = [];
    const prisma: any = {
      groundParticipant: { findMany: async () => NAMES.map(([f, l]) => ({ id: `p-${f.toLowerCase()}`, nameGiven: null, user: { firstName: f, lastName: l } })) },
      groundDependency: {
        findMany: async () => rows,
        deleteMany: async ({ where }: any) => { rows = rows.filter((r) => !where.id.in.includes(r.id)); },
      },
      blockerTrace: { deleteMany: async ({ where }: any) => { removedTraces.push(...where.anchorDependencyId.in); } },
    };
    expect(await removeTheWaitsForACheckIn(prisma, 'g-drop')).toBe(5);
    expect(rows.map((r) => r.id)).toEqual(['d4d634d9', 'e9d4f5e9', '71c780be', '2b6308fd', '394ab631']);
    expect(removedTraces.sort()).toEqual(['0b6f03f9', '2087ed6a', '28fd56ac', '7433d45f', 'c7594a71']);
  });
});
