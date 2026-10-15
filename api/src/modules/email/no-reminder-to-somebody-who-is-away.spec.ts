import { EmailService } from './email.service';

/** The one door every mail goes through, asked about somebody on approved leave (week 23). */
function door(leave: { status: string }[]) {
  const prisma: any = {
    emailDelivery: { findFirst: jest.fn(async () => null) },
    groundParticipant: { findUnique: jest.fn(async () => null) },
    user: { findUnique: jest.fn(async (a: any) => (a.select.id ? { id: 'uY' } : { emailNotifications: true, isActive: true, deletedAt: null })) },
    person: { findMany: jest.fn(async () => []) },
    leaveRequest: {
      findMany: jest.fn(async () => leave.filter((l) => l.status === 'approved').map(() => ({ userId: 'uY', endsOn: new Date('2026-10-02T00:00:00Z') }))),
    },
  };
  const email = new EmailService({ get: () => undefined } as any, {} as any, prisma);
  return (sender: string) => (email as any).wouldTheyRatherNot('yemi@x.test', sender, undefined);
}

describe('the door and somebody who is away', () => {
  it('stops a reminder and a "you have missed" mail, and says why in plain words', async () => {
    const ask = door([{ status: 'approved' }]);
    expect(await ask('sendNudge')).toMatch(/approved leave/);
    expect(await ask('sendAbsenceReminder')).toMatch(/approved leave/);
  });
  it('lets through what they asked for, and what only waits for approval', async () => {
    expect(await door([{ status: 'approved' }])('sendReportReady')).toBeNull();
    expect(await door([{ status: 'waiting' }])('sendNudge')).toBeNull();
  });
});
