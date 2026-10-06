import { readFileSync } from 'fs';
import { join } from 'path';

/** Three causes - the start date, no seat, the mail failed - collapsed into one null, and the lead was told "invited on the start date" for all three. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8'));
const page = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'grounds', 'GroundAdminPage.tsx'), 'utf8'));

describe('the server', () => {
  it('names the reason beside invitedAt, and a failed mail is not "invited"', () => {
    expect(service).toMatch(/const notInvitedBecause: 'starts_later' \| 'no_seat' \| 'mail_failed' \| 'waiting_for_approval' \| null = emailFailed\s*\? 'mail_failed'/);
    expect(service).toContain('invitedAt: emailFailed ? null : invitedAt');
  });
});

describe('the lead\'s screen', () => {
  it('says one sentence per fact, and the failed mail points at Resend', () => {
    expect(page).toContain('will be invited on the start date.');
    expect(page).toContain('will be invited when an admin makes room on the plan.');
    expect(page).toContain('but the invitation did not send. Send it again from their row.');
    expect(page).toMatch(/because === 'mail_failed'/);
  });
  it('never counts everybody without an invitedAt as "on the start date" any more', () => {
    expect(page).not.toMatch(/\$\{waiting\} invited on the start date/);
    expect(page).not.toMatch(/filter\(\(r\) => !r\.value\?\.invitedAt\)\.length/);
  });
});
