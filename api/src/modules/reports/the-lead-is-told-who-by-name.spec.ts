import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 21 Sep 2026: the lead read "adamu@r1789...adversarial.test has checked in", twenty-four times, each one
 * ending "Everyone has now checked in. The shared report is ready to go out" - the name was never
 * fetched and the pending count never passed.
 */
describe('the lead is told who checked in, by name, with the true count', () => {
  const src = readFileSync(join(__dirname, 'reports.listener.ts'), 'utf8');
  it('fetches the name and counts who has no completed check-in this session', () => {
    expect(src).toMatch(/firstName: true, lastName: true/);
    expect(src).toMatch(/checkIns: \{ where: \{ sessionNumber: event\.sessionNumber, status: CheckInStatus\.COMPLETED \}/);
    expect(src).toMatch(/const stillPending = ground\.participants\.filter\(\(p\) => !p\.managingOnly && p\.checkIns\.length === 0\)\.length/);
    expect(src).toMatch(/sendParticipantCheckedIn\(ground\.initiator\.email, participantName, ground\.label, groundUrl, stillPending\)/);
  });
  it('and the mail takes a name, not an address', () => {
    const mail = readFileSync(join(__dirname, '../email/email.service.ts'), 'utf8');
    expect(mail).toMatch(/async sendParticipantCheckedIn\(adminEmail: string, participantName: string/);
  });
});
