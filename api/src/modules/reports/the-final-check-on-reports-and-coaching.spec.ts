import { ReportsService } from './reports.service';
import { everyLineTheFinalCheckPasses } from '../conversation/the-final-check';
import { whatTheRecordHolds } from '../conversation/what-the-record-holds';

/*
 * THE FINAL CHECK ON A REPORT BEFORE IT IS STORED, AND ON COACHING AS IT IS SERVED (quality runs 1 and 2). Without it, every untrue line
 * below is stored or served as written.
 */
const quiet = { warn: () => undefined, log: () => undefined };
const prisma = {
  groundParticipant: { findMany: async () => [
    { id: 'p-h', partyType: 'PARTICIPANT', nameGiven: 'Hassan Mwenda', createdAt: new Date('2026-10-01'), user: { firstName: 'Hassan', lastName: 'Mwenda' } },
    { id: 'p-e', partyType: 'INITIATOR', nameGiven: 'Esther Wanjiru', createdAt: new Date('2026-09-30'), user: { firstName: 'Esther', lastName: 'Wanjiru' } },
  ] },
  groundDependency: { findMany: async () => [] },
  recordEntry: { findMany: async () => [{ participantId: 'p-h', text: 'I restock the shops in Kisii once a month.' }] },
  ground: { findUnique: async () => ({ brief: 'Sell kits in Kisii.', label: 'Kits', participants: [], objectives: [{ name: 'kits a week', target: '8' }] }) },
};

describe('a report before it is stored', () => {
  it('loses an invented count and keeps the true count the code wrote', async () => {
    const stored = {
      sharedPicture: 'Monthly restocking caps you at twelve refills a year across forty shops. 3 of 4 people checked in this week.',
      findings: ['You restock the shops in Kisii once a month.'],
      overTime: { line: '3 of 4 people checked in this week.' },
    };
    const held = await whatTheRecordHolds(prisma, { groundId: 'g-1', value: stored, codeWrote: { overTime: stored.overTime } });
    const r = everyLineTheFinalCheckPasses(stored, held, { log: quiet });
    expect(r.value.sharedPicture).toBe('3 of 4 people checked in this week.');
    expect(r.value.findings).toEqual(['You restock the shops in Kisii once a month.']);
    expect(r.value.overTime).toEqual({ line: '3 of 4 people checked in this week.' });
  });
});

describe('coaching as it is served', () => {
  it('Hassan reads his own true line and not the invented one', () => {
    const svc: any = Object.create(ReportsService.prototype);
    svc.logger = quiet;
    const blame = { people: ['Hassan Mwenda', 'Esther Wanjiru'], lead: 'Esther Wanjiru', waits: [], theirOwnWords: [{ name: 'Hassan Mwenda', text: 'I restock the shops in Kisii once a month.' }], speaker: { name: 'Hassan Mwenda', isTheReader: true } };
    const note = { text: 'Monthly restocking caps you at twelve refills a year across forty shops. You restock the shops in Kisii once a month, so ask Esther Wanjiru what else would help.' };
    const served = svc.readAsItWillBeRead(note, 'g-1', 'the coaching note', ['I restock the shops in Kisii once a month.'], blame);
    expect(served.text).toBe('You restock the shops in Kisii once a month, so ask Esther Wanjiru what else would help.');
  });
});
