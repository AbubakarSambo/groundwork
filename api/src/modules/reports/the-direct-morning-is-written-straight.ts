/**
 * THE DIRECT MORNING, IN WHAT THE MODEL WRITES (Hafsah, 20 October 2026; the review "Groundwork as production runs it", sections 8
 * and "Every phrase to rewrite").
 *
 * The team report's instructions are about alignment: "a shared picture none of them could see on their own", "the gap", "what the gap
 * reveals", "the question to carry", "No recommendations for what either person should do", "Do not produce a verdict". A sales lead
 * read that as the opposite of a status report. For every organisation (release batch 1, 4 November 2026: the switch is gone), the
 * CODE adds one block to each model instruction that writes a report or the board's judgement, and the block says it overrides the
 * earlier lines about style. Nothing stored is edited.
 *
 * WHY THE BLOCK IS ADDED LAST, AFTER THE STORED VERSION. The team report's base text is the active `PromptVersion` under
 * `report_synthesis` (seeded from prompt-library's REPORT_SYNTHESIS, and replaceable at /prompts); the board's judgement is the code
 * template unless a version under `the_judgement_room` or `the_judgement_population` is active, which then replaces it. Either way the
 * stored text comes first and this block is appended after it, in code, so whatever version is stored, this block runs after it and
 * wins where they differ. The report's `promptVersionId` (and the judgement's own `promptVersionId`) still names the stored version
 * that ran, as before; `theDirectMorning` beside it names this block's version (THE_DIRECT_MORNING_BLOCKS), so every report
 * says both: which stored version ran, and that this block ran after it.
 *
 * WHAT IT NEVER CHANGES. Who may read what. The schema. Labels in the stored report (each reader's copy swaps them for names, through
 * the one wrapper that also handles anonymous sharing). The rules about quotations, counting accounts, inferences, lead-supplied
 * context, leadership gaps and numbers a block holds. No label or score is ever put on a person, and nothing the person-judgements
 * switch holds back is asked for.
 *
 */

/** This block's version, kept beside `promptVersionId` on what it wrote. Raise it when a block below changes. */
export const THE_DIRECT_MORNING_BLOCKS = 'the-direct-morning-blocks-1';

const IT_COMES_LAST =
  'THE DIRECT MORNING. This organisation reads its reports written straight. This block comes last on purpose: it overrides every earlier line, stored or not, about voice, style, framing and what may be recommended. It does not change the facts you may use, the fields you return, who reads what, or any earlier rule about quotations, labels, counting accounts, inferences, numbers or what a person said in private.';

const SAY_IT_STRAIGHT = [
  'HOW EVERY SENTENCE IS WRITTEN:',
  '- About the work, with the facts: who, which customer or client, how many, and by which day. Every sentence carries at least one of a person\'s label, a customer or client, a number or a day from the record.',
  '- Call each person by their exact label from the roster, every time you would use their name. Never write "someone", "a party" or "a team member" when you know who. Never write a name yourself. Each reader\'s copy turns the label into the person\'s name, or into "you".',
  '- Short and straight. Plain, full sentences. The fewest words that say what is true. No preamble, and nothing about what this report is or how Groundwork works.',
  '- Never these words or ideas: "a shared picture", "the gap", "what the gap reveals", "the question to carry", "described differently", "see it differently", "settled and still open", "a conversation worth having", "alignment", "divergence".',
  '- Two people may say different things about the same thing. Then say who said which, in one sentence: "Sales rep A counts a sale at a signed order, and Sales rep B counts the Green Mart deal before it is signed."',
  '- No hedging and no defending. Never "it is not a verdict", "this can change", "it is too early to say", "it is worth confirming", "nobody can assume", "it is not a judgement about anybody". Say the fact, or say nothing.',
  '- Recommend what to do next: the next step on the work, who it sits with, and by when. "Get the signed order from Green Mart by Friday." Three earlier lines no longer apply to the work. The first is "No recommendations for what either person should do". The second is "Do not say what either person should do next". The third is "Do not produce a verdict".',
  '- Still never a judgement of a person: not their character, motives or effort, and never a label or score such as "at risk", "underperforming" or "PIP". Say what happened, and what would change it.',
].join('\n');

/** The team report (`report_synthesis`, and the opening written from the facts). */
export const THE_DIRECT_TEAM_REPORT = [
  IT_COMES_LAST,
  '',
  SAY_IT_STRAIGHT,
  '',
  'FIELD BY FIELD, THE SAME FIELDS AS BEFORE:',
  '- sharedPicture: two to four sentences. Say first how the work stands against the target, with the numbers and the day it is due. Then say the one thing that most needs doing.',
  '- agreements: what everybody counts or does the same way, one plain sentence each, with the number or the day.',
  '- divergences: each topic is one sentence saying who said which. settledBy is the next step that settles it, with who and by when. atStake is what it costs the target, with the number.',
  '- centralQuestion: the one question the team must answer this week to move the target, naming the customer, the number or the day.',
].join('\n');

/** The board's judgement (`theJudgement`), read only by whoever runs the check-in. */
export const THE_DIRECT_JUDGEMENT = [
  IT_COMES_LAST,
  '',
  SAY_IT_STRAIGHT,
  '',
  'FIELD BY FIELD, THE SAME FIELDS AS BEFORE:',
  '- theGap: one or two sentences. What the reader most needs to know about the target today, with the person, the customer, the number and the day.',
  '- whatToDo: the moves, most valuable first. Each one is an instruction to the reader, with the person, the customer and the day.',
  '- whatThisCannotTellYou: only a missing fact that stops a move, in one sentence each, and what would give it. Otherwise leave it empty.',
].join('\n');

/** Each person's own guide after the report (their own report's "what to work on next"). Its rule against naming or quoting anybody stays. */
export const THE_DIRECT_OWN_REPORT = [
  IT_COMES_LAST,
  '',
  'HOW EVERY SENTENCE IS WRITTEN:',
  '- About this person\'s own work, with their own customers, numbers and days from their own entries.',
  '- Short and straight. Plain, full sentences, written to "you".',
  '- Say the next step on their work and by when. "Get the signed order from Green Mart by Friday, and send it in your next check-in."',
  '- Never "a shared picture", "the gap", "the question to carry", "described differently", "settled and still open" or "a conversation worth having", and no hedging.',
  '- The earlier rule still holds in full: never name anybody else and never quote anybody.',
].join('\n');

/** The prompt, with the block after it, for every organisation (release batch 1, Hafsah, 4 November 2026: the direct wording is the only wording). */
export function withTheDirectMorning(prompt: string, block: string): string {
  return `${prompt}\n\n${block}`;
}

/** Kept beside `promptVersionId` on every report and judgement, so each one says which block ran after the stored version. */
export function whichDirectBlockRan(): { theDirectMorning: string } {
  return { theDirectMorning: THE_DIRECT_MORNING_BLOCKS };
}
