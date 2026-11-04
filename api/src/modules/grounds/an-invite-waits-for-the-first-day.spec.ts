import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * AN INVITATION MUST NOT ARRIVE BEFORE SOMEBODY HAS STARTED.
 *
 * Five situations set a ground up about a person before they begin: a hire whose first day is next
 * month, an advisor whose year has not opened, a manager taking over on the first. Opening the ground
 * early is deliberate - agreeing what good looks like before anybody can be judged against it is the
 * entire point.
 *
 * Sending the invitation early is not. An email asking somebody to account for their work can land
 * before they have signed a contract, and once it has been read it cannot be recalled. This file's
 * neighbour already states the principle for a different case: "an invite that has already gone out
 * cannot be recalled by declining afterwards - the person has read it."
 *
 * BOTH HALVES OR NEITHER. The row must say uninvited AND no email may go. A row marked uninvited while
 * the email had already gone is the worst of the three outcomes, because the lead would believe they
 * could still change their mind about somebody who has already read it.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SERVICE = strip(readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8'));
const CRON = strip(readFileSync(join(__dirname, 'grounds.cron.ts'), 'utf8'));
const DTO = strip(readFileSync(join(__dirname, 'dto/add-participant.dto.ts'), 'utf8'));

describe('adding somebody who has not started', () => {
  it('accepts a start date', () => {
    expect(DTO).toMatch(/startsAt\?: string/);
  });

  it('decides on the future, not on the mere presence of a date', () => {
    // A date in the past or today means the work is underway and the invite goes now, as it always did.
    expect(SERVICE).toMatch(/startsAt\.getTime\(\) > Date\.now\(\)/);
  });

  it('leaves them uninvited when their start date is ahead', () => {
    /* A second reason now holds the same mail - no seat on the account - and the row has to say
       uninvited for either of them. See added-but-waiting-for-a-seat.ts. */
    expect(SERVICE).toMatch(/invitedAt: theMailWaits \|\| heldForApproval \|\| !waitingForASeat\.room \? null : new Date\(\)/);
  });

  it('and sends no email either, so the row and the mailbox agree', () => {
    /* A second reason now holds the same mail: somebody added when the account has no seat for them
       is on the check-in and not written to until an admin makes room. Both conditions guard the
       one send, so the row and the mailbox still agree either way. */
    expect(SERVICE).toMatch(/if \(!theMailWaits && !heldForApproval && waitingForASeat\.room\) \{/);
  });

  it('and does not claim they were notified', () => {
    // notifiedAt is the record that somebody was told they had been added. Nobody added silently.
    expect(SERVICE).toMatch(/notifiedAt: theMailWaits \|\| heldForApproval \|\| !waitingForASeat\.room \? null : new Date\(\)/);
  });

  it('stores the start date so the timeline can use it', () => {
    // participation-timeline.ts stops counting periods before it against them.
    expect(SERVICE).toMatch(/startsAt: startsAt \?\? null/);
  });
});

describe('and the invite that was held back', () => {
  it('is sent on the day by a daily sweep', () => {
    expect(CRON).toMatch(/async inviteJoinersWhoStartToday/);
    expect(CRON).toMatch(/@Cron\('0 6 \* \* \*'/);
  });

  it('finds exactly the people who are due one', () => {
    expect(CRON).toMatch(/startsAt: \{ not: null, lte: now \}/);
    expect(CRON).toMatch(/invitedAt: null/);
    expect(CRON).toMatch(/inviteToken: \{ not: null \}/);
  });

  it('and never one on a ground that has finished', () => {
    /**
     * NOT-TERMINAL, NOT ACTIVE, and this assertion was wrong first. Running the sweep found nothing:
     * a ground whose people have not started is normally AWAITING_PARTIES, which is the exact state it
     * exists to serve, so requiring ACTIVE held the invite forever on precisely those grounds.
     *
     * What must stay excluded is a ground that has ended. Inviting somebody into a resolved or stalled
     * ground is worse than never inviting them at all.
     */
    expect(CRON).toMatch(/status: \{ notIn: TERMINAL \}/);
    expect(CRON).not.toMatch(/ground: \{ status: GroundStatus\.ACTIVE \}/);
  });

  it('stamps invited only after the send succeeded', () => {
    /**
     * Otherwise a provider outage leaves somebody permanently uninvited to a ground that is already
     * running, and nothing ever looks for them again.
     */
    const send = CRON.indexOf('sendTheInviteThisGroundSends');
    const stamp = CRON.indexOf('invitedAt: new Date(), notifiedAt: new Date()');
    expect(send).toBeGreaterThan(-1);
    expect(stamp).toBeGreaterThan(send);
  });

  it('and takes its own lock, so two instances do not both send', () => {
    expect(CRON).toMatch(/CronLock\.DEFERRED_INVITES/);
  });
});
