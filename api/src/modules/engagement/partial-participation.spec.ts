import { ReportsListener } from '../reports/reports.listener';
import { EmailService } from '../email/email.service';
import { thePartialPicture } from './a-partial-picture-said-honestly';

/**
 * JOURNEY 4: THREE OF FIVE HAVE ANSWERED (decision 109; spec section 36), AS WAIRIMU READS IT.
 *
 * Wairimu leads "Kenya launch", five people can answer. Abigail, James and Lucy have checked in; Omar and Vera have not. When James finishes, she
 * is told how many are in and who, that it is not the whole team's view, and that nothing is concluded from it. When the last one is in, the
 * message is the ordinary one that says everybody is. The people in the check-in are not sent this, and nobody who has not answered is told what
 * anybody else said.
 */
function person(id: string, first: string, done: boolean, extra: any = {}) {
  return { id, managingOnly: false, user: { email: `${first.toLowerCase()}@x.test`, firstName: first, lastName: 'Test', isActive: true, deletedAt: null, awaitingOrgApproval: false }, checkIns: done ? [{ id: `c-${id}` }] : [], ...extra };
}

function run(participants: any[], justCheckedIn: string) {
  const sent: { to: string; subject: string; html: string }[] = [];
  const prisma: any = { ground: { findUnique: jest.fn(async () => ({ label: 'Kenya launch', initiator: { email: 'wairimu@x.test' }, participants })) } };
  const email: any = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  email.sendEmail = jest.fn(async (o: any) => { sent.push(o); });
  const listener: any = new ReportsListener(prisma, {} as any, {} as any, email, { get: () => 'https://app.test' } as any);
  return { go: () => listener.notifyAdminOnCheckIn({ groundId: 'g1', sessionNumber: 1, participantId: justCheckedIn }), sent };
}
const text = (html: string) => html.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();

describe('when James finishes and two have not', () => {
  /* Changed 18 October (Drop Access run 1, item 24; the standing decision that the lead's morning summary is her one routine message): the
     partial count is no longer emailed. Grace had eighteen "N of four people have checked in ... not the whole team's view yet" emails in
     ten days. Who has checked in is on the board, and she is emailed when everybody is in. */
  it('Wairimu is not emailed a partial count: three of five in is on her board and in her summary, not in an email', async () => {
    const lead = person('p-w', 'Wairimu', true);
    const w = run([lead, person('p-a', 'Abigail', true), person('p-j', 'James', true), person('p-o', 'Omar', false), person('p-v', 'Vera', false)], 'p-j');
    await w.go();
    expect(w.sent).toHaveLength(0);
  });

  it('when the last one is in, it is the ordinary message that says everybody is', async () => {
    const lead = person('p-w', 'Wairimu', true);
    const w = run([lead, person('p-a', 'Abigail', true), person('p-j', 'James', true)].map((p) => ({ ...p })), 'p-j');
    await w.go();
    expect(w.sent[0].subject).toBe('James Test has checked in on Kenya launch');
    expect(text(w.sent[0].html)).toContain('Everyone has now checked in. The shared report is ready to go out.');
  });
});

describe('the words', () => {
  it('count in words, put her first as "you", agree with the number, and count only people who can answer', () => {
    const p = thePartialPicture('Kenya launch', { answered: ['you', 'Abigail', 'James'], ofHowMany: 8 }, { names: [], count: 5 });
    expect(p.lines[0]).toBe('You, Abigail and James have checked in so far, three of the eight people in it.');
    expect(thePartialPicture('Kenya launch', { answered: ['Abigail'], ofHowMany: 3 }).subject).toBe('One of three people has checked in on "Kenya launch", and it is not the whole team\'s view yet');
    expect(thePartialPicture('Kenya launch', { answered: ['Abigail'], ofHowMany: 3 }).lines[0]).toBe('Abigail has checked in so far, one of the three people in it.');
    expect(thePartialPicture('Kenya launch', { answered: ['you'], ofHowMany: 3 }).lines[0]).toBe('You have checked in so far, one of the three people in it.');
    expect([p.subject, ...p.lines].join(' ')).not.toMatch(/:/);
  });
  it('a person waiting to be let in is not one of the people in it', () => {
    /* Changed 18 October: the partial email is no longer sent (item 24); the count it would say is read here. */
    expect(thePartialPicture('Kenya launch', { answered: ['Abigail'], ofHowMany: 3 }).lines[0]).toContain('three people in it');
  });
});

/**
 * FOUND ON THE TEST BED (8 October): Grace leads "Q4 priorities", eight others can answer, and she has not checked in herself. Amani finished, and Grace read
 * "Amani has checked in so far, one of the nine people in it" and then "Seven people have not checked in yet". One and seven are eight, not nine: the list of
 * people left leaves out the lead, who is the one reading, and nothing said she is one of them.
 */
describe('when the lead has not checked in herself either', () => {
  /* Changed 18 October (item 24): not emailed any more; the words, if read, still add up. */
  it('Grace is told so, and the counts add up: one in, seven others, and her', () => {
    const p = thePartialPicture('Q4 priorities', { answered: ['Amani'], ofHowMany: 9, youAreStillToAnswer: true }, { names: [], count: 7 });
    const body = p.lines.join('\n');
    expect(body).toContain('Amani has checked in so far, one of the nine people in it.');
    expect(body).toContain('Your own check-in is still open too.');
    expect(body).not.toContain('either');
  });

  /* Changed 8 October: it read "You have not checked in yet either", which a lead who answered the questions while setting up from a plan could not square with what she had done. It now says only that her own check-in is open. */
  it('is said only when she is one of the people counted and has not answered', () => {
    const base = { answered: ['Amani'], ofHowMany: 9 };
    expect(thePartialPicture('Q4', { ...base, youAreStillToAnswer: true }, { names: [], count: 7 }).lines).toContain('Your own check-in is still open too.');
    expect(thePartialPicture('Q4', { ...base }, { names: [], count: 7 }).lines.join(' ')).not.toContain('Your own check-in is still open');
    expect(thePartialPicture('Q4', { answered: ['you', 'Amani'], ofHowMany: 9 }, { names: [], count: 7 }).lines.join(' ')).not.toContain('Your own check-in is still open');
  });
});
