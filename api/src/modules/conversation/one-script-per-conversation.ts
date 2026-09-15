/**
 * ONE SCRIPT PER CONVERSATION. THE SITUATION'S, WHERE THERE IS ONE.
 *
 * The base prompt carries a complete goal-alignment interview: a role-specific opener, state your
 * goals, compare them to the company's, define the evidence, name the verifier. The situation the
 * lead picks carries its own opening and its own follow-ups. Both are sent, so the model runs a mix
 * of two interviews.
 *
 * Read live, on a lead who came to set objectives for her team: she got the sales opener from the
 * base prompt ("what is the most advanced conversation you have right now, the one closest to a
 * decision") in a check-in about targets for a period that had not started, the situation's own
 * opening, and the alignment step from both. Her words: "the line of questioning does not follow the
 * scenario. It is not aligned with the scenario."
 *
 * Two scripts in one conversation is not twice as thorough. It is a conversation that appears to be
 * about nothing in particular.
 *
 * WHY THIS IS A CUT AND NOT A SENTENCE. The prompt was also told which one wins, and that is worth
 * having. But an instruction to ignore 4,900 characters sits in the same prompt as the 4,900
 * characters, and this codebase has learnt three times this week that the model picks one. Not
 * sending it is the only version that cannot be overruled.
 *
 * NOTHING IS DELETED. The block stays in the library, and a conversation with no situation prompt -
 * which is every fallback path - gets it exactly as before. This removes it from the prompt only
 * where something better already covers the same ground.
 */

/** Where the interview starts and ends in the base prompt. Matched on its own headings, so an edit
 *  to the wording inside it cannot silently change what is cut. */
const OPENS = 'GOAL ALIGNMENT: the most important first conversation';
const CLOSES = 'PUSHBACK RULES:';

/**
 * Does the situation's own prompt say how to open and what to follow up with?
 *
 * Deliberately a low bar, and deliberately read off the pack rather than a list of scenario names: a
 * pack that tells the model how to start is a pack that does not need a second opener. A list would
 * be a third place to keep in step with the other two.
 */
export function theSituationSaysHowToOpen(scenarioPack: string | null | undefined): boolean {
  const pack = scenarioPack ?? '';
  return /\bOPENING\s*:/i.test(pack) && pack.trim().length > 400;
}

/**
 * The base prompt with the generic interview taken out, or unchanged when there is nothing better to
 * put in its place.
 *
 * The heading line stays and says where it went, so anybody reading an assembled prompt sees a
 * deliberate absence rather than wondering whether something failed to load.
 */
export function oneScriptOnly(engineRules: string, scenarioPack: string | null | undefined): string {
  if (!theSituationSaysHowToOpen(scenarioPack)) return engineRules;
  const from = engineRules.indexOf(OPENS);
  const to = engineRules.indexOf(CLOSES, from);
  if (from === -1 || to === -1) return engineRules;
  const instead = `${OPENS}\n\nThis situation has its own opening and its own follow-ups, below. Run those. Do not also run a general interview on top of them.\n\n`;
  return engineRules.slice(0, from) + instead + engineRules.slice(to);
}
