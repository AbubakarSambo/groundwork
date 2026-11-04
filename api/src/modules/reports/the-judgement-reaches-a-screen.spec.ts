import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * IT WAS ALL COMPUTED AND NO SCREEN SHOWED ANY OF IT.
 *
 * The frame, the fitted answers, the counts and the judgement were built, tested and proven on the
 * hundred-person run, and a customer reading his board would have seen exactly what he saw before.
 * This is the path from one person finishing to a sentence on the board.
 */
const CONV = readFileSync(join(__dirname, '../conversation/conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const REPORTS = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const BOARD = readFileSync(join(__dirname, '../board/board.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PAGE = readFileSync(join(__dirname, '../../../../client/src/pages/board/BoardPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('one answer, fitted when its person finishes', () => {
  it('and not a hundred at once while somebody waits for a report', () => {
    expect(CONV).toMatch(/this\.fitTheirAnswer\(checkIn\.id\)/);
    const fn = CONV.slice(CONV.indexOf('async fitTheirAnswer('), CONV.indexOf('async theFrameFor('));
    /* The transcript, not the record: the record is conservative by design and drops what was not
       stated plainly, and a fit asks which of these fields they told us in whatever words. */
    expect(fn).toMatch(/role: TurnRole\.PERSON/);
    expect(fn).toMatch(/theirAnswerFitted:/);
    /* wip/plan keeps the explicit zero budget on this read; either way it is the fast model with no deliberation. */
    expect(fn).toMatch(/\{ fast: true(, thinkingBudget: 0)? \}/);
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
    /*
     * HELD TO THE RULE THE OUTPUT WAS WRITTEN UNDER: a count for a population, a named person for a
     * room. A nine-borrower cohort lost seven findings and its whole whatToDo to the count rule,
     * having been instructed to name people and never use a proportion.
     */
    expect(fn).toMatch(/const grounded = asARoom \? namesSomebody : everySentenceCarriesANumber;/);
    expect(fn).toMatch(/\.filter\(\(x: any\) => grounded\(x\?\.says\)\)/);
    expect(fn).toMatch(/whatToDo: \(judgement\.whatToDo \?\? \[\]\)\.filter\(\(x: any\) => grounded\(/);
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
  /*
   * CHANGED 25 SEPTEMBER 2026, AND WHAT IT USED TO SAY IS THE REASON.
   *
   * This read: "to whoever runs the check-in, and to everybody once the report is out", and it
   * pinned `theJudgement: (isInitiator || report?.releasedAt)`. The live run of all twenty-four
   * scenarios showed what that sentence means in practice - on the performance-plan scenario the
   * person the plan was about could read "The initiator is about to put Nathan on a formal plan",
   * on his own board, the moment the round closed.
   *
   * The premise was that a released SHARED picture makes the reading of it shared too. It does not.
   * The picture is everybody's; the verdict on the room is the lead's. So the test now pins the
   * opposite, and the old assertion is kept here in words so nobody restores it by accident
   * thinking they are fixing a regression.
   */
  /* The call may carry more than `isLead` (a check-in of one, request 136 item 7), so this pins what matters — the
     judgement goes through the wrapper, and `isLead` is `isInitiator` — not the line's formatting. The same change the
     screens workspace asked for in request 138, for the same reason: a test on exact source text fails on a line break. */
  it('to whoever runs the check-in, and to nobody else, released or not', () => {
    const call = /theBoardsJudgementFor\(\(ground as any\)\.report, \{[\s\S]{0,400}?\}\)/.exec(BOARD)?.[0] ?? '';
    expect(call).not.toBe('');
    expect(call).toMatch(/isLead: isInitiator\b/);
    expect(BOARD).not.toMatch(/theJudgement: \(isInitiator \|\| \(ground as any\)\.report\?\.releasedAt\)/);
  });

  it('and renders above what people said, not instead of it', () => {
    /* No table prop since the screens workspace dropped it (requests-to-engine.md, request 10): the
       judgement is shown without the table it was built from. */
    /* The screen may pass the judgement more props (the where-next board hides one of its parts), so this
       checks that the judgement is what is drawn, not the exact line. */
    expect(PAGE).toMatch(/<TheJudgement it=\{\(b as any\)\.theJudgement\}/);
    expect(PAGE.indexOf('<WhatTheNetworkSaid')).toBeGreaterThan(-1);
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
