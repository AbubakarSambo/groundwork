/**
 * WHAT EACH READER OF AN ANCHOR CHECK-IN MAY BE SERVED (anchor piece 35; decisions 94 and 96).
 *
 * The rules, said once, for the journey runner (walk-the-anchor-as-each-reader.ts, against a running API on this
 * computer) and for the cross-reader spec (against the board read in a test). Each returns the problems it finds, in
 * plain sentences, and an empty list when the board is right for that reader.
 *
 *  - The lead reads the active line, the month board and, once the month is over, the end-of-month read.
 *  - A person in the check-in reads none of those. They may read their own recognition sentence
 *    (`yourPartInMovingThings`, decision 96 item 9), said as "you", and their own nudge (`aNudgeForYou`, decision 105
 *    item 3), from their own promise only, and nobody else's.
 *  - An admin who set it up or has access reads the active line, never the month board or the end-of-month read,
 *    which are the lead's own.
 *  - An admin who only reads (in the organisation, not in the check-in) reads none of the lead's parts and no
 *    person's recognition sentence.
 *  - Nobody reads a score, a rating, or a label on a person.
 */
export type AnAnchorReader = 'the lead' | 'a person in it' | 'an admin with access' | 'an admin who only reads';

const A_LABEL_OR_A_SCORE = /\b(?:score|rating|rated|at risk|underperform\w*|PIP|exit)\b|\/10\b/i;

export function whatIsWrongForThisReader(reader: AnAnchorReader, board: Record<string, any>, opts: { monthIsOver?: boolean; theirOwnName?: string | null; othersNames?: string[] } = {}): string[] {
  const problems: string[] = [];
  const has = (k: string) => board && Object.prototype.hasOwnProperty.call(board, k) && board[k] != null;
  const text = JSON.stringify({ a: board?.activeLine, m: board?.theMonthBoard, e: board?.theEndOfMonthRead, y: board?.yourPartInMovingThings, n: board?.aNudgeForYou });
  if (A_LABEL_OR_A_SCORE.test(text)) problems.push('An anchor part holds a score, a rating or a label on a person.');

  if (reader === 'the lead') {
    if (!has('activeLine')) problems.push('The lead is not served the active line.');
    if (!has('theMonthBoard')) problems.push('The lead is not served the month board.');
    if (opts.monthIsOver && !has('theEndOfMonthRead')) problems.push('The month is over, and the lead is not served the end-of-month read.');
    if (has('yourPartInMovingThings')) problems.push('The lead is served a person\'s own recognition sentence.');
    if (has('aNudgeForYou')) problems.push('The lead is served a person\'s own nudge.');
    return problems;
  }
  for (const k of ['theMonthBoard', 'theEndOfMonthRead']) if (has(k)) problems.push(`${reader === 'a person in it' ? 'A person in the check-in' : reader === 'an admin with access' ? 'An admin with access' : 'An admin who only reads'} is served ${k === 'theMonthBoard' ? 'the month board' : 'the end-of-month read'}, which is the lead's own.`);

  if (reader === 'a person in it') {
    if (has('activeLine')) problems.push('A person in the check-in is served the active line, which is for whoever runs it.');
    const own = board?.yourPartInMovingThings;
    if (typeof own === 'string') {
      if (!/^You /.test(own)) problems.push('A person\'s own recognition sentence is not said to them as "you".');
      for (const n of opts.othersNames ?? []) if (n && own.includes(n)) problems.push(`A person's own recognition sentence names somebody else (${n}).`);
    }
    const nudge = board?.aNudgeForYou;
    if (typeof nudge === 'string') for (const n of opts.othersNames ?? []) if (n && nudge.includes(n)) problems.push(`A person's own nudge names somebody else (${n}).`);
    return problems;
  }
  if (has('yourPartInMovingThings')) problems.push(`${reader === 'an admin with access' ? 'An admin with access' : 'An admin who only reads'} is served a person's recognition sentence.`);
  if (has('aNudgeForYou')) problems.push(`${reader === 'an admin with access' ? 'An admin with access' : 'An admin who only reads'} is served a person's nudge.`);
  if (reader === 'an admin who only reads' && has('ideasFromYourTeam')) problems.push('An admin who only reads is served the ideas, which are for the people in the check-in.');
  if (reader === 'an admin who only reads' && has('activeLine')) {
    /* An admin of the organisation reads the active line on a check-in they can open (decision 93 row 14); it holds counts only. */
    if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(String(board.activeLine?.line ?? ''))) problems.push('The active line names a person to an admin who only reads.');
  }
  return problems;
}
