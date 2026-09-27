import { ReportsService } from './reports.service';
import { whatAParticipantMayRead } from './the-judgement-is-the-leads';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * "PARTICIPANT B BUILT THE FRONT END", READ BY THE PERSON THE CHECK-IN IS ABOUT.
 *
 * Run-1, the recognition check-in, in the report Amara Diallo opens about her own launch:
 *
 *   "Participant B built the front end for the project. Participant B says the hardest part of
 *    the work was Victor's script."
 *
 * and the contract-renewal one, in Blessing Okafor's:
 *
 *   "Participant B says the most frequent issue has been around handover times."
 *
 * Nothing leaked. Both are evaluation check-ins, `peersAreNamed` is false, and a colleague's name
 * is deliberately kept from the person being reviewed. The rule is right and stays exactly as it
 * is. What was wrong is the WORD: a slot out of a template, read by somebody about their own
 * colleague, on the one screen whose whole claim is that it keeps track of who said what.
 *
 * Hafsah decided the wording on 26 September 2026: "a colleague" when there is one; "one
 * colleague", "another colleague" when there are several, used the same way through the whole
 * report, never "Participant B", and never a job title or detail that would give them away.
 *
 * ASSERTED ON WHAT COMES OUT OF THE DOOR. `theReportAsItWasShared` is the read every report and
 * every board goes through, and everything under it is pure, so the prototype runs the real one.
 * These cases read the served strings, as the reviewed person, the way a test of my own helper
 * could not: they would still fail if the helper were right and nothing called it.
 */

const at = (h: number) => new Date(`2026-09-0${h}T09:00:00Z`);

const LAURA = {
  id: 'p-laura',
  partyType: PartyType.INITIATOR,
  roleAsDescribed: 'Product manager. Ran the launch.',
  email: 'laura@launch.test',
  createdAt: at(1),
  user: { firstName: 'Laura', lastName: 'Whitfield' },
};
const AMARA = {
  id: 'p-amara',
  partyType: PartyType.PARTICIPANT,
  roleAsDescribed: 'Product designer. Did the flow design.',
  email: 'amara@launch.test',
  createdAt: at(2),
  user: { firstName: 'Amara', lastName: 'Diallo' },
};
const JOSEPH = {
  id: 'p-joseph',
  partyType: PartyType.PARTICIPANT,
  roleAsDescribed: 'Engineer on the launch.',
  email: 'joseph@launch.test',
  createdAt: at(3),
  user: { firstName: 'Joseph', lastName: 'Mwangi' },
};
const PRIYA = {
  id: 'p-priya',
  partyType: PartyType.PARTICIPANT,
  roleAsDescribed: 'Engineer on the launch.',
  email: 'priya@launch.test',
  createdAt: at(4),
  user: { firstName: 'Priya', lastName: 'Shah' },
};

/** The lines the run actually produced, with the labels the report is stored in. */
const STORED = {
  sharedAs: null,
  sharedPicture:
    'All three people have checked in. They disagree on the main reason for the successful launch.\n\n'
    + 'The initiator reports deciding on the final design of the onboarding flow.\n\n'
    + 'Participant A says the launch went smoothly because a migration script moved 60,000 users.\n\n'
    + 'Participant B built the front end for the project. Participant B says the hardest part of '
    + "the work was Victor's script.",
  centralQuestion: 'Who actually carried the launch?',
  agreements: ['Participant A and Participant B both describe a high-quality user experience.'],
  divergences: [
    {
      topic: 'What made the launch work',
      positions: [
        { participantLabel: 'the initiator', says: 'The design carried it.' },
        { participantLabel: 'Participant A', says: 'The migration script carried it.' },
        { participantLabel: 'Participant B', says: 'The design carried it.' },
      ],
    },
  ],
  inferences: [{ id: 'i1', participantLabel: 'Participant B', text: 'Participant B assumed somebody had told the initiator.', reason: 'Said so directly.' }],
  engagement: {
    parties: [
      { label: 'the initiator', sessions: 1, contributed: true },
      { label: 'Participant A', sessions: 1, contributed: true },
      { label: 'Participant B', sessions: 1, contributed: true },
    ],
  },
};

