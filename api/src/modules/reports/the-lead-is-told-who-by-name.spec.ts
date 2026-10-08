import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 21 Sep 2026: the lead read "adamu@r1789...adversarial.test has checked in", twenty-four times, each one
 * ending "Everyone has now checked in. The shared report is ready to go out" - the name was never
 * fetched and the pending count never passed.
 */
describe('the lead is told who checked in, by name, with the true count', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const src = strip(readFileSync(join(__dirname, 'reports.listener.ts'), 'utf8'));
  it('fetches the name and counts who has no completed check-in this session', () => {
    expect(src).toMatch(/firstName: true, lastName: true/);
    expect(src).toMatch(/checkIns: \{ where: \{ sessionNumber: event\.sessionNumber, status: CheckInStatus\.COMPLETED, turns: \{ some: \{ role: 'PERSON' as any \} \} \}/);
    /* Changed on 7 October: the count is made by whoIsLeftToCheckIn, which leaves out the person who just checked in, the lead and anybody not expected (who-has-not-checked-in-yet.spec.ts reads what it says). */
    expect(src).toMatch(/const stillPending = whoIsLeftToCheckIn\(ground\.participants as any, \{ justCheckedIn: event\.participantId, readerEmail: ground\.initiator\.email \}\)/);
    /* Changed under decision 109, journey 4: the call also carries who is in, for the honest partial picture. */
    expect(src).toMatch(/sendParticipantCheckedIn\(ground\.initiator\.email, participantName, ground\.label, groundUrl, stillPending, \{ answered, ofHowMany: counted\.length, youAreStillToAnswer \}\)/);
  });
  it('and the mail takes a name, not an address', () => {
    const mail = strip(readFileSync(join(__dirname, '../email/email.service.ts'), 'utf8'));
    expect(mail).toMatch(/async sendParticipantCheckedIn\(adminEmail: string, participantName: string/);
  });
});

import { ReportsListener } from './reports.listener';

/** B-132: somebody the clock closed after they said nothing was announced to the lead as having checked in. */
describe('the lead is not told somebody checked in who said nothing', () => {
  const run = async (theySaidSomething: boolean) => {
    const prisma: any = { ground: { findUnique: jest.fn(async (a: any) => {
      const person = (id: string, first: string, email: string) => ({ id, managingOnly: false, user: { email, firstName: first, lastName: 'Okeke', isActive: true, deletedAt: null, awaitingOrgApproval: false }, checkIns: id === 'p-chidi' && !theySaidSomething ? [] : [{ id: 'c' }] });
      return { label: 'Sales team, Q4', initiator: { email: 'wairimu@x.test' }, participants: [person('p-lead', 'Wairimu', 'wairimu@x.test'), person('p-chidi', 'Chidi', 'chidi@x.test')] };
    }) } };
    const email: any = { sendParticipantCheckedIn: jest.fn(async () => undefined) };
    const listener = new ReportsListener(prisma, {} as any, {} as any, email, { get: () => 'http://x' } as any);
    await (listener as any).notifyAdminOnCheckIn({ checkInId: 'c', groundId: 'g', participantId: 'p-chidi', sessionNumber: 3, source: 'auto-close' });
    return email.sendParticipantCheckedIn;
  };
  it('says nothing for a check-in with no word from the person', async () => { expect(await run(false)).not.toHaveBeenCalled(); });
  it('still says it when they said something', async () => { expect(await run(true)).toHaveBeenCalledTimes(1); });
});
