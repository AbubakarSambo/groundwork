import { TheWeeklyReportService } from './the-weekly-report.service';
import { withTheCollectionsReadings, theCollectionsWeekFor } from './the-collections-readings-for-a-report';
import { theCollectionsWorld, thePrismaFor } from '../board/__fixtures__/the-collections-record-for-specs';
import { MUCHEMI_NOW, MUCHEMI_FEE_NOTES } from '../grounds/__fixtures__/muchemi-and-co';
import { LENDER_LOANS } from '../grounds/__fixtures__/a-small-lender';

/**
 * THE COLLECTIONS REPORTS, AS EACH PERSON READS THEM (Release 2, pull request 2 of 3; release plan, Part 2, full shape; weekly
 * numbers: collected this week, due, overdue, paid with proof). From the hand-written Muchemi & Co (test) and small lender (test).
 * Wanjiru and Halima, who run their check-ins, read the team's report on every bill; each other person reads their own report,
 * about their own bills only. With Release 2 off, a report is served exactly as it was.
 */
const THE_REPORT = { inShort: 'As the report was stored.', sections: [] };
const read = (groundId: string, n: number, userId: string, world = theCollectionsWorld()) =>
  withTheCollectionsReadings(thePrismaFor(world), groundId, n, userId, { ...THE_REPORT }, MUCHEMI_NOW) as Promise<any>;

describe('the team\'s report on the fee notes, to Wanjiru, who runs it', () => {
  it('is in the full shape, read from the bills and what was said in session 3', async () => {
    const r = (await read(MUCHEMI_FEE_NOTES.id, 3, 'u-wanjiru')).collectionsReport;
    expect(r.title).toBe('The team’s report on the fee notes, Monday 19 October');
    expect(r.inShort).toEqual([
      '27% of what’s due is paid, on proof. A further KES 120,000 is paid on somebody’s word, with no proof yet. One fee note is behind, but the client is in touch.',
      'Three of the three people due checked in.',
      'Jamii Clinics missed the date they promised to pay by.',
    ]);
    expect(r.whatMoved).toEqual([
      'FN-008 for Nyota Logistics was followed up with a call to the client on Wednesday 14 October.',
      'FN-010 for Baraka Hardware was raised on Friday 16 October.',
    ]);
    expect(r.eachPerson).toEqual([
      { who: 'Brian', says: 'FN-004 is paid. Kasarani Foods still has a fee note waiting for the hearing date, and FN-005 waits for the reply.', mark: 'said' },
      { who: 'Aisha', says: 'Nothing from Jamii Clinics on FN-007. Upendo Schools has not answered about FN-009.', mark: 'said' },
      { who: 'Njeri', says: 'The bank slip for FN-004 came in, KES 250,000 from Kasarani Foods.', mark: 'proven' },
    ]);
    expect(r.seeItDifferently).toEqual(['Nyota Logistics disputes FN-008. Brian said, “The client says the review was billed twice.”']);
    expect(r.cantTell[1]).toBe('Whether FN-006 for Baraka Hardware is paid. Aisha said it is, and nothing filed on it shows it.');
    expect(r.dontKnowYet).toEqual(['No next step is booked for FN-009 for Upendo Schools.', 'No next step is booked for FN-010 for Baraka Hardware.']);
    expect((await read(MUCHEMI_FEE_NOTES.id, 3, 'u-wanjiru')).collectionsOwnReport).toBeUndefined();
  });
});