const recognitionGround = (participants: any[]): any => ({
  scenario: GroundScenario.RECOGNITION,
  peersVisibleToEachOther: null,
  participants,
  report: STORED,
});

const readAs = (ground: any, participantId: string | null, isLead: boolean) =>
  (Object.create(ReportsService.prototype) as ReportsService).theReportAsItWasShared(ground, participantId, isLead) as any;

/**
 * Every SENTENCE the reader is served, as one searchable piece of text.
 *
 * `label` and `participantLabel` are left out, and only those two. They are keys rather than
 * prose: `own-reads-only` filters a person's rows by matching on them, so a phrase in one would
 * let two people share a key and hand somebody another person's private rows. The one place a
 * key of that kind is printed to a person - the caption on a difference - is asserted by name
 * below, as is the fact that the keys themselves stay raw.
 */
const everythingRead = (served: any) =>
  JSON.stringify(served, (key, value) => (key === 'label' || key === 'participantLabel' ? undefined : value));

describe('what the person being reviewed reads about a colleague they may not name', () => {
  const served = () =>
    whatAParticipantMayRead(readAs(recognitionGround([LAURA, AMARA, JOSEPH]), 'p-amara', false), {
      isLead: false,
      participantId: 'p-amara',
    });

  it('never reads the word "Participant" anywhere in the report', () => {
    expect(everythingRead(served())).not.toMatch(/[Pp]articipant [A-Z]\b/);
  });

  it('reads plain sentences about a colleague instead, in Hafsah\'s words', () => {
    expect(served().sharedPicture).toBe(
      'All three people have checked in. They disagree on the main reason for the successful launch.\n\n'
      + 'Laura Whitfield reports deciding on the final design of the onboarding flow.\n\n'
      + 'You say the launch went smoothly because a migration script moved 60,000 users.\n\n'
      /* The second mention says it is the same person (Hafsah, 27 September 2026). It read "A
         colleague says", which could be somebody else. */
      + 'A colleague built the front end for the project. The same colleague says the hardest part of '
      + "the work was Victor's script.",
    );
  });

  it('calls that one person the same thing in every part of the report', () => {
    const out = served();
    expect(out.sharedPicture).toContain('A colleague built the front end');
    expect(out.agreements[0]).toBe('You and a colleague both describe a high-quality user experience.');
    /* The header a page prints beside each row, which used to say "Participant B". */
    expect(out.engagement.parties.map((p: any) => p.who)).toEqual(['Laura Whitfield', 'Amara Diallo', 'a colleague']);
  });

  it('and the same thing again on the board, which reads the same door', () => {
    /* The board takes the whole served report, including the two parts a participant's own
       report leaves out. Same phrase, so one person is not two people across two screens. */
    const forTheBoard = readAs(recognitionGround([LAURA, AMARA, JOSEPH]), 'p-amara', false);
    expect(forTheBoard.divergences[0].positions.map((p: any) => p.participantLabel))
      /* A caption on a card, so it opens with a capital exactly as "You" beside it does. */
      .toEqual(['Laura Whitfield', 'You', 'A colleague']);
    expect(forTheBoard.inferences[0].text).toBe('A colleague assumed somebody had told Laura Whitfield.');
    expect(everythingRead(forTheBoard)).not.toMatch(/[Pp]articipant [A-Z]\b/);
  });

  it('but the raw label is still on the row, because the private-rows filter matches on it', () => {
    /* `own-reads-only` keeps a person's own quality read by `row.label === viewerLabel`. Put a
       phrase in there and two people share one key, and the filter hands one of them the
       other's rows. This is the reason `label` is the one field a name never goes into. */
    expect(served().engagement.parties.map((p: any) => p.label))
      .toEqual(['the initiator', 'Participant A', 'Participant B']);
  });

  it('never gives the colleague away by their job', () => {
    /* Joseph's row says "Engineer on the launch." There is one engineer on this check-in, so
       printing the role would name him as surely as his name would. */
    expect(everythingRead(served())).not.toContain('Engineer on the launch');
  });

  it('still tells the reader nothing they were not already entitled to', () => {
    const text = everythingRead(served());
    expect(text).not.toContain('Joseph');
    expect(text).not.toContain('Mwangi');
    expect(text).not.toContain('joseph@launch.test');
  });

});

