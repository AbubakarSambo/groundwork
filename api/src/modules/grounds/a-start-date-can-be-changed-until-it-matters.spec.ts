import * as fs from 'fs';
import * as path from 'path';

/**
 * THE START DATE COULD BE SET WHEN A CHECK-IN WAS CREATED AND NEVER AGAIN.
 *
 * "There is no start date on setup. Where does it exist." On the check-in, and it decides two real
 * things: an invitation for somebody added before the start is held and sent by the cron on that
 * day (`grounds.cron.ts` reads `startsAt: { lte: now }`), and session 1 carries it as
 * `availableFrom`. So a new hire whose start moved by a week - the most ordinary thing that can
 * happen to a new-hire check-in - left a check-in opening on the wrong day, invitations going out
 * on the wrong day, and nothing anywhere to change either.
 *
 * AND IT STOPS BEING CHANGEABLE THE MOMENT IT MATTERS. Once somebody has completed a session, the
 * start is the point their account was framed against: the cadence maths, the overdue reads and
 * the session gates all measure from it. Refused with the reason, for everybody including the lead.
 */
const service = fs
  .readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

const controller = fs
  .readFileSync(path.join(__dirname, 'grounds.controller.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

const updateTimeline = (() => {
  const at = service.indexOf('async updateTimeline(');
  expect(at).toBeGreaterThan(-1);
  const next = service.indexOf('\n  async ', at + 1);
  return service.slice(at, next > -1 ? next : undefined);
})();

describe('changing when a check-in starts', () => {
  it('is accepted by the endpoint that already changes the schedule', () => {
    expect(controller).toContain('startsAt?: string;');
    expect(updateTimeline).toContain('startsAt?: string');
  });

  it('is the lead\'s, or an admin\'s once the lead has left (decision 119, H10), like every other change to the schedule', () => {
    const block = updateTimeline.slice(updateTimeline.indexOf('if (dto.startsAt !== undefined) {'));
    expect(block).toContain('ground.initiatorId !== requestingUserId) await this.mayConfirmSetupOn(ground, requestingUserId)');
  });

  it('is refused once anybody has answered, with the reason', () => {
    expect(updateTimeline).toContain('status: CheckInStatus.COMPLETED');
    expect(updateTimeline).toContain('the start date is fixed');
    expect(updateTimeline).toContain('It is the point everything else is measured from');
  });

  it('moves the end of the run with it', () => {
    /* `endsAt` is what "89 days remaining" counts down to and what the stall cron reads. Left
       behind, a check-in that starts a week later would end a week sooner without saying so. */
    expect(updateTimeline).toContain('endsAt: dto.startsAt');
    expect(updateTimeline).toMatch(/requestedDays \?\? ground\.timelineDays/);
  });

  it('and moves the gate on session 1, which is what actually keeps it shut', () => {
    /* Writing the date on the check-in and leaving `availableFrom` on the old day gives somebody a
       check-in that says it opens on the 22nd and lets them in on the 15th. */
    expect(updateTimeline).toContain('sessionNumber: 1, status: CheckInStatus.NOT_STARTED');
    /* The date still comes from `dto.startsAt`; it now passes through the working-days roll so a
       weekdays-only ground does not open session 1 on a Sunday. Asserted on the intent rather than
       the old spelling, which is what made this fail when the roll was added. */
    expect(updateTimeline).toMatch(/availableFrom: this\.theFirstDayTheyWork\(dto\.startsAt/);
  });
});
