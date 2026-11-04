import { clearTheWaitsAnEventEnded, theEventAWaitIsFor, aLineSaysTheEventHappened } from './a-wait-said-done-is-cleared';

/**
 * Muchemi & Co. (test), messages test, fourth run: the waits and lines as the record holds them. Wanjiru's waits in "Fee notes" (and her
 * own in "Litigation team daily") are cleared by what Brian and David said in "Litigation team daily".
 */
const FEES = 'g-fees';
const LIT = 'g-lit';
const waits = [
  { id: 'w-reply', groundId: FEES, fromParticipantId: 'fees-wanjiru', onParticipantId: 'fees-brian', onLabel: null, what: 'the reply to be filed in Kasarani Foods v. Tumaini Traders', createdAt: new Date('2026-10-12T08:33:59.996Z'), sourceCheckInId: 'c-wanjiru-fees-1', status: 'WAITING', clearedAt: null as Date | null },
  { id: 'w-hearing', groundId: FEES, fromParticipantId: 'fees-wanjiru', onParticipantId: 'fees-brian', onLabel: null, what: 'the hearing date to be set for the third Kasarani Foods fee note', createdAt: new Date('2026-10-12T08:33:59.996Z'), sourceCheckInId: 'c-wanjiru-fees-1', status: 'WAITING', clearedAt: null as Date | null },
  { id: 'w-confirmation', groundId: LIT, fromParticipantId: 'lit-wanjiru', onParticipantId: null, onLabel: 'the court or our filing agent', what: 'confirmation of the Kasarani Foods filing', createdAt: new Date('2026-10-12T08:36:49.811Z'), sourceCheckInId: 'c-wanjiru-lit-1', status: 'WAITING', clearedAt: null as Date | null },
  { id: 'w-proof', groundId: FEES, fromParticipantId: 'fees-aisha', onParticipantId: null, onLabel: 'Mr. Baraka', what: 'proof of payment', createdAt: new Date('2026-10-12T08:41:28.189Z'), sourceCheckInId: 'c-aisha-fees-1', status: 'BLOCKING', clearedAt: null as Date | null },
  { id: 'w-final', groundId: LIT, fromParticipantId: 'lit-aisha', onParticipantId: null, onLabel: "the client's HR manager", what: 'the final witness statement', createdAt: new Date('2026-10-13T11:04:33.266Z'), sourceCheckInId: 'c-aisha-lit-2', status: 'WAITING', clearedAt: null as Date | null },
];
const lines = [
  { id: 'l1', participantId: 'lit-wanjiru', checkInId: 'c-wanjiru-lit-1', type: 'PROGRESS', text: 'The Kasarani Foods reply draft is complete and ready for filing.', createdAt: new Date('2026-10-12T08:36:49.796Z'), groundId: LIT },
  { id: 'l2', participantId: 'lit-brian', checkInId: 'c-brian-lit-2', type: 'PROGRESS', text: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.', createdAt: new Date('2026-10-13T11:03:01.728Z'), groundId: LIT },
  { id: 'l3', participantId: 'lit-aisha', checkInId: 'c-aisha-lit-2', type: 'PROGRESS', text: "I chased the client's HR manager on Monday, and they've sent over two of the three witness statements today.", createdAt: new Date('2026-10-13T11:04:33.253Z'), groundId: LIT },
  { id: 'l4', participantId: 'lit-david', checkInId: 'c-david-lit-2', type: 'PROGRESS', text: 'The mention date for Kasarani Foods versus Tumaini Traders is set for November 3rd.', createdAt: new Date('2026-10-14T11:04:58.421Z'), groundId: LIT },
  { id: 'l5', participantId: 'lit-david', checkInId: 'c-david-lit-2', type: 'PROGRESS', text: 'In Kasarani Foods versus Tumaini Traders, the hearing date is set for November 12th.', createdAt: new Date('2026-10-14T11:04:58.421Z'), groundId: LIT },
];

function theRecord(asOf: Date) {
  const updates: { id: string; clearedAt: Date }[] = [];
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ({ organizationId: 'org-muchemi' })),
      findMany: jest.fn(async () => [{ id: FEES, scenario: 'COLLECTIONS' }, { id: LIT, scenario: 'PULSE_CHECK' }, { id: 'g-review', scenario: 'PIP' }]),
    },
    groundDependency: {
      findMany: jest.fn(async ({ where }: any) => waits.filter((w) => where.groundId.in.includes(w.groundId) && !updates.some((u) => u.id === w.id))),
      updateMany: jest.fn(async ({ where, data }: any) => { updates.push({ id: where.id, clearedAt: data.clearedAt }); return { count: 1 }; }),
    },
    recordEntry: { findMany: jest.fn(async ({ where }: any) => lines.filter((l) => where.participant.groundId.in.includes(l.groundId) && l.createdAt <= asOf)) },
  };
  return { prisma, updates };
}

describe("Wanjiru's waits for the filing and the hearing date", () => {
  it('on Tuesday evening the reply is filed: her two waits for it are over, on the day Brian said it; the hearing date still waits', async () => {
    const { prisma, updates } = theRecord(new Date('2026-10-13T18:00:00Z'));
    expect(await clearTheWaitsAnEventEnded(prisma, LIT)).toBe(2);
    expect(updates.map((u) => [u.id, u.clearedAt.toISOString()])).toEqual([
      ['w-reply', '2026-10-13T11:03:01.728Z'],
      ['w-confirmation', '2026-10-13T11:03:01.728Z'],
    ]);
  });
  it('on Wednesday, after David said the hearing date is set, the third wait is over too; proof of payment and the last statement still wait', async () => {
    const { prisma, updates } = theRecord(new Date('2026-10-14T18:00:00Z'));
    expect(await clearTheWaitsAnEventEnded(prisma, LIT)).toBe(3);
    expect(updates.find((u) => u.id === 'w-hearing')?.clearedAt.toISOString()).toBe('2026-10-14T11:04:58.421Z');
    expect(updates.map((u) => u.id)).not.toContain('w-proof');
    expect(updates.map((u) => u.id)).not.toContain('w-final');
  });
  it('the mention date is not the hearing date, and "ready for filing" is not filed', () => {
    const hearing = theEventAWaitIsFor('the hearing date to be set for the third Kasarani Foods fee note')!;
    expect(aLineSaysTheEventHappened({ text: 'The mention date for Kasarani Foods versus Tumaini Traders is set for November 3rd.' }, hearing)).toBe(false);
    const reply = theEventAWaitIsFor('the reply to be filed in Kasarani Foods v. Tumaini Traders')!;
    expect(aLineSaysTheEventHappened({ text: 'The Kasarani Foods reply draft is complete and ready for filing.' }, reply)).toBe(false);
    expect(aLineSaysTheEventHappened({ text: 'The reply in Kasarani Foods v. Tumaini Traders has not been filed yet.' }, reply)).toBe(false);
    expect(aLineSaysTheEventHappened({ text: 'The reply in Upendo Schools v. Tumaini Traders was filed today.' }, reply)).toBe(false);
  });
  it('a wait that is not for an event is not read here', () => {
    expect(theEventAWaitIsFor('proof of payment')).toBeNull();
    expect(theEventAWaitIsFor('the final witness statement')).toBeNull();
  });
});