describe('and where there are several of them', () => {
  /*
   * Hafsah's words for more than one: "one colleague", "another colleague", "a third colleague",
   * and a later mention in the same text says which one it is: "the first colleague", "the second
   * colleague" (27 September 2026). Which person is
   * which comes from the order the parties were added to the check-in, not from the order a
   * sentence happens to mention them - so the second paragraph below, which names them the other
   * way round, still calls the same person the same thing.
   */
  const FOUR = {
    ...STORED,
    sharedPicture:
      'Participant B built the front end. Participant C wrote the tests.\n\n'
      + 'Participant C says the tests were the slow part, and Participant B agrees.',
    agreements: ['Participant B and Participant C both describe a high-quality user experience.'],
    engagement: {
      parties: [
        { label: 'the initiator', sessions: 1, contributed: true },
        { label: 'Participant A', sessions: 1, contributed: true },
        { label: 'Participant B', sessions: 1, contributed: true },
        { label: 'Participant C', sessions: 1, contributed: true },
      ],
    },
  };

  const served = () =>
    whatAParticipantMayRead(
      readAs(
        { scenario: GroundScenario.RECOGNITION, peersVisibleToEachOther: null, participants: [LAURA, AMARA, JOSEPH, PRIYA], report: FOUR },
        'p-amara',
        false,
      ),
      { isLead: false, participantId: 'p-amara' },
    );

  it('reads "one colleague" and "another colleague", and a second mention says which one it is', () => {
    /* It read "Another colleague says the tests were the slow part, and a colleague agrees.", which
       reads as two more people. */
    expect(served().sharedPicture).toBe(
      'One colleague built the front end. Another colleague wrote the tests.\n\n'
      + 'The second colleague says the tests were the slow part, and the first colleague agrees.',
    );
    /* A single sentence takes the first-mention words. */
    expect(served().agreements[0]).toBe('One colleague and another colleague both describe a high-quality user experience.');
    expect(served().engagement.parties.map((p: any) => p.who)).toEqual([
      'Laura Whitfield', 'Amara Diallo', 'one colleague', 'another colleague',
    ]);
  });

  it('and reads no "Participant" and no job anywhere', () => {
    const text = everythingRead(served());
    expect(text).not.toMatch(/[Pp]articipant [A-Z]\b/);
    expect(text).not.toContain('Engineer on the launch');
    expect(text).not.toContain('Joseph');
    expect(text).not.toContain('Priya');
  });
});

describe('and the lead of the same check-in reads every name, exactly as before', () => {
  it('because who may be named has not changed', () => {
    const out = readAs(recognitionGround([LAURA, AMARA, JOSEPH]), 'p-laura', true);
    expect(out.sharedPicture).toContain('Amara Diallo says the launch went smoothly');
    expect(out.sharedPicture).toContain('Joseph Mwangi built the front end');
    expect(everythingRead(out)).not.toContain('colleague');
  });
});

describe('and where people are named to each other, nothing changes at all', () => {
  /* The control. An OKR check-in names peers, so every label resolves and no phrase is reached. */
  const okr = (): any => ({
    scenario: GroundScenario.OKR_ALIGNMENT,
    peersVisibleToEachOther: null,
    participants: [LAURA, AMARA, JOSEPH],
    report: STORED,
  });

  it('a participant still reads their colleague by name', () => {
    const out = whatAParticipantMayRead(readAs(okr(), 'p-amara', false), { isLead: false, participantId: 'p-amara' });
    expect(out.sharedPicture).toContain('Joseph Mwangi built the front end for the project.');
    expect(out.agreements[0]).toBe('You and Joseph Mwangi both describe a high-quality user experience.');
    expect(out.engagement.parties.map((p: any) => p.who)).toEqual(['Laura Whitfield', 'Amara Diallo', 'Joseph Mwangi']);
    expect(everythingRead(out)).not.toContain('colleague');
  });
});
