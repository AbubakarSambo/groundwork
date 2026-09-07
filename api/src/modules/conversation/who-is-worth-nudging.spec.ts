/**
 * The manual reminder asked "is their check-in not COMPLETED" and wrote to everybody who said yes.
 * Three kinds of person say yes and should be left alone.
 */
import * as fs from 'fs';
import * as path from 'path';
import { whyNotNudge, worthNudging, whatToSendThem, NOT_TWICE_WITHIN_HOURS } from './who-is-worth-nudging';

const party = (over: Partial<Parameters<typeof whyNotNudge>[0]> = {}) => ({
  id: 'p1',
  session: { id: 'c1', status: 'NOT_STARTED' as const },
  managingOnly: false,
  emailNotifications: true,
  hoursSinceLastNudge: null,
  ...over,
});

describe('who is worth nudging', () => {
  it('nudges somebody who simply has not started', () => {
    expect(whyNotNudge(party())).toBeNull();
  });

  it('nudges somebody part-way through', () => {
    expect(whyNotNudge(party({ session: { id: 'c1', status: 'IN_PROGRESS' } }))).toBeNull();
  });

  it('leaves somebody who declined alone', () => {
    expect(whyNotNudge(party({ session: { id: 'c1', status: 'DECLINED' } })))
      .toMatch(/decision rather than a delay/);
  });

  it('leaves a managing-only lead alone, who has no check-in by design', () => {
    expect(whyNotNudge(party({ managingOnly: true, session: null })))
      .toMatch(/oversee this check-in/);
  });

  it('refuses to nudge anybody with no check-in, rather than linking to nothing', () => {
    expect(whyNotNudge(party({ session: null }))).toMatch(/no check-in of theirs/);
    expect(whyNotNudge(party({ session: { id: '', status: 'NOT_STARTED' } }))).toMatch(/no check-in of theirs/);
  });

  it('does not chase somebody who has left, whose address may now be somebody else\'s', () => {
    expect(whyNotNudge(party({ stillHere: false }))).toMatch(/deactivated/);
  });

  it('and treats an invitee with no account yet as neither here nor gone', () => {
    /* `undefined` is not `false`: somebody who has not accepted has no account to deactivate. */
    expect(whyNotNudge(party({ stillHere: undefined, hasAccepted: false }))).toBeNull();
  });

  it('honours the email switch and the once-a-day throttle', () => {
    expect(whyNotNudge(party({ emailNotifications: false }))).toMatch(/turned these emails off/);
    expect(whyNotNudge(party({ hoursSinceLastNudge: 2 }))).toMatch(/last day/);
    expect(whyNotNudge(party({ hoursSinceLastNudge: NOT_TWICE_WITHIN_HOURS + 1 }))).toBeNull();
  });

  it('says nothing about somebody who has finished', () => {
    expect(whyNotNudge(party({ session: { id: 'c1', status: 'COMPLETED' } }))).toMatch(/already finished/);
  });

  it('filters a mixed list down to the people it is fair to write to', () => {
    const kept = worthNudging([
      party({ id: 'not-started' }),
      party({ id: 'declined', session: { id: 'c2', status: 'DECLINED' } }),
      party({ id: 'lead', managingOnly: true, session: null }),
      party({ id: 'done', session: { id: 'c4', status: 'COMPLETED' } }),
    ]);
    expect(kept.map((k) => k.id)).toEqual(['not-started']);
  });
});

describe('and the reminder service asks it', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'remind.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('uses the list rather than testing COMPLETED itself', () => {
    expect(src).toContain('worthNudging(');
    expect(src).not.toContain("session.status !== CheckInStatus.COMPLETED");
  });

  it('reads managingOnly from the database rather than casting it off a row that lacks it', () => {
    /* `(p as any).managingOnly ?? false` is permanently false on a select that omits the column,
       which is the exclusion failing while looking implemented. */
    expect(src).toContain('managingOnly: true');
    expect(src).not.toMatch(/\(p as any\)\.managingOnly/);
  });

  it('never builds a nudge link out of an empty check-in id', () => {
    expect(src).not.toContain("buildCheckInUrl(participant.checkIns[0]?.id ?? '')");
  });
});

/**
 * AND THE PERSON A LEAD MOST WANTS TO CHASE.
 *
 * The reminder's query required a `userId`, so somebody who had never opened their invitation
 * could not be reminded at all: pressing the button reported reminding nobody, and the lead's only
 * move was to add them a second time. They get their invitation again — not a nudge, which links
 * to a check-in they cannot open without an account.
 */
describe('what to send them', () => {
  const accepted = { id: 'p1', session: { id: 'c1', status: 'NOT_STARTED' as const }, hasAccepted: true, emailNotifications: true, hoursSinceLastNudge: null };

  it('sends a nudge to somebody who has accepted', () => {
    expect(whatToSendThem(accepted).send).toBe('a nudge');
  });

  it('sends the invitation again to somebody who has not', () => {
    expect(whatToSendThem({ ...accepted, hasAccepted: false }).send).toBe('their invitation again');
  });

  it('reaches somebody who has not accepted even with no check-in of their own', () => {
    /* The old rule refused a party with no session, which is every un-accepted invitee on a
       ground where the row had not been created yet. */
    expect(whatToSendThem({ ...accepted, hasAccepted: false, session: null }).send).toBe('their invitation again');
  });

  it('still leaves the declined, the finished and the managing-only alone', () => {
    expect(whatToSendThem({ ...accepted, session: { id: 'c1', status: 'DECLINED' } }).send).toBe('nothing');
    expect(whatToSendThem({ ...accepted, session: { id: 'c1', status: 'COMPLETED' } }).send).toBe('nothing');
    expect(whatToSendThem({ ...accepted, managingOnly: true }).send).toBe('nothing');
  });

  it('and honours the email switch and the daily throttle for both kinds', () => {
    expect(whatToSendThem({ ...accepted, hasAccepted: false, emailNotifications: false }).send).toBe('nothing');
    expect(whatToSendThem({ ...accepted, hasAccepted: false, hoursSinceLastNudge: 2 }).send).toBe('nothing');
  });

  it('says why it is sending nothing, for a log somebody reads later', () => {
    expect(whatToSendThem({ ...accepted, session: { id: 'c1', status: 'DECLINED' } }).because)
      .toMatch(/decision rather than a delay/);
  });
});
