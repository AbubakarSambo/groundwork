import { EmailService } from './email.service';

/** B-145: four reminders arrived the same second, all 'Your check-in is waiting'. */
it('names the check-in in the subject', async () => {
  const email = new EmailService({ get: () => undefined } as any, {} as any, { groundParticipant: { findUnique: async () => null } } as any);
  const sent: any[] = [];
  (email as any).sendEmail = jest.fn(async (m: any) => { sent.push(m); });
  (email as any).theWayToStopBeingChased = async () => null;
  for (const label of ['Sales team, Q4', 'Hiring plan']) await email.sendNudge('a@x.test', label, 'http://x/checkin/1', undefined, false, null, 'p1');
  expect(sent.map((m) => m.subject)).toEqual(['Your check-in for Sales team, Q4 is waiting', 'Your check-in for Hiring plan is waiting']);
});
