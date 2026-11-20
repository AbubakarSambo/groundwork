import { EmailService, whoSeesWhatYouSayIn } from './email.service';

/**
 * AN INVITATION SAYS TRULY WHO SEES WHAT YOU SAY (5 October, release blocker). It said "Nobody on your
 * team sees what you write", which is not true: the people in a check-in can read what is said in it.
 * The rendered email, for a check-in where people see each other and for a cohort where they do not.
 */
function anEmail(ground: any) {
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ground) },
    groundParticipant: { findUnique: jest.fn(async () => null) },
    platformSetting: { findUnique: jest.fn(async () => null) },
  };
  const svc = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  const sent: any[] = [];
  (svc as any).sendEmail = jest.fn(async (o: any) => { sent.push(o); return undefined; });
  return { svc, sent };
}
const text = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('the invitation', () => {
  it('for a team check-in: the people in it, your manager included, can see what you say; Ask stays private', async () => {
    const { svc, sent } = anEmail({ scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null, organization: { name: 'Baridi Appliances' }, organizationId: 'org-1', overWhatsApp: null });
    await svc.sendParticipantInvite('amani@baridi.test', 'Wairimu', 'Sales team, Q4', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', groundId: 'g-1' });
    const read = text(sent[0].html);
    expect(read).toContain('You see your own report straight away. The person who runs it shares a team report when it is ready. Nobody else reads your conversation.');
    expect(read).not.toMatch(/Nobody on your team sees|never quotes you|private check-in/i);
  });

  it('for a cohort, where people do not see each other: whoever runs it can, and the others cannot', async () => {
    const { svc, sent } = anEmail({ scenario: 'COHORT_CHECK', peersVisibleToEachOther: null, organization: { name: 'Baridi Appliances' }, organizationId: 'org-1', overWhatsApp: null });
    await svc.sendParticipantInvite('amani@baridi.test', 'Wairimu', 'Founders cohort', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', groundId: 'g-2' });
    expect(text(sent[0].html)).toContain('You see your own report straight away. The person who runs it reads it too. Nobody else reads your conversation.');
  });

  it('a check-in whose lead chose that people see each other says so, whatever its kind', () => {
    expect(whoSeesWhatYouSayIn({ scenario: 'COHORT_CHECK', peersVisibleToEachOther: true, organization: { name: 'Kito' } })).toMatch(/shares a team report/);
  });
});
