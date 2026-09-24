import { thisIsARoom, theRoom, theJudgementOverARoom, A_POPULATION_STARTS_AT } from './the-judgement-over-the-answers';
import * as fs from 'fs';
import * as path from 'path';

const person = (who: string, over: any = {}) => ({
  who, isLead: false, role: null, finding: null, patterns: [], openCommitments: [], ...over,
});

describe('a room is not a population', () => {
  it('counts four people as a room and eight as a population', () => {
    expect(thisIsARoom(2)).toBe(true);
    expect(thisIsARoom(4)).toBe(true);
    expect(thisIsARoom(A_POPULATION_STARTS_AT)).toBe(false);
    expect(thisIsARoom(101)).toBe(false);
  });

  /* The run this came from: four salespeople, three of them "blocked" for three different reasons. */
  it('gives the model one block per person, not a count', () => {
    const out = theRoom([
      person('Femi', { role: 'Relationship officer, Lagos', finding: '31 applications, none submitted.', patterns: [{ code: 'K5', name: 'Activity Without Outcome Logic', observation: 'Calls, not documents.', seenInSessions: [1, 2, 3] }] }),
      person('Ngozi', { finding: 'Eleven files at credit committee, escalated once.' }),
    ], [], 3);
    expect(out).toContain('2 people, 3 sessions.');
    expect(out).toContain('--- Femi');
    expect(out).toContain('31 applications, none submitted.');
    expect(out).toContain('seen in sessions 1, 2, 3 [K5 Activity Without Outcome Logic]');
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
  });

  it('and the service chooses between the two by headcount', () => {
    const src = fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8');
    expect(src).toMatch(/const asARoom = !!room\?\.people\?\.length && thisIsARoom\(room\.people\.length\)/);
    expect(src).toMatch(/instruction = theJudgementOverARoom\(/);
  });
});
