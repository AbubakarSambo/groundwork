import { myWorkFrom } from './my-work';
import { aWaitSomebodyElseChases } from './a-wait-somebody-else-chases';

/**
 * NJERI IS NOT TOLD TO CHANGE HOW SHE HANDLES BLOCKERS THAT WERE OTHER PEOPLE'S TO CHASE (engine test, Muchemi & Co, "Fee notes").
 *
 * Monday 12 October. Njeri: "For FN-006, FN-007, and FN-009, I haven't seen anything in the bank. For FN-005, I haven't been told the
 * reply is filed yet." Aisha follows up FN-006, FN-007 and FN-009 with the clients; Brian drafts the Kasarani Foods reply and chases
 * FN-004. Njeri's own My work read "You raised 5 blockers and said what you had tried first on 0 of them." and "Try one thing before
 * you raise a blocker, and say what you tried." Read as Njeri is served her page.
 */
const at = (s: string) => new Date(s);
const wait = (id: string, what: string, onLabel: string | null) => ({ id, groundId: 'g-fees', fromParticipantId: 'p-njeri', onParticipantId: null, onLabel, what, status: 'WAITING', createdAt: at('2026-10-12T07:04:00Z'), triedSaid: null, clearedAt: null });
const NJERIS_WAITS = [
  wait('d5', 'confirmation that the reply is filed for FN-005', 'the relevant team'),
  wait('d6', 'payment for FN-006', 'Baraka Hardware'),
  wait('d7', 'payment for FN-007', 'Jamii Clinics'),
  wait('d9', 'payment for FN-009', 'Upendo Schools'),
];
const THE_OTHERS = [
  'Jamii Clinics to pay FN-007', 'Baraka Hardware to send the slip for FN-006', 'Upendo Schools to answer the reminder for FN-009',
  'a reply to be filed in Kasarani Foods v. Tumaini Traders', 'I will call the Jamii Clinics finance office by Thursday, October 22nd.',
];
const record = (othersChase: string[]): any => ({
  reader: 'self', person: { participantId: 'p-njeri', name: 'Njeri Wambui', firstName: 'Njeri' }, leadFirst: 'Wanjiru', kindOfWork: null,
  items: [], commitments: [], waitsOnThem: [], raised: NJERIS_WAITS, othersChase, credits: [], checkIns: [{ id: 'c1', sessionNumber: 1, status: 'COMPLETED', availableFrom: at('2026-10-12T05:00:00Z'), createdAt: at('2026-10-12T05:00:00Z'), completedAt: at('2026-10-12T07:04:00Z'), specificityLevel: null }],
  ownLines: [], patterns: [], teamCoaching: [], helpWith: null, target: null, now: at('2026-10-12T18:30:00Z'), timeZone: 'Africa/Nairobi',
});
const blockers = (page: any) => page.performing.behaviours.find((b: any) => b.name === 'Handling blockers');

describe("Njeri's own My work, on Monday 12 October", () => {
  it('does not count the waits Aisha and Brian chase, so it does not tell her to try one thing first', () => {
    const page: any = myWorkFrom(record(THE_OTHERS), 'Fee notes');
    expect(blockers(page).verdict).toBe('Not enough yet');
    expect(JSON.stringify(page)).not.toContain('Try one thing before you raise a blocker');
  });
  it('with nobody else chasing them, the same waits are read as before', () => {
    const page: any = myWorkFrom(record([]), 'Fee notes');
    expect(blockers(page).happened).toBe('You raised 4 blockers and said what you had tried first on 0 of them.');
  });
  it('a reference read as itself: FN-007 is not FN-004', () => {
    expect(aWaitSomebodyElseChases('payment for FN-007', ['Kasarani Foods to pay FN-004'])).toBe(false);
    expect(aWaitSomebodyElseChases('payment for FN-007', ['Jamii Clinics to pay FN-007'])).toBe(true);
  });
});