describe('each person\'s own report, about their own bills only', () => {
  it('Brian reads his own, and nothing of Aisha\'s or the team\'s', async () => {
    const served = await read(MUCHEMI_FEE_NOTES.id, 3, 'u-brian');
    expect(served.collectionsReport).toBeUndefined();
    expect(served.collectionsOwnReport).toEqual({
      title: 'Your report on your fee notes, Monday 19 October',
      inShort: ['Of KES 340,000 due on your fee notes, KES 250,000 is paid with proof.'],
      whatMoved: ['FN-008 for Nyota Logistics was followed up with a call to the client on Wednesday 14 October.'],
      forYouToDo: [
        'Tell accounts the day the reply is filed, by Friday 23 October, for FN-005 for Kasarani Foods.',
        'Send them the engagement letter, by Friday 23 October, for FN-008 for Nyota Logistics.',
      ],
      dontKnowYet: [],
    });
    expect(JSON.stringify(served)).not.toMatch(/Jamii|Upendo|Baraka|Aisha|Njeri/);
  });

  it('Aisha reads hers, with what to do about the promise missed and the payment with no proof', async () => {
    const r = (await read(MUCHEMI_FEE_NOTES.id, 3, 'u-aisha')).collectionsOwnReport;
    expect(r.forYouToDo).toEqual([
      'Add the slip or the message that shows FN-006 for Baraka Hardware is paid.',
      'Call their finance office, by Thursday 22 October, for FN-007 for Jamii Clinics.',
      'Ask the client about FN-007 for Jamii Clinics. They promised to pay by 10 October.',
      'Book the next step for FN-009 for Upendo Schools, with a day.',
      'Book the next step for FN-010 for Baraka Hardware, with a day.',
    ]);
    expect(JSON.stringify(r)).not.toMatch(/Kasarani|Nyota|Brian/);
  });

  it('Njeri, who follows up none, reads that none are hers', async () => {
    const r = (await read(MUCHEMI_FEE_NOTES.id, 3, 'u-njeri')).collectionsOwnReport;
    expect(r.inShort).toEqual(['No fee note that you follow up is on record yet.']);
    expect(JSON.stringify(r)).not.toMatch(/KES|Kasarani|Brian|Aisha/);
  });

  it('on the loans: Halima reads every borrower; Musa and Peter each read only their own loan', async () => {
    const team = (await read(LENDER_LOANS.id, 5, 'u-halima')).collectionsReport;
    expect(team.inShort).toEqual(['33% of what’s due is repaid, on proof. One borrower is behind, but still in touch.', 'Two of the three people due checked in.', 'Peter has not checked in since 21 September.']);
    expect(team.whatMoved).toEqual(['Achieng’s loan was paid on Monday 19 October, and a payment record shows it.', 'Musa promised on Monday 19 October to pay the loan by Friday 23 October.']);
    const musa = (await read(LENDER_LOANS.id, 5, 'u-musa')).collectionsOwnReport;
    expect(musa.inShort).toEqual(['Your repayment of KES 12,000 fell due on 12 October, and it is not paid yet. You promised to pay by Friday 23 October.']);
    expect(musa.whatMoved).toEqual(['You promised on Monday 19 October to pay your loan by Friday 23 October.']);
    expect(JSON.stringify(musa)).not.toMatch(/Peter|Achieng|Halima/);
    const peter = (await read(LENDER_LOANS.id, 5, 'u-peter')).collectionsOwnReport;
    expect(peter.inShort).toEqual(['Your repayment of KES 12,000 fell due on 28 September, and it is not paid yet.']);
    expect(JSON.stringify(peter)).not.toMatch(/Musa|Achieng/);
  });
});

describe('with Release 2 off, every report is served exactly as it was', () => {
  it('for every reader', async () => {
    const world = theCollectionsWorld({ release2On: false });
    for (const [g, u] of [[MUCHEMI_FEE_NOTES.id, 'u-wanjiru'], [MUCHEMI_FEE_NOTES.id, 'u-brian'], [LENDER_LOANS.id, 'u-halima'], [LENDER_LOANS.id, 'u-musa']]) {
      expect(await read(g, 3, u, world)).toEqual(THE_REPORT);
    }
    expect(await theCollectionsWeekFor(thePrismaFor(world), MUCHEMI_FEE_NOTES.id, new Date('2026-10-18T23:00:00Z'), MUCHEMI_NOW)).toBeNull();
  });
});

