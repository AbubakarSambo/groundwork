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
  it('Wairimu is told three of five are in, who, that it is not the team\'s view, and who is missing', async () => {
    const lead = person('p-w', 'Wairimu', true, { user: { email: 'wairimu@x.test', firstName: 'Wairimu', lastName: 'Test', isActive: true, deletedAt: null, awaitingOrgApproval: false } });
    const w = run([lead, person('p-a', 'Abigail', true), person('p-j', 'James', true), person('p-o', 'Omar', false), person('p-v', 'Vera', false)].map((p, i) => (i === 0 ? { ...p, checkIns: [] } : p)), 'p-j');
    await w.go();
    expect(w.sent).toHaveLength(1);
    expect(w.sent[0].to).toBe('wairimu@x.test');
    expect(w.sent[0].subject).toBe('Two of five people have checked in on "Kenya launch", and it is not the whole team\'s view yet');
    const body = text(w.sent[0].html);
    expect(body).toContain('Two of five people have checked in so far: Abigail and James.');
    expect(body).toContain("That is not yet the whole team's view, so Groundwork has not drawn any conclusion about the team from it.");
    expect(body).toContain('Omar and Vera have not checked in yet.');
    expect(body).toContain('The shared picture is made once everyone is in.');
    expect(body).not.toMatch(/ahead|behind|strong|weak|best|worst/i);
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
  it('count in words and name only the people who answered', () => {
    const p = thePartialPicture('Kenya launch', { answered: ['Abigail', 'James', 'Lucy'], ofHowMany: 5 }, { names: ['Omar', 'Vera'], count: 2 });
    expect(p.subject).toBe("Three of five people have checked in on \"Kenya launch\", and it is not the whole team's view yet");
    expect(p.lines[0]).toBe('Three of five people have checked in so far: Abigail, James and Lucy.');
    expect(p.lines[2]).toBe('Omar and Vera have not checked in yet.');
  });
});
