import { whereTheTimeWent } from './the-switchboards-own-sections';

/* Release 8, hand-written: Daniel's commitments over four check-ins on a plan to get back on track, read by Wairimu, who runs it. */
const c = (id: string, text: string, session: number, pid = 'p-daniel') => ({ id, participantId: pid, text, whenSaid: null, explicit: true, status: 'OPEN', source: 'check-in', statedInSession: session, saidAgainIn: [], settledBy: null, settledAt: null, saidWordForWord: true, whenSaidWordForWord: false, createdAt: '2026-10-01' });
const reader: any = { commitmentMayBeRead: () => true, nameOf: (pid: string) => (pid === 'p-daniel' ? 'Daniel' : 'Brian'), aColleague: () => 'A colleague', meId: 'p-wairimu', isLead: true };

describe('where the time went', () => {
  it('says each person\'s commitments by the piece of work they name, biggest first, never hours', () => {
    const out = whereTheTimeWent([
      c('1', 'Call Kito Foods about the deposit', 1), c('2', 'Send Kito Foods the revised quote', 2), c('3', 'Visit Kito Foods on Friday', 3),
      c('4', 'Book a tasting at Westgate Deli', 3), c('5', 'Visit Westgate Deli again', 4), c('6', 'Tidy my notes', 4),
      c('7', 'Call Green Mart', 2, 'p-brian'),
    ], ['Kito Foods', 'Westgate Deli', 'Green Mart'], reader);
    expect(out).toEqual([{ participantId: 'p-daniel', who: 'Daniel', says: 'Of Daniel’s six commitments over four check-ins, three were about Kito Foods, two about Westgate Deli and one about other work.' }]);
    expect(JSON.stringify(out)).not.toMatch(/hour/i);
  });
});