describe('the weekly report: the week in numbers counted from the bills', () => {
  async function theWeek(groundId: string, userId: string, opts: { release2On?: boolean } = {}) {
    const on = theCollectionsWorld();
    const collections = await theCollectionsWeekFor(thePrismaFor(on), groundId, new Date('2026-10-18T23:00:00.000Z'), MUCHEMI_NOW);
    const prisma: any = thePrismaFor(theCollectionsWorld(opts));
    prisma.weeklyReport = { findFirst: jest.fn(async () => ({ weekStart: '2026-10-19', builtAt: MUCHEMI_NOW, eachPerson: {
      version: 2, cadence: 'WEEKLY', lastAt: MUCHEMI_NOW.toISOString(), periods: [3], eachPerson: [], checkIns: { due: 3, made: 3 }, counts: [], targets: [],
      namedByMoreThanOne: [], settled: [], open: [], cleared: [], forTheLead: [], collections,
    } })) };
    const org = groundId === LENDER_LOANS.id ? 'org-lender-test' : 'org-muchemi-test';
    return new TheWeeklyReportService(prisma).read(groundId, { userId, role: 'MEMBER', organizationId: org }, MUCHEMI_NOW) as Promise<any>;
  }

  it('Wanjiru reads collected this week, due, overdue and paid with proof, and what to do next week', async () => {
    const w = await theWeek(MUCHEMI_FEE_NOTES.id, 'u-wanjiru');
    expect(w.inNumbers.map((f: any) => [f.figure, f.of, f.says])).toEqual([
      ['100%', 'of check-ins made this week', 'All 3 check-ins due this week were made.'],
      ['KES 250,000', 'collected this week', 'KES 250,000 was collected this week, all of it with proof.'],
      ['KES 0', 'due this week', 'Nothing falls due this week.'],
      ['KES 570,000', 'overdue', 'KES 570,000 is overdue, on three fee notes.'],
      ['1 of 2', 'paid with proof', 'One of the two fee notes paid has proof.'],
    ]);
    expect(w.whatThisWeekShows).toEqual([
      'Brian Otieno follows up four fee notes. FN-004 for Kasarani Foods was paid this week, with proof. FN-008 for Nyota Logistics is disputed.',
      'Aisha Kamau follows up four fee notes. FN-007 for Jamii Clinics is past the date the client promised, 10 October. Nobody has heard from the client on FN-009 for Upendo Schools.',
    ]);
    expect(w.whatChanged.moved).toEqual(['FN-004 for Kasarani Foods was paid, with proof, on Tuesday 20 October.']);
    expect(w.saidAndProof).toBe('Two fee notes were said to be paid. One has a slip or a message behind it, and one has none yet.');
    expect(w.forNextWeek.map((t: any) => t.do)).toEqual([
      'Get the slip or the message for FN-006 for Baraka Hardware.',
      'Decide what happens next on FN-007 for Jamii Clinics.',
      'Reach the client on FN-009 for Upendo Schools.',
    ]);
    expect(w.saying).toBeUndefined();
  });

  it('Brian reads the numbers of his own fee notes only, and his own next steps', async () => {
    const w = await theWeek(MUCHEMI_FEE_NOTES.id, 'u-brian');
    expect(w.inNumbers.slice(1).map((f: any) => f.says)).toEqual([
      'KES 250,000 was collected this week, all of it with proof.',
      'Nothing falls due this week.',
      'KES 90,000 is overdue, on one fee note.',
      'The one fee note paid has proof.',
    ]);
    expect(w.whatThisWeekShows).toEqual(['You follow up four fee notes. FN-004 for Kasarani Foods was paid this week, with proof. FN-008 for Nyota Logistics is disputed.']);
    expect(w.forNextWeek.map((t: any) => `${t.do} ${t.why}`)).toEqual([
      'Tell accounts the day the reply is filed. You said you would, by Friday 23 October.',
      'Send them the engagement letter. You said you would, by Friday 23 October.',
    ]);
    expect(JSON.stringify(w)).not.toMatch(/Jamii|Upendo|Baraka|Aisha|570,000/);
  });

  it('Njeri reads no bill of anybody\'s', async () => {
    const w = await theWeek(MUCHEMI_FEE_NOTES.id, 'u-njeri');
    expect(w.inNumbers.slice(1).map((f: any) => f.says)).toEqual(['Nothing was collected this week.', 'Nothing falls due this week.', 'Nothing is overdue.', 'No fee note is paid yet.']);
    expect(JSON.stringify(w)).not.toMatch(/Kasarani|Jamii|Nyota|Upendo|Baraka|FN-/);
  });

  it('Halima reads the cohort; Musa reads his own loan only', async () => {
    const h = await theWeek(LENDER_LOANS.id, 'u-halima');
    expect(h.whatThisWeekShows).toEqual([
      'Achieng Otieno’s loan was paid this week, with proof.',
      'Musa Kibet’s loan is behind, and Musa is in touch.',
      'Peter Kiprop’s loan has had no check-in and no repayment for three weeks.',
    ]);
    const m = await theWeek(LENDER_LOANS.id, 'u-musa');
    expect(m.whatThisWeekShows).toEqual(['Your loan is behind, and you are in touch.']);
    expect(JSON.stringify(m)).not.toMatch(/Peter|Achieng/);
  });

  it('where the switchboard no longer picks the collections board, the week reads as it always did', async () => {
    const w = await theWeek(MUCHEMI_FEE_NOTES.id, 'u-wanjiru', { release2On: false });
    expect(w.inNumbers.map((f: any) => f.of)).not.toContain('collected this week');
    expect(w.whatThisWeekShows).toBeUndefined();
  });
});
