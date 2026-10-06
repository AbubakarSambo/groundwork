import { PartyType } from '@prisma/client';
import { ReportsService } from './reports.service';
import { aNameSaidAgainInOneSentence } from './a-name-said-twice-in-a-row';
import { theConversationPointForTheLead } from '../grounds/a-goal-not-told-stays-with-the-lead';
import { labelsForParties } from './party-labels';

/**
 * RUN-25: ONE NAME SAID TWICE IN ONE SENTENCE (406, up from 362), mostly in the lead's report. The report is stored in
 * labels, and these are run-25's own sentences, written in labels as they are stored, read through the door every
 * report read takes, as each reader.
 */
const people = [
  ['p-nadia', 'u-nadia', 'Nadia', 'Haddad', PartyType.INITIATOR],
  ['p-zainab', 'u-zainab', 'Zainab', 'Suleiman', PartyType.PARTICIPANT],
  ['p-grace', 'u-grace', 'Grace', 'Oyelaran', PartyType.PARTICIPANT],
].map(([id, userId, firstName, lastName, partyType], i) => ({ id, userId, partyType, createdAt: new Date(2026, 8, i + 1), email: `${i}@x.test`, managingOnly: false, roleAsDescribed: null, nameGiven: null, user: { firstName, lastName } }));
const door = () => Object.create(ReportsService.prototype) as any;
const readAs = (picture: string, pid: string | null, lead: boolean) =>
  door().theReportAsItWasShared({ scenario: 'DRIFT_CHECK', peersVisibleToEachOther: true, initiatorId: 'u-nadia', participants: people, report: { sharedPicture: picture } }, pid, lead).sharedPicture as string;

describe('a name said once in a sentence about that person', () => {
  const labels = labelsForParties(people as any);
  const Z = labels.get('p-zainab')!;
  const G = labels.get('p-grace')!;
  const ZAINAB = `${Z} has not been able to work on this since February and ${Z} is worried about being measured on it.`;
  const GRACE = `${G} took a loan to get a freezer for ${G}'s business.`;

  it('Nadia, who runs it, reads each name once', () => {
    expect(readAs(ZAINAB, 'p-nadia', true)).toBe('Zainab Suleiman has not been able to work on this since February and is worried about being measured on it.');
    expect(readAs(GRACE, 'p-nadia', true)).toBe('Grace Oyelaran took a loan to get a freezer for their own business.');
  });

  it('an admin reads the same', () => {
    expect(readAs(ZAINAB, null, true)).toBe('Zainab Suleiman has not been able to work on this since February and is worried about being measured on it.');
  });

  it('Zainab reads her own said to her, and Grace\'s once', () => {
    expect(readAs(ZAINAB, 'p-zainab', false)).not.toMatch(/Zainab/);
    expect(readAs(GRACE, 'p-zainab', false)).toBe('Grace Oyelaran took a loan to get a freezer for their own business.');
  });

  it('the rule: a joined clause and an owner, once each; somebody else named first, left alone', () => {
    const names = ['Nadia Haddad', 'Musa Danjuma', 'Daniel Park', 'Tomi Balogun'];
    expect(aNameSaidAgainInOneSentence('Nadia Haddad is concerned that the targets have not been progressed, and Nadia has not reviewed progress since then.', names))
      .toBe('Nadia Haddad is concerned that the targets have not been progressed, and has not reviewed progress since then.');
    expect(aNameSaidAgainInOneSentence('Musa says it is not Musa\'s job to get the machine, and the loan provider should deliver the asset.', names))
      .toBe('Musa says it is not their own job to get the machine, and the loan provider should deliver the asset.');
    expect(aNameSaidAgainInOneSentence('Tomi feels no longer trusted, and Tomi thinks Daniel is taking those tickets.', names))
      .toBe('Tomi feels no longer trusted, and thinks Daniel is taking those tickets.');
    expect(aNameSaidAgainInOneSentence('Tomi thinks Daniel is taking the tickets, and Tomi is unhappy.', names))
      .toBe('Tomi thinks Daniel is taking the tickets, and Tomi is unhappy.');
    expect(aNameSaidAgainInOneSentence('Both you and Tomi agree that Tomi\'s role is clear.', names)).toBe('Both you and Tomi agree that Tomi\'s role is clear.');
  });

  it('the lead\'s conversation point says the name once', () => {
    expect(theConversationPointForTheLead('Zainab Suleiman')).toBe('Zainab Suleiman has not been told about this goal yet. Talk it through together before reading anything into it.');
  });
});
