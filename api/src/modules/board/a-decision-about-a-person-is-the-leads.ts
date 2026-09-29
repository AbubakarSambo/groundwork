/**
 * A DECISION ABOUT A PERSON IS THE LEAD'S, NOT A TARGET THE TEAM READS (request 42).
 *
 * On a probation check-in the engine wrote the team target "Decide whether to confirm Aisha in her
 * role". A team target goes to everybody in the check-in, so Aisha read the decision about her on her
 * own check-in and her Context page, and her colleagues read it too. What a person should read is
 * what is expected of them, never the decision somebody is weighing about them.
 *
 * Several places write targets (setup, the lead's own aims, what a session held), and the target row
 * has no place to say "the lead's own". So the rule is kept where every read of a target already goes,
 * `targetsFor` (whose-number-is-whose-business.ts): a target that is a decision about a person is shown
 * to the check-in's lead and to nobody else, whoever else is reading and whatever `whoSeesTargets`
 * says. Admins who only read are not the lead, so they do not read it either.
 *
 * WHAT COUNTS. A decision ("decide", "a decision on", "make the call", "determine whether", "choose
 * whether") that is about somebody's place: their role, probation, confirmation, contract, promotion,
 * pay, keeping them or letting them go. "Decide on the new supplier" is a decision about work, and
 * stays a team target.
 */
const A_DECISION =
  /^\s*(?:(?:to\s+)?decide\b|(?:make|take|reach)\s+(?:a|the)\s+(?:final\s+)?(?:decision|call)\b|(?:a\s+|the\s+)?(?:final\s+)?decision\s+(?:on|about|whether)\b|determine\s+whether\b|choose\s+whether\b|confirm\s+(?:whether|or\s+not)\b)/i;

const ABOUT_SOMEBODYS_PLACE =
  /\b(?:role|roles|probation|probationary|confirm|confirmed|confirming|confirmation|contract|renew|renewal|promote|promoted|promotion|demote|pay\s+rise|salary|keep\s+(?:him|her|them)|let\s+(?:him|her|them)\s+go|dismiss|dismissal|terminate|termination|fire|performance\s+improvement|pip|extend\s+(?:his|her|their)|his|her)\b/i;

export function isADecisionAboutAPerson(name: string | null | undefined): boolean {
  const text = (name ?? '').trim();
  return !!text && A_DECISION.test(text) && ABOUT_SOMEBODYS_PLACE.test(text);
}
