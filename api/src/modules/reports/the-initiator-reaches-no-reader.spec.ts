import { ReportsService } from './reports.service';

/**
 * REQUEST 31: "THE INITIATOR" NEVER REACHES A READER.
 *
 * Reports are stored with labels. The screens' U.5 review read a sharedPicture as "The initiator
 * reports 18 sales". Served through the report's own door, the one every report, board and check-in
 * read uses, the lead reads "you", and everybody else reads the lead's name, or plain words where the
 * check-in was shared without names. This serves the same stored text to each reader.
 */
describe('"the initiator" reaches no reader', () => {
  const svc = Object.create(ReportsService.prototype) as any;
  svc.logger = { log() {}, warn() {} };
  const participants = [
    { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
    { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
    { id: 'p-juma', userId: 'u-juma', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Juma', lastName: 'Otieno' } },
  ];
  const stored = 'The initiator reports 18 sales this quarter. Participant B agrees with the initiator.';
  const read = (viewer: string | null, isLead: boolean, sharedAs: string | null = null, peers = true) =>
    svc.theReportAsItWasShared({ scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: peers, participants, report: { sharedPicture: stored, sharedAs } }, viewer, isLead).sharedPicture as string;

  it('the lead reads "you"', () => {
    expect(read('p-lead', true)).toBe('You report 18 sales this quarter. Juma Otieno agrees with you.');
  });

  it('a participant reads the lead\'s name', () => {
    expect(read('p-miriam', false)).toBe('Wairimu Kamau reports 18 sales this quarter. Juma Otieno agrees with Wairimu.');
  });

  it('an admin who does not run it reads the lead\'s name', () => {
    expect(read(null, false)).toBe('Wairimu Kamau reports 18 sales this quarter. Juma Otieno agrees with Wairimu.');
  });

  it('shared without names, a participant reads plain words, with a capital at the start of a sentence', () => {
    expect(read('p-miriam', false, 'ANONYMOUS')).toBe('Somebody in this check-in reports 18 sales this quarter. A colleague agrees with somebody in this check-in.');
  });

  it('for every reader and every way of sharing, no label is left', () => {
    for (const sharedAs of [null, 'NAMED', 'ANONYMOUS']) for (const peers of [true, false]) {
      for (const [viewer, isLead] of [['p-lead', true], ['p-miriam', false], ['p-juma', false], [null, false], [null, true]] as const) {
        const text = read(viewer, isLead, sharedAs, peers);
        expect(text).not.toMatch(/initiator|Participant [A-Z]/i);
        for (const sentence of text.split(/(?<=\.)\s+/)) expect(sentence).toMatch(/^[A-Z]/);
      }
    }
  });
});
