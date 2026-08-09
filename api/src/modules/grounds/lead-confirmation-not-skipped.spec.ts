import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ADDING A PARTICIPANT MUST NOT SKIP THE LEAD'S CONFIRMATION.
 *
 * GW-016, found on the clean Ground 1 re-run, and the most damaging kind of bug:
 * everything appeared to work.
 *
 * The sequence that breaks it is now the ordinary one. An admin hands a ground to
 * a lead, so the ground sits at AWAITING_LEAD. The admin is the person holding the
 * list of people to invite, so she adds them straight away - before the lead has
 * opened their email. `addParticipant` then set status to AWAITING_PARTIES
 * unconditionally, and two things followed:
 *
 *   1. `confirmLead` requires AWAITING_LEAD, so the lead could never confirm.
 *   2. `confirmLead` is the ONLY place a non-managing lead's own check-in is
 *      created, so the lead never got one.
 *
 * The lead was left recorded as a party (`managingOnly = false`) with no session to
 * give an account in, and was never asked the question that is hers to answer:
 * "I'm also checking in" or "Managing only". Observed live:
 *
 *   ground_participants: hafsah   | INITIATOR   | managing_only = f
 *                        abubakar | PARTICIPANT | managing_only = f
 *   check_ins:           abubakar | session 1 | NOT_STARTED     <- the only one
 *
 * On a "New hire starting" ground - whose entire promise is getting a manager and a
 * hire to mean the same thing by "doing well" - the manager had no way to say what
 * she meant. The report would still have generated, from one side, which is worse
 * than failing loudly.
 */

const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');

/** The transaction inside addParticipant that creates and advances state. */
const ADD_TX = (() => {
  const i = SRC.indexOf('const participant = await this.prisma.$transaction(async (tx) => {');
  expect(i).toBeGreaterThan(-1);
  return SRC.slice(i, SRC.indexOf('return participant;', i));
})();

describe('adding a participant while the ground still awaits its lead', () => {
  it('leaves the status alone', () => {
    expect(ADD_TX).toMatch(/if \(ground\.status !== GroundStatus\.AWAITING_LEAD\) \{/);
  });

  it('never advances status unconditionally again', () => {
    // THE REGRESSION. An unguarded update here silently strands the lead.
    const unguarded = /\n\s*await tx\.ground\.update\(\{ where: \{ id: groundId \}, data: \{ status: GroundStatus\.AWAITING_PARTIES \} \}\);\n\s*\n\s*return participant;/;
    expect(ADD_TX + '\n      return participant;').not.toMatch(unguarded);
  });

  it('still adds the participant and their first check-in either way', () => {
    // The guard is about the ground's phase, not about the invitation. Someone
    // added before the lead confirms is still added, and still invited.
    expect(ADD_TX).toMatch(/tx\.groundParticipant\.create/);
    expect(ADD_TX).toMatch(/tx\.checkIn\.create/);
  });
});

describe('the lead keeps the confirmation that creates their own check-in', () => {
  const CONFIRM = (() => {
    const i = SRC.indexOf('async confirmLead(');
    expect(i).toBeGreaterThan(-1);
    return SRC.slice(i, SRC.indexOf('findOrCreateUserForEmail', i));
  })();

  it('is only reachable from AWAITING_LEAD, which is why the guard above matters', () => {
    expect(CONFIRM).toMatch(/if \(ground\.status !== GroundStatus\.AWAITING_LEAD\) throw new BadRequestException/);
  });

  it('creates the lead a check-in when they are a party', () => {
    // The single place this happens. Skip confirmLead and a non-managing lead has
    // no session, forever.
    expect(CONFIRM).toMatch(/this\.prisma\.checkIn\.create/);
    expect(CONFIRM).toMatch(/sessionNumber: 1/);
  });

  it('creates none when the lead says they are managing only', () => {
    expect(CONFIRM).toMatch(/if \(managingOnly\) \{/);
    expect(CONFIRM).toMatch(/return \{ groundId, checkInId: null \};/);
  });
});
