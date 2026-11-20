import { thisIsARoom, theRoom, theJudgementOverARoom, A_POPULATION_STARTS_AT } from './the-judgement-over-the-answers';
import * as fs from 'fs';
import * as path from 'path';

const person = (who: string, over: any = {}) => ({
  who, isLead: false, role: null, finding: null, patterns: [], openCommitments: [], ...over,
});

describe('a room is not a population', () => {
  it('counts anybody you could name as a room, and a corpus as a population', () => {
    expect(thisIsARoom(2)).toBe(true);
    expect(thisIsARoom(4)).toBe(true);
    /* A nine-person loan cohort went back to the population route and lost the finding. */
    expect(thisIsARoom(9)).toBe(true);
    expect(thisIsARoom(19)).toBe(true);
    expect(thisIsARoom(A_POPULATION_STARTS_AT)).toBe(false);
    expect(thisIsARoom(101)).toBe(false);
  });

  /*
   * The floor is NOT the one that decides whether a field can be ranked. Using one constant for
   * both is what put nine people on the wrong route.
   */
  it('does not borrow the field-ranking floor', () => {
    const { ENOUGH_TO_COUNT } = require('./the-judgement-over-the-answers');
    expect(A_POPULATION_STARTS_AT).not.toBe(ENOUGH_TO_COUNT);
    expect(A_POPULATION_STARTS_AT).toBe(20);
  });

  /* The run this came from: four salespeople, three of them "blocked" for three different reasons. */
  it('gives the model one block per person, not a count', () => {
    const out = theRoom([
      person('Femi', { role: 'Relationship officer, Lagos', finding: '31 applications, none submitted.', patterns: [{ name: 'Tasks are described without saying what they are for', observation: 'Calls, not documents.', seenInSessions: [1, 2, 3] }] }),
      person('Ngozi', { finding: 'Eleven files at credit committee, escalated once.' }),
    ], [], 3);
    expect(out).toContain('2 people, 3 check-ins.');
    expect(out).toContain('--- Femi');
    expect(out).toContain('31 applications, none submitted.');
    /* The plain name, never the code or the internal name: the lead reads what the model writes from this. */
    expect(out).toContain('seen in check-ins 1, 2, 3 (Tasks are described without saying what they are for)');
    expect(out).not.toMatch(/K5|Activity Without Outcome Logic/);
    expect(out).toContain('--- Ngozi');
  });

  /* "2 of 2 new hires are blocked" - one of the two was the chief executive. */
  it('marks the lead so they cannot be counted as one of the people being checked in on', () => {
    const out = theRoom([person('Dr Amina Bello', { isLead: true }), person('Tobi')], [], 4);
    expect(out).toContain('Dr Amina Bello (RUNS THIS CHECK-IN - not one of the people being checked in on)');
    expect(out).not.toContain('Tobi (RUNS THIS');
  });

  it('carries open commitments and the differences between accounts', () => {
    const out = theRoom(
      [person('Femi', { openCommitments: ['I will visit more businesses'] })],
      [{ topic: 'What is in the way', positions: [{ who: 'Femi', view: 'customers are slow' }, { who: 'Bisi', view: 'the committee is slow' }] }],
      2,
    );
    expect(out).toContain('said they would, nobody has closed it: "I will visit more businesses"');
    expect(out).toContain('WHERE THE ACCOUNTS DIFFER');
    expect(out).toContain('Femi: customers are slow');
  });

  describe('the instruction', () => {
    const it0 = theJudgementOverARoom('a founder', 'whether to keep somebody', 'Bisi Adeyemi');

    it('inverts the rule: a person in every sentence, not a count', () => {
      expect(it0).toContain('every sentence names a PERSON');
      expect(it0).toContain('Not "3 of 4"');
    });

    it('forbids merging people whose reasons differ, which is the defect it exists for', () => {
      expect(it0).toContain('NEVER MERGE TWO PEOPLE WHOSE REASONS DIFFER');
      expect(it0).toContain('three different conversations');
    });

    it('names the lead so they are not read as one of the people being checked in on', () => {
      expect(it0).toContain('THE PERSON RUNNING THIS IS Bisi Adeyemi');
      expect(theJudgementOverARoom('a founder', 'x', null)).toContain('One of these people runs the check-in');
    });

    it('still refuses to decide about anybody', () => {
      expect(it0).toContain('NEVER DECIDE ABOUT A PERSON');
      expect(it0).toContain('They decide.');
    });

    it('asks for a line about somebody doing the job well, not only problems', () => {
      expect(it0).toContain('a judgement that only names problems is not a judgement');
    });

    /*
     * Four people in one run each said, in their own words, that the same thing went wrong at the
     * start, and the judgement named two of them and never said it was one cause in how the thing
     * was set up. In another, three people each held one warning sign and nobody put them in order.
     */
    it('says a cause several people share once, names them all, and keeps a different reason apart', () => {
      expect(it0).toContain('THE SAME CAUSE IN SEVERAL BLOCKS IS ONE FINDING');
      expect(it0).toContain('say it once, as one cause, and name everyone it applies to');
      expect(it0).toContain('Keep anybody whose reason differs as a finding of their own');
      expect(it0).toContain('say what in the arrangement would need to change, but only as far as the blocks support it');
    });

    it('puts the pieces of one story in the order they happened', () => {
      expect(it0).toContain('PIECES OF ONE STORY GO IN ORDER');
      expect(it0).toContain('with the dates the blocks give');
      expect(it0).toContain('no one person had all of them');
      expect(it0).toContain('putting the pieces in order is not saying whose fault it was');
    });

    it('keeps both inside the limits that were already there', () => {
      expect(it0).toContain('NOTHING IS ANYBODY\'S FAULT UNLESS AN ACCOUNT SAYS SO');
      expect(it0).toContain('every sentence names a PERSON');
    });

    /* The rules are about any room, so the runs they came from must not leak into the words. */
    it('carries no word from the runs these rules came from', () => {
      for (const w of [/borrower/i, /repayment/i, /instalment/i, /grace period/i, /\bloan/i, /\bQBR/i, /quarterly review/i, /champion/i, /support ticket/i]) {
        expect(it0).not.toMatch(w);
      }
    });
  });

  it('and the service chooses between the two by headcount', () => {
    const src = fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/const asARoom = !!room\?\.people\?\.length && thisIsARoom\(room\.people\.length\)/);
    expect(src).toMatch(/instruction = theJudgementOverARoom\(/);
  });
});

