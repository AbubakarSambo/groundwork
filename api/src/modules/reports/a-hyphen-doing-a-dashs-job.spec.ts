import { withoutDashes } from './forensic-voice';

/**
 * A PLAIN HYPHEN DOING A DASH'S JOB IS A TYPO ON SOMEBODY'S SCREEN.
 *
 * Read twice in one live setup on 17 September 2026: "the cost per delivery is down-for example,
 * under 500 per delivery", and "the right time to set up a check-in on this-a new quarter". The
 * prompt's own examples use a spaced dash and the model compresses it.
 *
 * This is a DETERMINISTIC edit - a closed list of words that never begin the second half of a
 * compound - which is why it is allowed to change a reply when the judgement-based guards are not.
 * There is nothing here to be wrong about.
 */
describe('a hyphen between clauses', () => {
  it('becomes a comma, in the two forms read live', () => {
    expect(withoutDashes('the cost per delivery is down-for example, under 500'))
      .toBe('the cost per delivery is down, for example, under 500');
    expect(withoutDashes('set up a check-in on this-a new quarter, a push, or something else?'))
      .toBe('set up a check-in on this, a new quarter, a push, or something else?');
  });

  /* The two the first version of the list missed, found by running three lead setups. */
  it('and the verb-opening clauses the first list missed', () => {
    expect(withoutDashes('your part in this situation-are you directly managing Musa?'))
      .toBe('your part in this situation, are you directly managing Musa?');
    expect(withoutDashes('a check-in on this-is it because she is new?'))
      .toBe('a check-in on this, is it because she is new?');
  });

  it('and leaves every real compound alone, which is the whole risk', () => {
    for (const compound of ['check-in', 'follow-up', 'cost-per-delivery', 'well-run', 'day-to-day', 'twenty-five', 'end-to-end', 'crash-free']) {
      expect(withoutDashes(`They ran a ${compound} review.`)).toContain(compound);
    }
  });

  it('still does the em and en dash it always did', () => {
    expect(withoutDashes('the queue—the only thing measured')).toBe('the queue, the only thing measured');
    expect(withoutDashes('the queue – the only thing measured')).toBe('the queue, the only thing measured');
  });

  it('and never doubles a comma that was already there', () => {
    expect(withoutDashes('first, second-and third')).toBe('first, second, and third');
  });
});

/*
 * RUN-25: "on-the-ground" BECAME "on, the-ground", 31 TIMES. Amaka's own line in the loans report, read by her and by
 * every borrower: "Amaka Nwachukwu relies on a team for on, the-ground communication." And in the payments project:
 * "a like, for-like swap to a new gateway". A compound of three or more parts is never a clause.
 */
describe('a compound of three or more parts stays whole (run-25)', () => {
  it('Amaka\'s line in the loans report, as every reader reads it', () => {
    expect(withoutDashes('Amaka Nwachukwu relies on a team for on-the-ground communication.'))
      .toBe('Amaka Nwachukwu relies on a team for on-the-ground communication.');
    expect(withoutDashes('The role of on-the-ground support is seen differently.')).toBe('The role of on-the-ground support is seen differently.');
  });

  it('the payments project\'s like-for-like swap', () => {
    expect(withoutDashes('the payments integration project is a like-for-like swap to a new gateway'))
      .toBe('the payments integration project is a like-for-like swap to a new gateway');
  });

  it('and every compound of its kind', () => {
    for (const c of ['on-the-ground', 'day-to-day', 'face-to-face', 'word-for-word', 'back-and-forth', 'behind-the-scenes', 'state-of-the-art', 'do-it-yourself', 'free-for-all', 'so-and-so', 'out-of-the-box', 'trial-and-error', 'know-how', 'to-do', 'must-have', 'can-do', 'either-or']) {
      expect(withoutDashes(`They spoke about the ${c} part.`)).toBe(`They spoke about the ${c} part.`);
    }
  });

  it('a hyphen doing a dash\'s job between two clauses is still a comma', () => {
    expect(withoutDashes('the cost per delivery is down-for example, under 500')).toBe('the cost per delivery is down, for example, under 500');
    expect(withoutDashes('a check-in on this-is it because she is new?')).toBe('a check-in on this, is it because she is new?');
  });

  it('a range between two numbers is said with "to", never a comma', () => {
    expect(withoutDashes('10–12 shops a week')).toBe('10 to 12 shops a week');
    expect(withoutDashes('the 2025 – 2026 season')).toBe('the 2025 to 2026 season');
  });
});

describe('Amaka\'s line, through the door every report read takes, as each reader of the loans check-in reads it (run-25)', () => {
  const { ReportsService } = require('./reports.service');
  const { PartyType } = require('@prisma/client');
  const people = [['p-amaka', 'u-amaka', 'Amaka', 'Nwachukwu', PartyType.INITIATOR], ['p-sunday', 'u-sunday', 'Sunday', 'Eze', PartyType.PARTICIPANT]]
    .map(([id, userId, firstName, lastName, partyType], i) => ({ id, userId, partyType, createdAt: new Date(2026, 8, i + 1), email: `${i}@x.test`, managingOnly: false, roleAsDescribed: null, nameGiven: null, user: { firstName, lastName } }));
  const ground = { scenario: 'COHORT_CHECK', peersVisibleToEachOther: null, initiatorId: 'u-amaka', participants: people, report: { sharedPicture: 'Amaka Nwachukwu relies on a team for on-the-ground communication.' } };
  const door = () => Object.create(ReportsService.prototype) as any;
  it.each([['Amaka, who runs it', 'p-amaka', true], ['an admin', null, true], ['Sunday, a borrower', 'p-sunday', false]])('%s reads "on-the-ground" whole', (_who, pid, lead) => {
    const r = door().theReportAsItWasShared(ground, pid, lead);
    expect(r.sharedPicture).toMatch(/(?:relies|rely) on a team for on-the-ground communication\./);
    expect(r.sharedPicture).not.toMatch(/on, the-ground/);
  });
});
