import { readFileSync } from 'fs';
import { join } from 'path';
import { praiseTheNumbersDoNotSupport, sentencesTheNumbersDoNotSupport, type APersonThePraiseCouldBeAbout } from './praise-the-numbers-do-not-support';
import { factsAbout } from './the-facts-about-a-person';

/*
 * "RECOGNISE KWAME MENSAH FOR EXCEEDING THEIR TARGET OF 14 APPROVED FACILITIES."
 *
 * Run 8, the sales scenario, as it is stored: with labels rather than names. Kwame is Participant C.
 * His target is 14 approved facilities; he has three approved and twenty-two applications.
 */
const KWAMES_ROLE = 'Relationship officer, Surulere. Target 14 approved facilities this quarter.';
const kwamesRecord = [
  { type: 'PROGRESS', text: "I'm actively working on all 22 of them.", session: 1 },
  { type: 'PROGRESS', text: 'All 22 facilities were pretty smooth, most of them just needed a little nudge.', session: 2 },
  { type: 'PROGRESS', text: 'I have three approved facilities already.', session: 3 },
  { type: 'INTENT', text: "I'm aiming for 14 approved facilities this quarter. That's my personal target.", session: 3 },
  { type: 'SUCCESS_DEFINITION', text: '14 approved facilities', session: 3 },
];
const factsFor = (said: { type: string; text: string; session: number }[]) =>
  factsAbout({ participantId: 'c', label: 'Participant C', isLead: false, said, targets: [] }, 3);

const kwame: APersonThePraiseCouldBeAbout = { who: 'Participant C', role: KWAMES_ROLE, facts: factsFor(kwamesRecord) };
const ngozi: APersonThePraiseCouldBeAbout = {
  who: 'Participant B',
  role: 'Relationship officer, Ikeja. Target 14 approved facilities this quarter.',
  facts: factsFor([{ type: 'PROGRESS', text: 'Six approved, and eleven complete files sitting at credit committee.', session: 2 }]),
};
const lead: APersonThePraiseCouldBeAbout = { who: 'the initiator', role: null, facts: null };

const RUN_8_MOVE = {
  move: 'Recognise Participant C for exceeding their target of 14 approved facilities.',
  because: "Participant C's record shows that 22 facilities were processed smoothly.",
  startWith: 'Participant C',
};
const A_GOOD_MOVE = {
  move: 'Speak with the Head of Credit about the 11 files from Participant B that are awaiting a response.',
  because: 'These files have been stuck for over a month.',
  startWith: 'Participant B',
};

