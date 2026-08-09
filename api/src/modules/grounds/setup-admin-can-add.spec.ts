import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE ADMIN WHO SET A GROUND UP CAN ADD PEOPLE TO IT.
 *
 * This was the hard blocker of the eighteen-ground run, GW-013. Ground 1 stopped
 * dead and nothing downstream - no check-in, no report, no board - was reachable.
 *
 * The journey that breaks without this: an admin opens a ground, chooses "I'm
 * setting this up for my team - someone else will run it", and names a lead. The
 * hand-off makes the LEAD the `initiatorId` and records the admin as
 * `createdByUserId`. The admin is then the only person signed in, the lead has not
 * accepted their emailed invitation yet, and the admin is the one holding the list
 * of people to invite.
 *
 * The old check was `ground.initiatorId !== initiatorId` alone, so she was refused
 * on a ground she created, in an organisation she owns. Verified by contrast in the
 * live run: the identical form succeeded when the lead did it and failed when she
 * did, so it was authorisation and not the payload.
 *
 * `board.service.ts` had already made this exact allowance for READING, via
 * `isSetupAdmin`. The matching write never got it.
 *
 * Organisation scoping is unchanged and still does the real security work: the
 * ground is fetched with `{ id, organizationId }`, so this can never reach another
 * organisation's ground however the caller is related to it.
 */

const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');

/** The addParticipant guard, so assertions cannot drift to another method. */
const GUARD = (() => {
  const i = SRC.indexOf('async addParticipant(');
  expect(i).toBeGreaterThan(-1);
  return SRC.slice(i, SRC.indexOf('const token =', i));
})();

describe('who may add a participant', () => {
  it('still admits the ground initiator', () => {
    expect(GUARD).toMatch(/const isInitiator = ground\.initiatorId === initiatorId;/);
  });

  it('also admits the admin recorded as createdByUserId', () => {
    // The regression this file exists for.
    expect(GUARD).toMatch(/const isSetupAdmin = !!ground\.createdByUserId && ground\.createdByUserId === initiatorId;/);
    expect(GUARD).toMatch(/if \(!isInitiator && !isSetupAdmin\)/);
  });

  it('refuses everyone else', () => {
    expect(GUARD).toMatch(/throw new ForbiddenException/);
  });

  it('names both permitted roles in the error, so a refusal is diagnosable', () => {
    // "Only the initiator can add a participant" told an admin nothing about why
    // she, the creator, was being refused.
    expect(GUARD).toMatch(/Only the lead or the admin who set this ground up/);
  });

  it('keeps the organisation scope that does the real security work', () => {
    // Without this the relaxation above would be a cross-org hole.
    expect(GUARD).toMatch(/findFirst\(\{ where: \{ id: groundId, organizationId \} \}\)/);
  });

  it('no longer refuses on initiator identity alone', () => {
    expect(GUARD).not.toMatch(/if \(ground\.initiatorId !== initiatorId\) throw/);
  });
});
