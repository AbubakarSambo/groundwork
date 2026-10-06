import { theRanOutOfTimeSubject, theSharedPictureSubject, howManyCheckedIn } from './the-leads-subjects-carry-the-facts';
import { theFactsOfTheWeek } from '../email/the-leads-weekly-letter';
import { EmailService } from '../email/email.service';

/**
 * THE OTHER SUBJECTS A LEAD READS (decision 109 item 3), AS WAIRIMU AND AS OMAR, WHO IS IN THE SAME CHECK-IN, READ THEM.
 *
 * "Sales team, Q4" has six people. Five checked in; Omar had not. The check-in ran out of time. Everybody is told the count. Only Wairimu, who runs it,
 * is told who had not checked in. Neither subject has a comparison or a judgement of anybody.
 */
const stood = { ofHowMany: 6, answered: 5, notYet: ['Omar'] };
const COMPARISON = /ahead|behind|best|worst|strong|weak|carrying|struggl|falling|slow|better|worse|rank|failed|failure|let .* down/i;

describe('"ran out of time"', () => {
  it('tells Wairimu who had not checked in', () => {
    expect(theRanOutOfTimeSubject('Sales team, Q4', stood, true)).toBe('"Sales team, Q4" ran out of time, and Omar had not checked in');
  });
  it('tells Omar and everybody else the count, and no name', () => {
    expect(theRanOutOfTimeSubject('Sales team, Q4', stood, false)).toBe('"Sales team, Q4" ran out of time, and five of six people checked in');
    expect(theRanOutOfTimeSubject('Sales team, Q4', stood, false)).not.toMatch(/Omar/);
  });
  it('with four people not in, she is told the count rather than a list of names', () => {
    expect(theRanOutOfTimeSubject('Sales team, Q4', { ofHowMany: 9, answered: 5, notYet: ['A', 'B', 'C', 'D'] }, true)).toBe('"Sales team, Q4" ran out of time, and five of nine people checked in');
  });
  it('says nothing about a count it does not have', () => {
    expect(theRanOutOfTimeSubject('Sales team, Q4', null, true)).toBe('"Sales team, Q4" ran out of time');
    expect(theRanOutOfTimeSubject('Sales team, Q4', { ofHowMany: 6, answered: 0, notYet: ['Omar'] }, true)).toBe('"Sales team, Q4" ran out of time, and nobody checked in');
  });
  it('no subject compares or judges', () => {
    for (const lead of [true, false]) expect(theRanOutOfTimeSubject('Sales team, Q4', stood, lead)).not.toMatch(COMPARISON);
  });
});

describe('"the shared picture is ready"', () => {
  const week: any = { groundId: 'g', label: 'Sales team, Q4', ofHowMany: 6, checkedIn: 6, notYet: [], saidWhatNext: 3, done: 4, waiting: 2, closedBy: [{ name: 'Abigail', count: 4 }], waitingOn: [{ name: 'James', count: 2 }] };
  it('tells Wairimu what was done and what waits, with names as facts, then that it is ready', () => {
    expect(theSharedPictureSubject('Sales team, Q4', stood, theFactsOfTheWeek(week))).toBe('Four things people said they would do were done, all by Abigail; two handoffs are still waiting, both on James, and the shared picture for "Sales team, Q4" is ready');
  });
  it('tells everybody else that all of them checked in, with no name', () => {
    expect(theSharedPictureSubject('Sales team, Q4', { ofHowMany: 6, answered: 6, notYet: [] }, null)).toBe('All six people on "Sales team, Q4" have checked in, and the shared picture is ready');
  });
  it('is the old plain subject when it knows nothing', () => {
    expect(theSharedPictureSubject('Sales team, Q4', null, null)).toBe('The shared picture for Sales team, Q4 is ready');
    expect(howManyCheckedIn({ ofHowMany: 0, answered: 0, notYet: [] })).toBeNull();
  });
  it('no subject compares or judges', () => {
    expect(theSharedPictureSubject('Sales team, Q4', stood, theFactsOfTheWeek(week))).not.toMatch(COMPARISON);
  });
});

describe('what the mail carries', () => {
  const door = () => {
    const sent: any[] = [];
    const email: any = new EmailService({ get: () => undefined } as any, {} as any, {} as any);
    email.sendEmail = jest.fn(async (o: any) => { sent.push(o); });
    email.whoSeesWhatYouSay = jest.fn(async () => 'Everybody in it reads what each person said.');
    return { email, sent };
  };
  it('the stalled notice and the report-ready notice use the subject they are given, and the body is unchanged', async () => {
    const w = door();
    await w.email.sendStalledNotification('wairimu@x.test', 'Sales team, Q4', 'https://app.test/grounds/g', '"Sales team, Q4" ran out of time, and Omar had not checked in');
    await w.email.sendReportReady('omar@x.test', 'Sales team, Q4', 'https://app.test/r', undefined, undefined, 'All six people on "Sales team, Q4" have checked in, and the shared picture is ready');
    expect(w.sent.map((m) => m.subject)).toEqual(['"Sales team, Q4" ran out of time, and Omar had not checked in', 'All six people on "Sales team, Q4" have checked in, and the shared picture is ready']);
    expect(w.sent[0].html).toContain('has passed the time it was given');
    expect(w.sent[1].html).toContain('has now checked in, so the shared picture is open to all of you');
  });
  it('and the old subjects are kept when none is given', async () => {
    const w = door();
    await w.email.sendStalledNotification('a@x.test', 'Sales team, Q4', 'https://app.test/g');
    await w.email.sendReportReady('a@x.test', 'Sales team, Q4', 'https://app.test/r');
    expect(w.sent.map((m) => m.subject)).toEqual(['"Sales team, Q4" ran out of time', 'The shared picture for Sales team, Q4 is ready']);
  });
});
