import { PartyType } from '@prisma/client';
import { boardAs, person } from './the-switchboards-sections-harness';
import { theJourneySoFar } from './a-measure-that-goes-down-is-still-going-well';
import { theNumbersPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';

/**
 * THE NAME OF EVERY AIM, AS EACH PERSON READS IT ON THE BOARD (review of 1 October 2026, row 113).
 *
 * Every stored name below is word for word what the run stored: api/journey/all-24/re-a/sales.json
 * and re-a/seniorhire.json, run-21/advisor.json, run-21/cofounder.json and run-21/workplan.json. The
 * board served them as they were stored, to the lead, to a participant and to an admin outside the
 * check-in. Now each is one full sentence about a person by name, "you" for the reader, and numbers a
 * person can read.
 */
const aim = (id: string, name: string, target: number | null, owner: string | null, setBy: string, count = 0) => ({
  id, groundId: 'g-1', name, target, count, prevCount: count, ownerParticipantId: owner, setByParticipantId: setBy, sortOrder: 0, addedAtSession: null,
});
const ADMIN = ['u-admin', 'ADMIN'] as const;
async function namesAs(people: any[], lead: string, objectives: any[], userId: string, role = 'MEMBER'): Promise<string[]> {
  const b = await boardAs({ people, initiatorId: lead, objectives, checkIns: [] }, userId, role);
  return (b.objectives ?? []).map((o: any) => o.name);
}

describe('the sales board (re-a)', () => {
  const people = [person('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', PartyType.INITIATOR), person('p-femi', 'u-femi', 'Femi', 'Okonkwo'), person('p-ngozi', 'u-ngozi', 'Ngozi', 'Eze')];
  const objectives = [
    aim('o-1', "I'm aiming for N120 million disbursed this quarter.", 120000000, null, 'p-bisi'),
    aim('o-2', 'approved facilities', 40, 'p-bisi', 'p-bisi'),
    aim('o-3', 'approved facilities', 14, 'p-ngozi', 'p-bisi'),
  ];
  it('Bisi, the lead, reads each aim as hers or Ngozi\'s, in full sentences', async () => {
    expect(await namesAs(people, 'u-bisi', objectives, 'u-bisi')).toEqual([
      'You are aiming for 120 million naira disbursed this quarter.',
      'You are aiming for 40 approved facilities.',
      'Ngozi Eze is aiming for 14 approved facilities.',
    ]);
  });
  it('Ngozi reads Bisi\'s aim by Bisi\'s name, and her own number as hers', async () => {
    expect(await namesAs(people, 'u-bisi', objectives, 'u-ngozi')).toEqual([
      'Bisi Adeyemi is aiming for 120 million naira disbursed this quarter.',
      'You are aiming for 14 approved facilities.',
    ]);
  });
  it('Femi reads the team\'s aim and nobody else\'s number', async () => {
    expect(await namesAs(people, 'u-bisi', objectives, 'u-femi')).toEqual(['Bisi Adeyemi is aiming for 120 million naira disbursed this quarter.']);
  });
  it('an admin outside the check-in reads the team\'s aim by Bisi\'s name', async () => {
    expect(await namesAs(people, 'u-bisi', objectives, ...ADMIN)).toEqual(['Bisi Adeyemi is aiming for 120 million naira disbursed this quarter.']);
  });
});

describe('an aim the extraction now writes by name', () => {
  const people = [person('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', PartyType.INITIATOR), person('p-femi', 'u-femi', 'Femi', 'Okonkwo')];
  const objectives = [aim('o-1', 'Bisi is aiming for 40 approved facilities this quarter.', 40, null, 'p-bisi')];
  it('Bisi reads it as "you", Femi and an admin by her name', async () => {
    expect(await namesAs(people, 'u-bisi', objectives, 'u-bisi')).toEqual(['You are aiming for 40 approved facilities this quarter.']);
    expect(await namesAs(people, 'u-bisi', objectives, 'u-femi')).toEqual(['Bisi is aiming for 40 approved facilities this quarter.']);
    expect(await namesAs(people, 'u-bisi', objectives, ...ADMIN)).toEqual(['Bisi is aiming for 40 approved facilities this quarter.']);
  });
});

describe('the seniorhire board (re-a)', () => {
  const people = [person('p-amina', 'u-amina', 'Dr Amina', 'Bello', PartyType.INITIATOR), person('p-tobi', 'u-tobi', 'Tobi', 'Adewale')];
  const objectives = [aim('o-1', 'I stop being invited to every single call.', null, null, 'p-amina')];
  it('Amina reads it as hers', async () => {
    expect(await namesAs(people, 'u-amina', objectives, 'u-amina')).toEqual(['You stop being invited to every single call.']);
  });
  it('Tobi and an admin read it by her name', async () => {
    expect(await namesAs(people, 'u-amina', objectives, 'u-tobi')).toEqual(['Dr Amina Bello stops being invited to every single call.']);
    expect(await namesAs(people, 'u-amina', objectives, ...ADMIN)).toEqual(['Dr Amina Bello stops being invited to every single call.']);
  });
});

describe('the advisor board (run-21): never "the person"', () => {
  const people = [person('p-grace', 'u-grace', 'Grace', 'Mutiso', PartyType.INITIATOR), person('p-peter', 'u-peter', 'Peter', 'Kimani')];
  const objectives = [aim('o-1', 'The person wants introductions to decision-makers at Equity Bank, KCB, and Co-operative Bank.', null, null, 'p-grace')];
  it('Grace reads it as hers, Peter and an admin by her name', async () => {
    expect(await namesAs(people, 'u-grace', objectives, 'u-grace')).toEqual(['You want introductions to decision-makers at Equity Bank, KCB, and Co-operative Bank.']);
    expect(await namesAs(people, 'u-grace', objectives, 'u-peter')).toEqual(['Grace Mutiso wants introductions to decision-makers at Equity Bank, KCB, and Co-operative Bank.']);
    expect(await namesAs(people, 'u-grace', objectives, ...ADMIN)).toEqual(['Grace Mutiso wants introductions to decision-makers at Equity Bank, KCB, and Co-operative Bank.']);
  });
});

describe('the cofounder board (run-21): never "the speaker"', () => {
  const people = [person('p-ada', 'u-ada', 'Ada', 'Nwosu', PartyType.INITIATOR), person('p-tunde', 'u-tunde', 'Tunde', 'Bakare')];
  const objectives = [aim('o-1', 'Tunde owns the technical side and builds a strong engineering culture, enabling the speaker to focus on business growth and customer understanding.', null, null, 'p-ada')];
  it('Ada, Tunde and an admin each read it from their side', async () => {
    expect(await namesAs(people, 'u-ada', objectives, 'u-ada')).toEqual(['Tunde owns the technical side and builds a strong engineering culture, enabling you to focus on business growth and customer understanding.']);
    expect(await namesAs(people, 'u-ada', objectives, 'u-tunde')).toEqual(['You own the technical side and build a strong engineering culture, enabling Ada Nwosu to focus on business growth and customer understanding.']);
    expect(await namesAs(people, 'u-ada', objectives, ...ADMIN)).toEqual(['Tunde owns the technical side and builds a strong engineering culture, enabling Ada Nwosu to focus on business growth and customer understanding.']);
  });
});

describe('the workplan board (run-21): numbers a person can read', () => {
  const people = [person('p-helen', 'u-helen', 'Helen', 'Oyelaran', PartyType.INITIATOR), person('p-chidi', 'u-chidi', 'Chidi', 'Eze')];
  const objectives = [aim('o-1', 'The requested spending of 254k needs to be reconciled with the quarterly budget of 180k.', 180000, null, 'p-helen', 254000)];
  for (const [who, userId, role] of [['Helen, the lead', 'u-helen', 'MEMBER'], ['Chidi', 'u-chidi', 'MEMBER'], ['an admin', 'u-admin', 'ADMIN']]) {
    it(`${who} reads 254,000 and 180,000`, async () => {
      expect(await namesAs(people, 'u-helen', objectives, userId, role)).toEqual(['The requested spending of 254,000 needs to be reconciled with the quarterly budget of 180,000.']);
    });
  }
});

describe('the line under each aim', () => {
  it('reads the run\'s numbers as full sentences', () => {
    /* Read on the run: "0 at the start, 0 now, said 120000000." */
    expect(theJourneySoFar({ start: 0, now: 0, target: 120000000 }).say).toBe('It was 0 at the start and is 0 now, and the aim is 120 million.');
    /* Read on the run: "0 at the start, 254000 now. That is where you said." */
    expect(theJourneySoFar({ start: 0, now: 254000, target: 180000 }).say).toBe('It was 0 at the start and is 254,000 now, so the aim of 180,000 has been reached.');
    /* Read on the run: "0 so far." */
    expect(theJourneySoFar({ start: null, now: 0, target: null }).say).toBe('Nothing has been counted for it yet.');
  });
  it('leaves a year and a small number alone', () => {
    expect(theNumbersPeopleCanRead('By 2026, 40 approved facilities and N31m disbursed.')).toBe('By 2026, 40 approved facilities and 31 million naira disbursed.');
  });
});
