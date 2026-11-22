import { PartyType } from '@prisma/client';
import { boardAs, person } from './the-switchboards-sections-harness';
import { theJourneySoFar } from './a-measure-that-goes-down-is-still-going-well';
import { theNumbersPeopleCanRead, aboutTheSpeaker, anAimAsASentence, aThingToDoIsWhatItCounts } from './an-aim-is-a-sentence-about-somebody';

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
  /* Decision 86 reverses decision 73 for admins: this used to pin that the admin read the team's aim alone. */
  it('an admin outside the check-in reads every aim, each by its person\'s name', async () => {
    expect(await namesAs(people, 'u-bisi', objectives, ...ADMIN)).toEqual([
      'Bisi Adeyemi is aiming for 120 million naira disbursed this quarter.',
      'Bisi Adeyemi is aiming for 40 approved facilities.',
      'Ngozi Eze is aiming for 14 approved facilities.',
    ]);
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

/*
 * A SPENDING LIMIT THAT HAS BEEN PASSED IS NOT A SUCCESS (1 October 2026). The workplan run counted the
 * requested 254,000 against the quarterly budget of 180,000, and the line read "It was 0 at the start
 * and is 254,000 now, so the aim of 180,000 has been reached."
 */
describe('the workplan board (run-21): the line under a budget', () => {
  const people = [person('p-helen', 'u-helen', 'Helen', 'Oyelaran', PartyType.INITIATOR), person('p-chidi', 'u-chidi', 'Chidi', 'Eze')];
  const BUDGET = aim('o-1', 'The requested spending of 254k needs to be reconciled with the quarterly budget of 180k.', 180000, null, 'p-helen', 254000);
  const OVER = 'It was 0 at the start and is 254,000 now, which is 74,000 over the limit of 180,000.';
  const linesAs = async (objectives: any[], userId: string, role = 'MEMBER') =>
    ((await boardAs({ people, initiatorId: 'u-helen', objectives, checkIns: [], snapshots: [{ objectiveId: 'o-1', count: 0 }] }, userId, role)).objectives ?? [])
      .filter((o: any) => o.id === 'o-1').map((o: any) => o.journey.say);
  for (const [who, userId, role] of [['Helen, the lead', 'u-helen', 'MEMBER'], ['Chidi', 'u-chidi', 'MEMBER'], ['an admin outside the check-in', 'u-admin', 'ADMIN']]) {
    it(`${who} reads that it is 74,000 over the limit`, async () => {
      expect(await linesAs([BUDGET], userId, role)).toEqual([OVER]);
    });
  }
  /* Where the 180,000 is also Helen's own number, which an admin outside may not read (decision 53),
     the admin loses the whole line, never half of it. Chidi and Helen still read it. */
  /* Decision 86: an admin may read the number now, so the admin reads the whole line too. */
  it('an admin reads the whole line, as everybody who may read the number does', async () => {
    const withHers = [BUDGET, aim('o-2', 'Helen is keeping spending within 180,000 this quarter.', 180000, 'p-helen', 'p-helen', 0)];
    expect(await linesAs(withHers, 'u-admin', 'ADMIN')).toEqual([OVER]);
    expect(await linesAs(withHers, 'u-chidi')).toEqual([OVER]);
    expect(await linesAs(withHers, 'u-helen')).toEqual([OVER]);
  });
});

describe('the line under each aim', () => {
  it('says how far over or within a limit, and claims nothing where it cannot tell', () => {
    expect(theJourneySoFar({ start: 0, now: 150000, target: 180000, name: 'The quarterly budget of 180k.' }).say).toBe('It was 0 at the start and is 150,000 now, within the limit of 180,000.');
    expect(theJourneySoFar({ start: 0, now: 254000, target: 180000, name: 'Spending this quarter.' }).say).toBe('It was 0 at the start and is 254,000 now, against 180,000.');
    expect(theJourneySoFar({ start: 0, now: 254000, target: 180000, name: 'Spending this quarter.' }).say).not.toMatch(/reached|aim/);
    expect(theJourneySoFar({ start: 0, now: 45, target: 40, name: 'Bisi is aiming for 40 approved facilities.' }).say).toBe('It was 0 at the start and is 45 now, so the aim of 40 has been reached.');
  });

  it('reads the run\'s numbers as full sentences', () => {
    /* Read on the run: "0 at the start, 0 now, said 120000000." */
    expect(theJourneySoFar({ start: 0, now: 0, target: 120000000 }).say).toBe('It was 0 at the start and is 0 now, and the aim is 120 million.');
    /* Read on the run: "0 at the start, 254000 now. That is where you said." */
    expect(theJourneySoFar({ start: 0, now: 254000, target: 180000, name: 'The requested spending of 254k needs to be reconciled with the quarterly budget of 180k.' }).say)
      .toBe('It was 0 at the start and is 254,000 now, which is 74,000 over the limit of 180,000.');
    /* Read on the run: "0 so far." */
    expect(theJourneySoFar({ start: null, now: 0, target: null }).say).toBe('Nothing has been counted for it yet.');
  });
  it('leaves a year and a small number alone', () => {
    expect(theNumbersPeopleCanRead('By 2026, 40 approved facilities and N31m disbursed.')).toBe('By 2026, 40 approved facilities and 31 million naira disbursed.');
  });
});

describe('an aim that starts with "My" (re-d, sales, Ngozi)', () => {
  it('is about the person who set it, never "my"', () => {
    expect(aboutTheSpeaker('My goal is 14 approved facilities this quarter.', 'Ngozi')).toBe("Ngozi's goal is 14 approved facilities this quarter.");
  });
});

describe('a name with no verb, and "my" in the lead\'s own line, as each reader reads them (1 October 2026)', () => {
  const people = [person('p-bisi', 'u-bisi', 'Bisi', 'Adeyemi', PartyType.INITIATOR), person('p-ngozi', 'u-ngozi', 'Ngozi', 'Eze')];
  const objectives = [
    { ...aim('o-1', 'Spending on field visits.', 180000, null, 'p-bisi'), direction: 'LIMIT' },
    aim('o-2', 'I need my team to stop missing documents.', null, null, 'p-bisi'),
  ];
  it('Bisi, the lead, reads a full sentence for each, and "your team"', async () => {
    expect(await namesAs(people, 'u-bisi', objectives, 'u-bisi')).toEqual([
      'The team is keeping spending on field visits to no more than 180,000.',
      'You need your team to stop missing documents.',
    ]);
  });
  it('Ngozi, in the check-in, reads them about the team and about Bisi, never "Bisi\'s team"', async () => {
    expect(await namesAs(people, 'u-bisi', objectives, 'u-ngozi')).toEqual([
      'The team is keeping spending on field visits to no more than 180,000.',
      'Bisi Adeyemi needs the team to stop missing documents.',
    ]);
  });
  it('an admin outside the check-in reads the same as Ngozi', async () => {
    expect(await namesAs(people, 'u-bisi', objectives, ...ADMIN)).toEqual([
      'The team is keeping spending on field visits to no more than 180,000.',
      'Bisi Adeyemi needs the team to stop missing documents.',
    ]);
  });
});

/* DROP ACCESS RE-READ, 22 NOVEMBER 2026: the number was said twice and the doing word kept, "Brian Otieno is aiming for 4 Activate 4 Drop Access points per week." */
describe('a thing to do is what it counts, whatever the doing word', () => {
  it('reads "Activate 4 Drop Access points per week" as the 4 points, said once', () => {
    expect(anAimAsASentence('Activate 4 Drop Access points per week', { speaker: 'Wairimu', holder: 'Brian Otieno', target: 4 })).toBe('Brian Otieno is aiming for 4 Drop Access points per week.');
    expect(anAimAsASentence('Sell 8 freezers per week', { speaker: 'Wairimu', holder: 'Brian Otieno', target: 8 })).toBe('Brian Otieno is aiming for 8 freezers per week.');
  });
  it('keeps a word that says how big the number is, and a currency in capitals', () => {
    expect(aThingToDoIsWhatItCounts('Over 5 complaints')).toBe('Over 5 complaints');
    expect(aThingToDoIsWhatItCounts('KES 600,000 in sales')).toBe('KES 600,000 in sales');
    expect(aThingToDoIsWhatItCounts('Bring in 5 new clients')).toBe('5 new clients');
  });
});

/* FINAL TEST, 22 NOVEMBER 2026: "The team is aiming for 4 each agent activates 4 points a week." A sentence that says its own number is
   the sentence, whatever its verb, for every reader. */
describe('a sentence that says its own number is kept, whatever its verb', () => {
  const said = (name: string, target: number, holder: string | null = null) => anAimAsASentence(name, { speaker: 'Pat Lead', holder, target });
  it('keeps a full sentence with a verb in no list', () => {
    expect(said('Each agent activates 4 points a week.', 4)).toBe('Each agent activates 4 points a week.');
    expect(said('Each of the four regions lands 50 new accounts.', 50)).toBe('Each of the four regions lands 50 new accounts.');
    expect(said('The teams hit a total revenue target of 12 million for the quarter.', 12_000_000)).toBe('The teams hit a total revenue target of 12 million for the quarter.');
  });
  it('still gives a name that only says what is counted its holder and its number', () => {
    expect(said('Spending on field visits.', 180_000)).toBe('The team is aiming for 180,000 spending on field visits.');
    expect(said('10,000 units', 10_000)).toBe('The team is aiming for 10,000 units.');
    expect(said('Activate 4 points a week', 4, 'Brian Otieno')).toBe('Brian Otieno is aiming for 4 points a week.');
    expect(aThingToDoIsWhatItCounts('Open 10 new leads weekly')).toBe('10 new leads weekly');
    expect(aThingToDoIsWhatItCounts('Sell 8 freezers per week.')).toBe('8 freezers per week.');
  });
});

/* RE-TEST, 22 NOVEMBER 2026 EVENING: the new lead's board read "The team is aiming for three teams will achieve a combined revenue of 12
   million for the period." The "The" before "three" was cut as if it were a doing word. Every name the set-ups of that run stored, as each
   reader's board says it (the board's withNames only swaps labels, and none of these holds a label). */
describe('an aim already written as a sentence reads as itself', () => {
  const said = (name: string, target: number | null, holder: string | null = null) => anAimAsASentence(name, { speaker: 'Pat Lead', holder, target });
  it('keeps "The three teams will achieve ..." whole', () => {
    expect(said('The three teams will achieve a combined revenue of 12 million for the period.', 12_000_000))
      .toBe('The three teams will achieve a combined revenue of 12 million for the period.');
    expect(aThingToDoIsWhatItCounts('The three teams will achieve a combined revenue of 12 million for the period.'))
      .toBe('The three teams will achieve a combined revenue of 12 million for the period.');
  });
  it('keeps every other sentence the set-ups stored that day', () => {
    for (const [name, n] of [
      ['The team is aiming for 50 new accounts per region in Q1.', 50],
      ['The team makes all deliveries within 2 days.', 2],
      ['The team keeps the cost per drop under 850.', 850],
      ['The team is aiming to reach 10,000 farmers in 3 counties this year.', 10_000],
      ['The team will pick two markets to enter next quarter.', 2],
      ['The team aims to hit 1 million in revenue.', 1_000_000],
    ] as Array<[string, number]>) expect(said(name, n)).toBe(name);
  });
  it('still cuts a doing word whose rest is only the thing counted', () => {
    expect(aThingToDoIsWhatItCounts('Sell 8 freezers per week')).toBe('8 freezers per week');
    expect(aThingToDoIsWhatItCounts('Activate 4 Drop Access points per week')).toBe('4 Drop Access points per week');
    expect(said('Activate 4 points a week', 4, 'Brian Otieno')).toBe('Brian Otieno is aiming for 4 points a week.');
    expect(aThingToDoIsWhatItCounts('Open 10 new leads weekly')).toBe('10 new leads weekly');
    expect(aThingToDoIsWhatItCounts('Sell 8 freezers per week.')).toBe('8 freezers per week.');
  });
});
