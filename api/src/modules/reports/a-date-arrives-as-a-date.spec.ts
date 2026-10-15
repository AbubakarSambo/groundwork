import { ReportsService } from './reports.service';

/**
 * REQUEST 53: A DATE GOES THROUGH THE NAMING DOOR AS A DATE, NOT AS {}.
 *
 * Walked live: the session report's "last updated" line was built from `updatedAt`, and the client
 * received {}. The walks inside the door rebuilt every object from its entries, and a Date has none.
 * Served here to each reader, named and shared without names, and read as JSON, as the client gets it.
 */
describe('a date arrives as a date', () => {
  const svc = Object.create(ReportsService.prototype) as any;
  svc.logger = { log() {}, warn() {} };
  const participants = [
    { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
    { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
  ];
  const updatedAt = new Date('2026-09-27T09:30:00Z');
  const releasedAt = new Date('2026-09-26T16:00:00Z');

  for (const sharedAs of [null, 'NAMED', 'ANONYMOUS']) {
    for (const [who, viewer, isLead] of [['the lead', 'p-lead', true], ['a participant', 'p-miriam', false], ['an admin', null, false]] as const) {
      it(`${who}, shared ${sharedAs ?? 'not yet'}`, () => {
        const served = svc.theReportAsItWasShared(
          { scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, participants, report: { sharedPicture: 'The initiator reports 18 sales.', sharedAs, updatedAt, releasedAt, rounds: [{ closedAt: releasedAt }] } },
          viewer, isLead,
        );
        const asTheClientGetsIt = JSON.parse(JSON.stringify(served));
        expect(asTheClientGetsIt.updatedAt).toBe('2026-09-27T09:30:00.000Z');
        expect(asTheClientGetsIt.releasedAt).toBe('2026-09-26T16:00:00.000Z');
        expect(asTheClientGetsIt.rounds[0].closedAt).toBe('2026-09-26T16:00:00.000Z');
      });
    }
  }
});
