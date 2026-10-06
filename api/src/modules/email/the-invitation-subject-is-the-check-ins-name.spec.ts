import { EmailService } from './email.service';

/**
 * THE INVITATION EMAIL'S SUBJECT IS THE CHECK-IN'S NAME, AND THE NAME IS THE TOPIC (U.6 review).
 *
 * a-label-is-a-subject-line.spec.ts holds the naming rule by reading the source; nothing rendered
 * the real subject. This sends the invitation for a check-in named "Help someone get back on track"
 * and reads what arrives: the subject carries that name exactly, and the name is not led by the
 * person being invited. (The subject opens with the lead's first name, "Hafsah would like your take
 * on ...", as it always has.)
 */
function sent() {
  const out: { subject: string; html: string }[] = [];
  const prisma: any = { groundParticipant: { findUnique: jest.fn(async () => null) } };
  const email = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  jest.spyOn(email as any, 'sendEmail').mockImplementation(async (m: any) => { out.push({ subject: m.subject, html: m.html }); return undefined; });
  return { email, out };
}

describe('the invitation email subject', () => {
  it('is the check-in\'s name, the topic, with no person leading the name', async () => {
    const { email, out } = sent();
    await email.sendTheInviteThisGroundSends(
      { scenario: 'PIP', brief: null, label: 'Help someone get back on track' },
      'daniel@x.test', 'Hafsah', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', participantId: 'p1', groundId: 'g1' },
    );
    expect(out).toHaveLength(1);
    expect(out[0].subject).toBe('Hafsah would like your take on Help someone get back on track');
    const theName = out[0].subject.split(' would like your take on ')[1];
    expect(theName).toBe('Help someone get back on track');
    expect(theName).not.toMatch(/^Daniel\b/);
    expect(out[0].subject).not.toContain('Daniel');
  });
});