/*
 * The room instruction landed and `whatToDo` came back EMPTY: the instruction says name a person
 * and never a proportion, and the schema it was filling asked for "the count that justifies it".
 */
describe('the room schema asks for what the room instruction asks for', () => {
  const { THE_ROOM_JUDGEMENT_SCHEMA, THE_JUDGEMENT_SCHEMA } = require('./the-judgement-over-the-answers');
  const room = THE_ROOM_JUDGEMENT_SCHEMA.input_schema.properties;
  const pop = THE_JUDGEMENT_SCHEMA.input_schema.properties;

  it('is the same shape, so nothing downstream knows which one ran', () => {
    expect(Object.keys(room).sort()).toEqual(Object.keys(pop).sort());
    expect(Object.keys(room.whatToDo.items.properties).sort()).toEqual(Object.keys(pop.whatToDo.items.properties).sort());
  });

  it('asks a move to be justified by the record rather than by a count', () => {
    expect(room.whatToDo.items.properties.because.description).toContain('record');
    expect(pop.whatToDo.items.properties.because.description).toContain('count');
  });

  it('asks who to start with by name, not by kind of organisation', () => {
    expect(room.whatToDo.items.properties.startWith.description).toContain('by name');
  });

  /* And it stops requiring the fields a room cannot fill, which is what emptied the array. */
  it('does not require a fieldId or a startWith a room has no way to give', () => {
    expect(room.whatTheNumbersSay.items.required).toEqual(['says', 'soWhat']);
    expect(room.whatToDo.items.required).toEqual(['move', 'because']);
    expect(pop.whatToDo.items.required).toContain('startWith');
  });

  it('asks for a line about somebody doing the job well', () => {
    expect(room.whatTheNumbersSay.description).toContain('doing the job well');
  });
});

/*
 * THE GUARD HAS TO BE THE ONE THE OUTPUT WAS WRITTEN FOR.
 *
 * The nine-borrower cohort logged "7 finding(s) carried no number and were dropped" and its
 * whatToDo came back empty twice. The room instruction says name a person and never a proportion;
 * this filter then deleted every sentence with a person in it and no digits.
 */
describe('a room finding is grounded in a person, not a count', () => {
  const SRC = fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('chooses the guard by which instruction wrote the output', () => {
    expect(SRC).toMatch(/const grounded = asARoom \? namesSomebody : everySentenceCarriesANumber;/);
  });

  it('checks a room sentence against the people actually in the room', () => {
    expect(SRC).toMatch(/const namesSomebody = \(text: string \| null \| undefined\): boolean =>/);
    expect(SRC).toMatch(/for \(const p of room\?\.people \?\? \[\]\)/);
  });

  /*
   * And by how a person is actually referred to. Requiring the whole label - "Relationship officer,
   * Ikeja. Target 14 approved facilities this quarter." - dropped four findings that said "the
   * Ikeja officer", which is how anybody would write it.
   */
  it('matches a word that belongs to one person and nobody else', () => {
    expect(SRC).toMatch(/const handlesOf = \(who: string\): string\[\]/);
    expect(SRC).toMatch(/theirOwnWords\.set\(p\.who, handlesOf\(p\.who\)\.filter\(\(w\) => !others\.includes\(w\)\)\)/);
  });

  it('does not let a generic role word stand in for a person', () => {
    const block = SRC.slice(SRC.indexOf('const generic = new Set('), SRC.indexOf('const handlesOf'));
    for (const w of ['officer', 'borrower', 'participant', 'initiator', 'manager']) expect(block).toContain(`'${w}'`);
  });

  /* Still a guard: an ungrounded sentence is still dropped, by the right standard. */
  it('still drops a finding that grounds itself in nothing', () => {
    expect(SRC).toMatch(/whatTheNumbersSay: \(judgement\.whatTheNumbersSay \?\? \[\]\)\.filter\(\(x: any\) => grounded\(x\?\.says\)\)/);
  });

  it('and says which standard it applied when it drops something', () => {
    expect(SRC).toMatch(/asARoom \? 'named nobody' : 'carried no number'/);
  });
});
