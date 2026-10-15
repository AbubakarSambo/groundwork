import { PartyType } from '@prisma/client';
import { ReportsService } from './reports.service';
import { aNameSaidAgainInOneSentence, forTheyAfterAName } from './a-name-said-twice-in-a-row';
import { labelsForParties } from './party-labels';

/** Onboarding review: "Tobi says that Tobi does not know the names of the clients." A name is said once, and no he or she is guessed. */
const people = [
  ['p-amina', 'u-amina', 'Amina', 'Bello', PartyType.INITIATOR],
  ['p-tobi', 'u-tobi', 'Tobi', 'Adewale', PartyType.PARTICIPANT],
].map(([id, userId, firstName, lastName, partyType], i) => ({ id, userId, partyType, createdAt: new Date(2026, 8, i + 1), email: `${i}@x.test`, managingOnly: false, roleAsDescribed: null, nameGiven: null, user: { firstName, lastName } }));
const door = () => Object.create(ReportsService.prototype) as any;
const readAs = (picture: string, pid: string | null, lead: boolean) =>
  door().theReportAsItWasShared({ scenario: 'NEW_HIRE', peersVisibleToEachOther: true, initiatorId: 'u-amina', participants: people, report: { sharedPicture: picture } }, pid, lead).sharedPicture as string;

describe('a name after "says that" is the same person', () => {
  const T = labelsForParties(people as any).get('p-tobi')!;
  const picture = `${T} says that ${T} does not know the names of the clients. ${T} says that ${T} needs the commercial terms.`;

  it('Amina, who runs it, reads Tobi once in each sentence', () => {
    expect(readAs(picture, 'p-amina', true)).toBe('Tobi Adewale says that they do not know the names of the clients. Tobi says that they need the commercial terms.');
  });

  it('an admin reads the same', () => {
    expect(readAs(picture, null, true)).toBe('Tobi Adewale says that they do not know the names of the clients. Tobi says that they need the commercial terms.');
  });

  it('the plain function says the verb to agree with "they"', () => {
    expect(aNameSaidAgainInOneSentence('Tobi says that Tobi does not know the names.', ['Tobi Adewale'])).toBe('Tobi says that they do not know the names.');
    expect(aNameSaidAgainInOneSentence('Tobi Adewale says that Tobi has not met them.', ['Tobi Adewale'])).toBe('Tobi Adewale says that they have not met them.');
    expect(forTheyAfterAName('is')).toBe('are');
    expect(forTheyAfterAName('can')).toBe('can');
  });

  it('somebody else after "says that" is left alone', () => {
    expect(aNameSaidAgainInOneSentence('Tobi says that Amina does not know the names.', ['Tobi Adewale', 'Amina Bello'])).toBe('Tobi says that Amina does not know the names.');
  });
});