describe('a judgement never praises a claim the record\'s own numbers contradict', () => {
  it('Kwame\'s facts carry both of his figures, which is what this reads', () => {
    expect(kwame.facts?.whereTheySayTheyAre).toBe('I have three approved facilities already');
    expect(kwame.facts?.anEarlierFigureTheyGave).toMatch(/22 facilities/);
  });

  it('the run-8 move is held back whole, and the move beside it is kept as it was', () => {
    const r = praiseTheNumbersDoNotSupport({ theGap: 'You blame the credit committee.', whatToDo: [A_GOOD_MOVE, RUN_8_MOVE], whatTheNumbersSay: [] }, [lead, ngozi, kwame]);
    expect(r.judgement.whatToDo).toEqual([A_GOOD_MOVE]);
    expect(r.heldBack).toEqual([RUN_8_MOVE.move]);
    expect(r.judgement.theGap).toBe('You blame the credit committee.');
  });

  it('the other stored lines from the same run are held back too', () => {
    const r = praiseTheNumbersDoNotSupport({
      theGap: 'You blame the credit committee for delays.',
      whatToDo: [{
        move: 'Ask Participant C how they achieved 22 approved facilities when their target was 14.',
        because: 'Participant C is exceeding their target and may have a method that can help the other officers.',
        startWith: 'Participant C',
      }],
      whatTheNumbersSay: [
        { says: 'Participant C reports 22 approved facilities against a target of 14.', soWhat: 'Participant C may have an approach the rest of the team can learn from.', fieldId: 'Participant C' },
        { says: 'Participant B has 11 files stuck with the Head of Credit.', soWhat: 'These are the most immediate blocker.', fieldId: 'Participant B' },
      ],
    }, [lead, ngozi, kwame]);
    expect(r.judgement.whatToDo).toEqual([]);
    expect(r.judgement.whatTheNumbersSay.map((x: any) => x.says)).toEqual(['Participant B has 11 files stuck with the Head of Credit.']);
    expect(r.heldBack).toHaveLength(2);
  });

  it('a sentence of the gap goes on its own, and a gap left with nothing is removed rather than blank', () => {
    const one = praiseTheNumbersDoNotSupport({
      theGap: 'You blame the credit committee. Participant C is ahead of their target of 14 approved facilities.',
      whatToDo: [A_GOOD_MOVE],
    }, [lead, ngozi, kwame]);
    expect(one.judgement.theGap).toBe('You blame the credit committee.');
    const only = praiseTheNumbersDoNotSupport({ theGap: 'Participant C has exceeded their target.', whatToDo: [A_GOOD_MOVE] }, [lead, kwame]);
    expect('theGap' in only.judgement).toBe(false);
    expect(only.judgement.whatToDo).toEqual([A_GOOD_MOVE]);
  });

  it('keeps praise the numbers support: 15 approved facilities against a target of 14', () => {
    const met: APersonThePraiseCouldBeAbout = {
      who: 'Participant C', role: KWAMES_ROLE,
      facts: factsFor([{ type: 'PROGRESS', text: 'I have 15 approved facilities so far this quarter.', session: 3 }]),
    };
    const j = { theGap: 'Participant C is ahead of their target.', whatToDo: [RUN_8_MOVE], whatTheNumbersSay: [] };
    const r = praiseTheNumbersDoNotSupport(j, [lead, met]);
    expect(r.judgement).toEqual(j);
    expect(r.heldBack).toEqual([]);
  });

  it('keeps praise where the count the record holds against the target reaches it', () => {
    const counted: APersonThePraiseCouldBeAbout = {
      who: 'Participant C', role: null,
      facts: { ...factsFor([{ type: 'PROGRESS', text: 'It has been a good month.', session: 3 }])!, numbers: [{ what: '14 approved facilities', target: 14, soFar: 16, setBy: 'the lead' }] },
    };
    const r = praiseTheNumbersDoNotSupport({ whatToDo: [RUN_8_MOVE] }, [counted]);
    expect(r.judgement.whatToDo).toEqual([RUN_8_MOVE]);
  });

  it('a figure in a different unit never meets the target: 22 in the pipeline is not 14 approved', () => {
    const pipeline: APersonThePraiseCouldBeAbout = {
      who: 'Participant C', role: KWAMES_ROLE,
      facts: factsFor([{ type: 'PROGRESS', text: "I've got 22 in the pipeline right now. So I'm ahead of schedule!", session: 3 }]),
    };
    const r = praiseTheNumbersDoNotSupport({ whatToDo: [RUN_8_MOVE, A_GOOD_MOVE] }, [lead, ngozi, pipeline]);
    expect(r.judgement.whatToDo).toEqual([A_GOOD_MOVE]);
    const applications: APersonThePraiseCouldBeAbout = {
      who: 'Participant C', role: KWAMES_ROLE,
      facts: factsFor([{ type: 'PROGRESS', text: 'I have 22 applications in.', session: 3 }]),
    };
    expect(praiseTheNumbersDoNotSupport({ whatToDo: [RUN_8_MOVE] }, [applications]).judgement.whatToDo).toEqual([]);
  });

  it('leaves a person with no target alone', () => {
    const noTarget: APersonThePraiseCouldBeAbout = {
      who: 'Participant C', role: 'Relationship officer, Surulere.',
      facts: factsFor([{ type: 'PROGRESS', text: 'All 22 facilities were pretty smooth.', session: 2 }]),
    };
    const j = { theGap: 'Participant C has exceeded their target.', whatToDo: [RUN_8_MOVE], whatTheNumbersSay: [] };
    const r = praiseTheNumbersDoNotSupport(j, [lead, noTarget]);
    expect(r.judgement).toEqual(j);
    expect(r.heldBack).toEqual([]);
  });

  it('leaves the true finding about Kwame alone: what he believes, and the difference', () => {
    const j = {
      theGap: 'Participant C believes they are ahead of their target, but only three of the 14 approved facilities are approved.',
      whatToDo: [{ move: 'Ask Participant C how many of the 22 applications are approved.', because: 'Participant C counts applications, not approvals.', startWith: 'Participant C' }],
      whatTheNumbersSay: [{ says: 'Participant C has three approved facilities of a target of 14.', soWhat: 'Participant C is 11 short.', fieldId: 'Participant C' }],
    };
    const r = praiseTheNumbersDoNotSupport(j, [lead, ngozi, kwame]);
    expect(r.judgement).toEqual(j);
  });

  it('does not touch praise of conduct rather than of a figure', () => {
    const j = { whatToDo: [{ move: 'Thank Participant B for escalating the files in writing.', because: 'Participant B is the only one who has escalated anything.', startWith: 'Participant B' }] };
    expect(praiseTheNumbersDoNotSupport(j, [lead, ngozi, kwame]).judgement).toEqual(j);
  });

  /*
   * EVERY SECTION, NOT ONLY THE MOVES. After the move and the line of numbers went, run 8's stored
   * judgement still told the lead, under what this cannot tell you, about "Participant C's 22
   * successful applications". Nothing in his record calls the 22 a success.
   */
  it('holds back the stored run-8 line in whatThisCannotTellYou, and keeps the one beside it', () => {
    const cannot = [
      { why: 'The record only shows that Participant B has escalated four times without a reply.', about: 'Why the Head of Credit has not responded to Participant B.', toKnow: 'The initiator would need to speak with the Head of Credit directly.' },
      { why: 'Participant C only stated that "All 22 facilities were pretty smooth".', about: "The details of Participant C's 22 successful applications.", toKnow: 'The initiator would need to ask Participant C for a breakdown of that work.' },
    ];
    const r = praiseTheNumbersDoNotSupport({ theGap: 'You blame the credit committee.', whatToDo: [A_GOOD_MOVE], whatThisCannotTellYou: cannot }, [lead, ngozi, kwame]);
    expect(r.judgement.whatThisCannotTellYou).toEqual([cannot[0]]);
    expect(r.heldBack).toEqual(["The details of Participant C's 22 successful applications."]);
  });

  it('holds back a figure called approved or completed that the record does not call so, in any section', () => {
    const r = praiseTheNumbersDoNotSupport({
      whatToDo: [A_GOOD_MOVE],
      whatWeFailedToAsk: [
        { about: 'How Participant C closed 22 approved facilities so quickly.', howManyMissedIt: 1 },
        { about: 'The monetary value of each person\'s applications.', howManyMissedIt: 3 },
      ],
      somethingAddedLater: [{ says: 'Participant C has 22 completed applications.' }],
    }, [lead, ngozi, kwame]);
    expect(r.judgement.whatWeFailedToAsk).toEqual([{ about: 'The monetary value of each person\'s applications.', howManyMissedIt: 3 }]);
    expect(r.judgement.somethingAddedLater).toEqual([]);
    expect(r.judgement.whatToDo).toEqual([A_GOOD_MOVE]);
  });

  it('keeps a figure called approved or complete where the record says so itself', () => {
    const j = {
      whatToDo: [{ move: 'Take the 11 complete files from Participant B to the credit committee.', because: 'Participant B has six approved and 11 complete files waiting.', startWith: 'Participant B' }],
      whatTheNumbersSay: [{ says: 'Participant C has three approved facilities and 22 applications.', soWhat: 'Participant C is 11 short.', fieldId: 'Participant C' }],
    };
    expect(praiseTheNumbersDoNotSupport(j, [lead, ngozi, kwame]).judgement).toEqual(j);
  });

  /*
   * THE FINDINGS AND THE OPENING, WHICH THE BOARD READS. His own words, and a plain report of what he
   * said, stay; only the product's own sentence calling the figure a success goes.
   */
  it('in a finding, keeps his own words and a plain report of them, and holds back the product\'s claim', () => {
    const finding = 'Participant C said "All 22 facilities were pretty smooth". He has three approved facilities against a target of 14. '
      + 'He has 22 successful applications and is ahead of his target.';
    const r = sentencesTheNumbersDoNotSupport(finding, [lead, ngozi, kwame], 'Participant C');
    expect(r.text).toBe('Participant C said "All 22 facilities were pretty smooth". He has three approved facilities against a target of 14.');
    expect(r.heldBack).toEqual(['He has 22 successful applications and is ahead of his target.']);
    const plain = 'Participant C says all 22 of his facilities went smoothly. He has three approved facilities.';
    expect(sentencesTheNumbersDoNotSupport(plain, [lead, ngozi, kwame], 'Participant C').text).toBe(plain);
  });

  it('in the opening, holds back the sentence and keeps the paragraphs around it', () => {
    const opening = 'Three people have answered.\n\nParticipant C has 22 approved facilities. Participant B has 11 files at credit committee.';
    const r = sentencesTheNumbersDoNotSupport(opening, [lead, ngozi, kwame]);
    expect(r.text).toBe('Three people have answered.\n\nParticipant B has 11 files at credit committee.');
  });

  /*
   * WHAT THE FIRST LIVE RUNS HELD BACK AND MUST NOT HAVE. Two sales runs on the first version (praise-1
   * and praise-2), with the records those people really gave. A goal is not a claim: the figure in
   * it is the target. And a figure the record gives, in the same unit, is true.
   */
  describe('keeps a goal and a true figure, with the records from the live runs', () => {
    const who = (label: string, role: string | null, said: string[]): APersonThePraiseCouldBeAbout => ({
      who: label, role,
      facts: factsAbout({ participantId: label, label, isLead: label === 'the initiator', targets: [],
        said: said.map((text, i) => ({ type: 'PROGRESS', text, session: i + 1 })) }, said.length),
    });
    const initiator = who('the initiator', null, [
      'Seven weeks into the quarter and the team has 11 approved facilities and N31 million disbursed',
      'The team has disbursed N31 million so far',
    ]);
    const a = who('Participant A', 'Relationship officer, Lagos mainland. Target 12 approved facilities this quarter.', [
      'I have had two facilities approved this quarter', 'The two approvals are still holding, no changes',
    ]);
    const b = who('Participant B', 'Relationship officer, Ikeja. Target 14 approved facilities this quarter.', [
      'I have eleven complete files at the credit committee', 'My total disbursed is N19 million',
    ]);
    const cPraise1 = who('Participant C', KWAMES_ROLE, [
      'Three of those applications approved and disbursed, so that is N8 million', 'I have three approved facilities so far this quarter',
    ]);
    const cPraise2 = who('Participant C', KWAMES_ROLE, [
      'I have disbursed N8 million so far this quarter', "The credit committee approved it. That's one of the three approvals I mentioned",
    ]);
    const room1 = [initiator, a, b, cPraise1];
    const room2 = [initiator, a, b, cPraise2];
    /* Run 8's own room: the initiator's record says N35 million disbursed. */
    const room8 = [who('the initiator', null, ["For the deals that were ready last week, an additional N4 million was disbursed. So, we're now at N35 million"]), ngozi, kwame];
    const LOGGED = [
      'Participant B is working to get 14 approved facilities.',
      'Participant B is working to achieve 14 approved facilities this quarter.',
      'Participant A is to bring in 12 approved facilities this quarter.',
      "The initiator's goal is 40 approved facilities and N120 million disbursed this quarter.",
      "The initiator is tracking the team's target of 40 approved facilities and N120 million disbursed.",
      'Both the initiator and the participants agree on the overall team goal of 40 approved facilities.',
      'Participant C has three approvals and is waiting on the underwriting team for the others.',
      "The initiator says the team's target is 40 approved facilities and N120 million disbursed, and that N35 million has been disbursed so far.",
    ];
    for (const sentence of LOGGED) {
      it(`keeps "${sentence}"`, () => {
        for (const room of [room1, room2, room8]) {
          expect(sentencesTheNumbersDoNotSupport(sentence, room)).toEqual({ text: sentence, heldBack: [] });
          const j = { whatToDo: [{ move: sentence, because: 'The record says so.', startWith: 'Participant B' }], whatTheNumbersSay: [{ says: sentence, soWhat: 'It matters.', fieldId: 'the initiator' }] };
          expect(praiseTheNumbersDoNotSupport(j, room).judgement).toEqual(j);
        }
      });
    }

    it('still holds back the Kwame lines against the praise-2 record, where "three approvals" is his own figure', () => {
      const r = praiseTheNumbersDoNotSupport({
        whatToDo: [RUN_8_MOVE, A_GOOD_MOVE],
        whatThisCannotTellYou: [{ why: 'The record is thin.', about: "The details of Participant C's 22 successful applications.", toKnow: 'Ask.' }],
      }, [...room2.slice(0, 3), { ...cPraise2, facts: factsFor(kwamesRecord) }]);
      expect(r.judgement.whatToDo).toEqual([A_GOOD_MOVE]);
      expect(r.judgement.whatThisCannotTellYou).toEqual([]);
    });
  });

  it('the findings, the opening and the picture are held to the numbers before the board can read them', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const src = strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'));
    expect(src).toMatch(/picture\.opening = heldToTheNumbers\(picture\.opening/);
    expect(src).toMatch(/text: heldToTheNumbers\(written\?\.text/);
    expect(src).toMatch(/const modelHalf = heldToTheNumbers\(/);
    expect(src.indexOf('text: heldToTheNumbers(')).toBeLessThan(src.indexOf('const productHalf'));
  });

  it('runs where the judgement is stored, after the move is worded for the reader, and logs what it held back', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const src = strip(readFileSync(join(__dirname, 'reports.service.ts'), 'utf8'));
    const worded = src.indexOf('aMoveForTheReader(x.move');
    const held = src.indexOf('praiseTheNumbersDoNotSupport(');
    /* The judgement is now returned with the id of the prompt version that wrote it (d2e3e34b); the line is matched as
       exactly as before, and the order it guards is the same: worded, then held to the numbers, then returned. */
    const returned = src.indexOf('return { judgement: { ...kept, promptVersionId: stored?.id ?? null }, table }');
    expect(worded).toBeGreaterThan(-1);
    expect(held).toBeGreaterThan(worded);
    expect(returned).toBeGreaterThan(held);
    expect(src.slice(held, returned)).toMatch(/logger\.warn\(/);
  });
});
