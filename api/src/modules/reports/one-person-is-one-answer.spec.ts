import { onePerPerson, howManyPeople, AnAnswerInItsSession } from './one-person-is-one-answer';
import * as fs from 'fs';
import * as path from 'path';

const answer = (participantId: string, sessionNumber: number, values: any[], extra: any = {}): AnAnswerInItsSession => ({
  participantId, sessionNumber, who: null, organisation: null, kind: null,
  values, completeness: 0, specificity: null, gaveEvidence: false, ...extra,
});

describe('one person is one answer', () => {
  it('folds six fortnights by two people into two people', () => {
    const rows: AnAnswerInItsSession[] = [];
    for (let s = 1; s <= 6; s++) {
      rows.push(answer('amina', s, [{ fieldId: 'body', value: 'Federal Ministry' }]));
      rows.push(answer('marcus', s, [{ fieldId: 'body', value: 'Ministry' }]));
    }
    const folded = onePerPerson(rows);
    expect(folded).toHaveLength(2);
    expect(howManyPeople(folded)).toBe(2);
  });

  it('takes the latest thing they said about a field', () => {
    const folded = onePerPerson([
      answer('p', 1, [{ fieldId: 'states', value: 'Lagos' }]),
      answer('p', 5, [{ fieldId: 'states', value: 'Lagos and Ogun' }]),
    ]);
    expect(folded[0].values).toEqual([{ fieldId: 'states', value: 'Lagos and Ogun' }]);
  });

  /* Answering later replaces a refusal; refusing later does not replace an answer. */
  it('does not hold an early "I cannot say" against a later answer', () => {
    const folded = onePerPerson([
      answer('p', 1, [{ fieldId: 'date', value: null, couldNotSay: true }]),
      answer('p', 4, [{ fieldId: 'date', value: '12 May' }]),
    ]);
    expect(folded[0].values[0].value).toBe('12 May');
    expect(folded[0].values[0].couldNotSay).toBeFalsy();
  });

  it('keeps a refusal nothing later replaced', () => {
    const folded = onePerPerson([
      answer('p', 1, [{ fieldId: 'date', value: '12 May' }]),
      answer('p', 4, [{ fieldId: 'date', value: null, couldNotSay: true }]),
    ]);
    expect(folded[0].values[0].value).toBe('12 May');
  });

  it('carries evidence and the best completeness they reached', () => {
    const folded = onePerPerson([
      answer('p', 1, [{ fieldId: 'a', value: 'x' }], { completeness: 0.2, gaveEvidence: true }),
      answer('p', 2, [{ fieldId: 'a', value: 'y' }], { completeness: 0.8, gaveEvidence: false }),
    ]);
    expect(folded[0].completeness).toBe(0.8);
    expect(folded[0].gaveEvidence).toBe(true);
  });

  /*
   * THE GUARD THAT MATTERS. The table prints a population, and it printed eleven for two people
   * because the caller handed it a row count. It may only ever be handed the fold.
   */
  it('and the report hands the table people, never check-ins', () => {
    const src = fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const fn = src.slice(src.indexOf('private async judgeTheAnswers('), src.indexOf('private async judgeTheAnswers(') + 4000);
    expect(fn).toMatch(/const answers = onePerPerson\(perSession\)/);
    expect(fn).toMatch(/theTable\(reads, assessments, howManyPeople\(answers\)\)/);
    expect(fn).not.toMatch(/theTable\([^)]*answers\.length/);
  });
});
