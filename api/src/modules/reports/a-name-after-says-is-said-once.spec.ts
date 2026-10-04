import { PartyType } from '@prisma/client';
import { ReportsService } from './reports.service';
import { aNameSaidAgainInOneSentence } from './a-name-said-twice-in-a-row';
import { labelsForParties } from './party-labels';

/**
 * RUN-29: "Hauwa says Hauwa told the field officer", "Jide says Jide has not been told", "Daniel says Daniel has not focused",
 * "Joseph says Joseph assumed", "Laura says Laura was responsible", "Victor says Victor has not gotten an update", "Amina says Amina told
 * you" and "Musa Danjuma states that Musa never received it". A name after a word for what somebody said is the same person, said as
 * "they", wherever it stands in the sentence, with or without "that". No he or she is guessed.
 */
const NAMES = ['Hauwa Ibrahim', 'Jide Sanusi', 'Daniel Park', 'Joseph Mwangi', 'Laura Whitfield', 'Victor Almeida', 'Dr Amina Bello', 'Musa Danjuma'];

describe('a name after "says" is the same person, said once', () => {
  it.each([
    ['Hauwa says Hauwa told the field officer about an income problem, but nothing was done.', 'Hauwa says they told the field officer about an income problem, but nothing was done.'],
    ['Hauwa Ibrahim says Hauwa told the field officer about an income problem.', 'Hauwa Ibrahim says they told the field officer about an income problem.'],
    ['Jide Sanusi says Jide has not been told about anything that is not written down.', 'Jide Sanusi says they have not been told about anything that is not written down.'],
    ['Daniel Park says Daniel has not focused on the social side of the team yet.', 'Daniel Park says they have not focused on the social side of the team yet.'],
    ['Joseph says Joseph assumed someone had told the project manager.', 'Joseph says they assumed someone had told the project manager.'],
    ['Laura Whitfield says Laura was responsible for the overall success of the launch.', 'Laura Whitfield says they were responsible for the overall success of the launch.'],
    ['Victor Almeida says Victor has not gotten an update from the team.', 'Victor Almeida says they have not gotten an update from the team.'],
    ['Dr Amina Bello says Amina told you this in the interview, but has not used the word.', 'Dr Amina Bello says they told you this in the interview, but has not used the word.'],
    ['The records show the asset was delivered, but Musa Danjuma states that Musa never received it.', 'The records show the asset was delivered, but Musa Danjuma states that they never received it.'],
  ])('%s', (before, after) => {
    expect(aNameSaidAgainInOneSentence(before, NAMES)).toBe(after);
  });

  it('somebody else after "says" is left alone', () => {
    expect(aNameSaidAgainInOneSentence('Jide Sanusi says Daniel has not been told.', NAMES)).toBe('Jide Sanusi says Daniel has not been told.');
  });
});

describe('and it reads so for the lead, a participant and an admin', () => {
  const people = [
    ['p-amaka', 'u-amaka', 'Amaka', 'Nwachukwu', PartyType.INITIATOR],
    ['p-hauwa', 'u-hauwa', 'Hauwa', 'Ibrahim', PartyType.PARTICIPANT],
    ['p-musa', 'u-musa', 'Musa', 'Danjuma', PartyType.PARTICIPANT],
  ].map(([id, userId, firstName, lastName, partyType], i) => ({ id, userId, partyType, createdAt: new Date(2026, 8, i + 1), email: `${i}@x.test`, managingOnly: false, roleAsDescribed: null, nameGiven: null, user: { firstName, lastName } }));
  const labels = labelsForParties(people as any);
  const H = labels.get('p-hauwa')!;
  const read = (pid: string | null, lead: boolean) =>
    (Object.create(ReportsService.prototype) as any).theReportAsItWasShared(
      { scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, initiatorId: 'u-amaka', participants: people, report: { sharedPicture: `${H} says ${H} told the field officer about an income problem.` } },
      pid, lead,
    ).sharedPicture as string;

  it.each([['Amaka, who runs it', 'p-amaka', true], ['an admin', null, true], ['Musa, a participant', 'p-musa', false]])('%s', (_who, pid, lead) => {
    expect(read(pid as string | null, lead as boolean)).toMatch(/^Hauwa( Ibrahim)? says they told the field officer about an income problem\.$/);
  });
});
