import { EmailService } from './email.service';

/** Communications check, 10 October 2026: "chidi@msingi.test tried to check in" was the subject. An address is never a name (decision 115); and the billing emails say "organisation". */
function service() {
  const s = Object.create(EmailService.prototype) as any;
  s.frontendUrl = 'https://app.test'; s.layout = (x: string) => x;
  const sent: any[] = [];
  s.sendEmail = jest.fn(async (m: any) => { sent.push(m); });
  return { s, sent };
}
describe('the email to a lead whose person could not check in', () => {
  it('names the person', async () => {
    const { s, sent } = service();
    await s.sendParticipantBlockedNudge('wairimu@msingi.test', 'Sales team, Q4', 'Chidi Okeke', 'https://app.test/grounds/g1');
    expect(sent[0].subject).toBe('Chidi Okeke tried to check in and could not');
    expect(sent[0].html).not.toMatch(/@/);
  });
  it('says "somebody you invited" when no name is known, and still no address', async () => {
    const { s, sent } = service();
    await s.sendParticipantBlockedNudge('wairimu@msingi.test', 'Sales team, Q4', null, 'https://app.test/grounds/g1');
    expect(sent[0].subject).toBe('Somebody you invited tried to check in and could not');
    expect(sent[0].html).not.toMatch(/@/);
  });
});
describe('the billing emails', () => {
  it('say organisation', async () => {
    const { s, sent } = service();
    await s.sendSubscriptionConfirmed('a@b.test', 'growth', new Date('2026-10-15'));
    await s.sendMemberCapWarning('a@b.test', 'growth', 3, 3);
    expect(sent.map((m) => m.subject + m.html).join(' ')).not.toMatch(/organization/);
  });
});
