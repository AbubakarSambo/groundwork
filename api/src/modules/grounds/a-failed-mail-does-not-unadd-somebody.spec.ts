import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A LINK THAT HAD NEVER BEEN USED, ANSWERED WITH "THIS LINK HAS ALREADY BEEN USED".
 *
 * Photographed. The token found no participant, because the participant had been deleted - and it
 * had been deleted by the very call that sent the invitation.
 *
 * `addParticipant` created the row, sent the mail, and on any throw from the send deleted the
 * participant, deleted their check-in, put the ground's status back, and rethrew. The reasoning was
 * that an invitation whose email failed should leave nothing behind. Two things are wrong with it.
 *
 * THE MAIL MAY ALREADY HAVE GONE. A send that throws is not a send that did not happen: a provider
 * can accept a message and then fail the response, and a timeout tells you nothing either way. So
 * the row is removed while the invitation sits in somebody's inbox, and the link in it points at
 * nothing.
 *
 * AND IT DESTROYS THE PART WORTH KEEPING. Adding somebody is a decision an admin made; sending a
 * mail is the recoverable half, and `resendInvite` exists for exactly this. Throwing away the
 * decision to protect against a failed mail is the wrong way round.
 *
 * The row survives now, uninvited, which is the same truthful state a future start date produces -
 * and both screens that add people already explain that state.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SERVICE = strip(readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8'));

/** Just the invite-sending stretch of addParticipant, so nothing elsewhere can satisfy these. */
const SENDING = (() => {
  const start = SERVICE.indexOf('let emailFailed');
  expect(start).toBeGreaterThan(-1);
  const end = SERVICE.indexOf('this.usage.emit(UsageEventType.PARTICIPANT_INVITED', start);
  expect(end).toBeGreaterThan(start);
  return SERVICE.slice(start, end);
})();

describe('a failed mail does not un-add somebody', () => {
  it('never deletes the participant it just created', () => {
    expect(SENDING).not.toMatch(/groundParticipant\.delete\(/);
  });

  it('and never deletes their check-in either', () => {
    /* The check-in is the row that makes them a party who owes an answer. Deleting it leaves
       somebody on a check-in with nothing to answer, which is worse than either whole state. */
    expect(SENDING).not.toMatch(/checkIn\s*\n?\s*\.deleteMany/);
  });

  it('records the truth instead: on the check-in, not invited', () => {
    expect(SENDING).toMatch(/data: \{ invitedAt: null \}/);
  });

  it('does not rethrow, because the person WAS added', () => {
    /*
     * It threw, so the caller reported a failure and the admin reasonably concluded nothing had
     * happened - while a row and possibly an email both existed. The add succeeded; only the mail
     * did not.
     */
    expect(SENDING).not.toMatch(/throw err;/);
  });

  it('tells the caller the mail did not go, so no screen can claim it did', () => {
    expect(SENDING).toMatch(/emailFailed = err\?\.message/);
    /* The return became multi-line when it grew `awaitingSeat` and its sentence - see
       added-but-waiting-for-a-seat.ts. What this pins is that the failure still travels with it. */
    expect(SERVICE).toMatch(/devUrl: emailResult\?\.devUrl,\s*\n\s*emailFailed,/);
  });

  it('and leaves a log naming the person and the way to recover', () => {
    expect(SENDING).toMatch(/the invitation did not send/);
    expect(SENDING).toMatch(/can be resent from the check-in/);
  });
});
