import { EmailService } from './email.service';

/** B-002: the invitation to a check-in opened "Hi," for a person the lead had named. */
async function theInvitation(row: any) {
  const prisma: any = { groundParticipant: { findUnique: jest.fn(async () => row) } };
  const email = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  (email as any).theWayToStopBeingChased = async () => null;
  (email as any).whoSeesWhatYouSay = async () => 'The people in this check-in can see what you say in it.';
  (email as any).theWhatsAppLine = async () => '';
  const sent: any[] = [];
  (email as any).sendEmail = jest.fn(async (m: any) => { sent.push(m); });
  await email.sendParticipantInvite('amani@x.test', 'Wairimu', 'Msingi Q4 retail accounts', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', participantId: 'p1' } as any);
  return sent[0].html.replace(/<[^>]+>/g, '');
}

describe('the invitation to a check-in', () => {
  it('opens with the first name the lead typed', async () => {
    expect(await theInvitation({ nameGiven: 'Amani Wekesa', user: null })).toMatch(/^\s*Hi Amani,/);
  });
  it('opens with the name on their sign-in when they have one', async () => {
    expect(await theInvitation({ nameGiven: null, user: { firstName: 'Chidi' } })).toMatch(/^\s*Hi Chidi,/);
  });
  it('opens with "Hi," only when nobody knows a name', async () => {
    expect(await theInvitation({ nameGiven: null, user: null })).toMatch(/^\s*Hi,/);
  });
});
