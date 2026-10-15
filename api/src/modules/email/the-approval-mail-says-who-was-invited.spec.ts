import { EmailService } from './email.service';

/** B-003: the lead was told "You can invite the people involved now" at the moment the people she named were invited. */
async function theMail(invitedNow?: number) {
  const email = new EmailService({ get: () => undefined } as any, {} as any, {} as any);
  const sent: any[] = [];
  (email as any).sendEmail = jest.fn(async (m: any) => { sent.push(m); });
  await email.sendGroundApproved('wairimu@x.test', 'Wairimu', 'Msingi Q4 retail accounts', 'http://x/grounds/1', invitedNow as any);
  return sent[0].html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
}

describe('the mail that says an admin approved a check-in', () => {
  it('says the people she named have been invited, and need not be invited again', async () => {
    expect(await theMail(3)).toContain('An admin in your organisation has approved Msingi Q4 retail accounts. The people you named have now been invited, so you do not need to invite them again.');
    expect(await theMail(1)).toContain('The person you named has now been invited, so you do not need to invite them again.');
  });
  it('still tells her to invite people when nobody had been named', async () => {
    expect(await theMail(0)).toContain('You can invite the people involved now, and their check-ins can begin.');
    expect(await theMail()).toContain('You can invite the people involved now, and their check-ins can begin.');
  });
});
