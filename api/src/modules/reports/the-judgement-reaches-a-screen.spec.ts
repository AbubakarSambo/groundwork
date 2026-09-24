import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * IT WAS ALL COMPUTED AND NO SCREEN SHOWED ANY OF IT.
 *
 * The frame, the fitted answers, the counts and the judgement were built, tested and proven on the
 * hundred-person run, and a customer reading his board would have seen exactly what he saw before.
 * This is the path from one person finishing to a sentence on the board.
 */
const CONV = readFileSync(join(__dirname, '../conversation/conversation.service.ts'), 'utf8');
const REPORTS = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8');
const BOARD = readFileSync(join(__dirname, '../board/board.service.ts'), 'utf8');
const PAGE = readFileSync(join(__dirname, '../../../../client/src/pages/board/BoardPage.tsx'), 'utf8');

describe('one answer, fitted when its person finishes', () => {
  it('and not a hundred at once while somebody waits for a report', () => {
    expect(CONV).toMatch(/this\.fitTheirAnswer\(checkIn\.id\)/);
    const fn = CONV.slice(CONV.indexOf('async fitTheirAnswer('), CONV.indexOf('async theFrameFor('));
    /* The transcript, not the record: the record is conservative by design and drops what was not
       stated plainly, and a fit asks which of these fields they told us in whatever words. */
    expect(fn).toMatch(/role: TurnRole\.PERSON/);
    expect(fn).toMatch(/theirAnswerFitted:/);
    expect(fn).toMatch(/\{ fast: true, thinkingBudget: 0 \}/);
  });

  /* Nothing about one person's own completion may fail over the report's arithmetic. */
  it('and a failed fit costs one row, not the completion', () => {
    expect(CONV).toMatch(/Could not fit the answer on \$\{checkIn\.id\} into the frame/);
  });
});

describe('the judgement, written at synthesis', () => {
  const fn = REPORTS.slice(REPORTS.indexOf('private async judgeTheAnswers('), REPORTS.indexOf('private async extractAndStoreLeadSignals('));

  it('classifies and assesses with arithmetic, then writes', () => {
    expect(fn).toMatch(/whatTheNumbersSay\(frame, answers\)/);
    expect(fn).toMatch(/reads\.map\(howGoodIsThis\)/);
    /* PEOPLE, not rows: one row per check-in printed "11 people answered" for two people on a
       fortnightly ground. See one-person-is-one-answer. */
    expect(fn).toMatch(/theTable\(reads, assessments, howManyPeople\(answers\)\)/);
    /* And the model is handed the table and nothing else. */
    /*
     * THE MATERIAL, WHICH IS THE TABLE FOR A POPULATION AND THE ROOM FOR ANYTHING SMALLER. Below
     * eight people every field comes back THIN and the judgement wrote recommendations off
     * proportions of four - "3 of 4 officers report that all their facilities are blocked", about
     * three people in three different situations. See a-room-is-not-a-population.
     */
    expect(fn).toMatch(/\[\{ role: 'user', content: material \}\]/);
    expect(fn).toMatch(/let material = table;/);
    expect(fn).toMatch(/const asARoom = .*thisIsARoom\(room\.people\.length\)/);
  });

  /*
   * `DbNull`, NOT `null`, AND THE DIFFERENCE WAS THE WHOLE QUERY.
   *
   * On a Json column Prisma reads `equals: null` as the JSON value null rather than an absent
   * column. This column is a SQL NULL until an answer is fitted, so the first version found zero
   * answers on a ground with a hundred and five of them and would have quietly written nothing.
   * Measured against the real run: 0 rows the wrong way, 105 the right way.
   */
  it('and finds the rows it is looking for', () => {
    expect(fn).toMatch(/NOT: \{ theirAnswerFitted: \{ equals: Prisma\.DbNull \} \}/);
    expect(fn).not.toMatch(/theirAnswerFitted: \{ equals: null/);
  });

  /* A finding with no count is dropped rather than softened - checked, not requested. */
  it('and holds the writing to its one rule', () => {
    expect(fn).toMatch(/\.filter\(\(x: any\) => everySentenceCarriesANumber\(x\?\.says\)\)/);
    expect(fn).toMatch(/\.filter\(\(x: any\) => everySentenceCarriesANumber\(x\?\.because\)\)/);
    expect(fn).toMatch(/talksLikeAPerson\(/);
  });

  /* Whatever the lead asked to see about their own people, joined on from what was measured. */
  it('and carries what the conversation measured about each person', () => {
    expect(fn).toMatch(/specificityHistory/);
    expect(fn).toMatch(/verifiability === 'HIGH' \|\| !!e\.anchoredDocumentId/);
  });

  /* A failed judgement leaves the last one standing rather than blanking it. */
  it('and never wipes the one already stored', () => {
    expect(REPORTS).toMatch(/\.\.\.\(theJudgement \? \{ theJudgement: theJudgement\.judgement as any, theTable: theJudgement\.table \} : \{\}\)/);
  });
});

describe('and it reaches the board', () => {
  it('to whoever runs the check-in, and to everybody once the report is out', () => {
    expect(BOARD).toMatch(/theJudgement: \(isInitiator \|\| \(ground as any\)\.report\?\.releasedAt\)/);
    /* The working is the lead's; the finding is everybody's. */
    expect(BOARD).toMatch(/theTable: isInitiator \?/);
  });

  it('and renders above what people said, not instead of it', () => {
    expect(PAGE).toMatch(/<TheJudgement it=\{\(b as any\)\.theJudgement\} table=\{\(b as any\)\.theTable\} \/>/);
    expect(PAGE.indexOf('<TheJudgement')).toBeLessThan(PAGE.indexOf('<WhatTheNetworkSaid'));
  });

  /*
   * AND EITHER READ OPENS THE BAND. The network read needs eight accounts before it says anything;
   * the judgement is arithmetic over whatever has been answered and is there long before that.
   * Gating both on the bigger one would hide the judgement on every check-in too small for it.
   */
  it('and is not hidden behind the bigger read', () => {
    expect(PAGE).toMatch(/\{\(\(b as any\)\.whatTheAnswersSay \|\| \(b as any\)\.theJudgement\) && \(/);
    expect(PAGE).toMatch(/\{\(b as any\)\.whatTheAnswersSay && <WhatTheNetworkSaid/);
  });
});
