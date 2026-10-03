import { ReportsService } from './reports.service';
import { theVerbAgreesWithYou } from './party-labels';

/**
 * REQUEST 33: THE SWAP TO "YOU" LEAVES THE VERB AGREEING, IN A PARTICIPANT'S OWN REPORT.
 *
 * Read live by Miriam: "Wairimu Kamau's plan counts on 4 sales from you, but you forecasts that only
 * 3 of them are realistic this quarter." and "You forecasts 3 sales in total". Served here through
 * the report's own door, to Miriam and to the others, from the text as it is stored.
 */
describe('"you" takes its verb in your own report', () => {
  const svc = Object.create(ReportsService.prototype) as any;
  svc.logger = { log() {}, warn() {} };
  const participants = [
    { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true, user: { firstName: 'Wairimu', lastName: 'Kamau' } },
    { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false, user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
  ];
  const stored = "The initiator's plan counts on 4 sales from Participant A, but Participant A forecasts that only 3 of them are realistic this quarter. Participant A forecasts 3 sales in total, and Participant A identifies Westgate Deli as the next one.";
  const read = (viewer: string | null, isLead: boolean) =>
    svc.theReportAsItWasShared({ scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, participants, report: { sharedPicture: stored } }, viewer, isLead).sharedPicture as string;

  it('Miriam reads her own verbs in the second person', () => {
    expect(read('p-miriam', false)).toBe(
      "Wairimu Kamau's plan counts on 4 sales from you, but you forecast that only 3 of them are realistic this quarter. You forecast 3 sales in total, and you identify Westgate Deli as the next one.",
    );
  });

  /* Run-25: a name is said once in a sentence about that person, so the joined clause loses its second "Miriam". */
  it('the lead reads Miriam\'s name and her verbs as they were', () => {
    expect(read('p-lead', true)).toBe(
      'Your plan counts on 4 sales from Miriam Wanjiku, but Miriam forecasts that only 3 of them are realistic this quarter. Miriam forecasts 3 sales in total, and identifies Westgate Deli as the next one.',
    );
  });

  it('a verb ending in -es or -ies loses the right letters', () => {
    expect(theVerbAgreesWithYou('You finishes the rota. You identifies the gap. You relies on Juma. You focuses on Westgate.'))
      .toBe('You finish the rota. You identify the gap. You rely on Juma. You focus on Westgate.');
  });

  it('never where "you" is the object of a preposition, and never inside their own words', () => {
    expect(theVerbAgreesWithYou('The plan for you counts on four sales.')).toBe('The plan for you counts on four sales.');
    expect(theVerbAgreesWithYou('You said "Juma forecasts three".')).toBe('You said "Juma forecasts three".');
  });
});
