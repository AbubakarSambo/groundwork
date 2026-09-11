/**
 * WHO OPENED THIS, AND WHAT THAT MEANS FOR THE PERSON ANSWERING.
 *
 * ENGINE_RULES has carried this rule for months:
 *
 *   OPENER_ROLE = founder or manager (and this person is not the founder/manager) -> establish
 *   safety before any probe. The power differential is real and shapes everything they are
 *   willing to say.
 *   OPENER_ROLE = peer -> both parties have equal standing. Name that explicitly.
 *
 * It could never fire. Nothing ever set `openerRole`, and the fallback read the party type of
 * whoever was ANSWERING: the initiator got 'founder', everybody else got 'peer'. So the first rule
 * needed a participant whose opener role was 'founder', which the fallback made impossible, and
 * the second rule fired for every participant in the product - each one told they had equal
 * standing with the person who opened the check-in, however senior that person was.
 *
 * That is the wrong way round and it is the wrong reassurance. Telling somebody their account
 * weighs the same as their manager's, in a check-in their manager opened about their work, is not
 * a comfort. It is the product being confidently wrong about the room.
 *
 * So: the opener role describes THE PERSON WHO OPENED IT, read from how they described their own
 * role. Nothing is inferred about anybody's character and no title is invented - an unreadable or
 * absent role is 'peer', which is the honest default when we do not know.
 */

export type OpenerRole = 'founder' | 'hr' | 'manager' | 'peer' | 'external';

/**
 * Ordered, because titles compound. "Head of People" is HR before it is a manager, and a founder
 * who also manages is still the founder as far as the room is concerned.
 */
const READS_AS: { role: OpenerRole; pattern: RegExp }[] = [
  /* "partner" alone is not seniority: "HR business partner" is one of the most common titles in
     this product's audience and it is not a founder. Only the compounds that mean ownership. */
  { role: 'founder', pattern: /\b(founder|co-?founder|ceo|chief executive|owner|managing director|proprietor|managing partner|equity partner|founding partner)\b/ },
  { role: 'hr', pattern: /\b(hr|human resources|people ops|people operations|head of people|people partner|talent)\b/ },
  { role: 'manager', pattern: /\b(manager|management|head of|director|vp|vice president|chief|supervisor|team lead|lead)\b/ },
];

/**
 * @param openerRoleText how the person who opened the check-in described their own role
 * @param answeringIsTheOpener true when the person answering opened it themselves
 */
export function whoOpenedThis(
  openerRoleText: string | null | undefined,
  answeringIsTheOpener: boolean,
): OpenerRole {
  /*
   * Answering your own check-in has no differential in it, whatever your title. Saying 'founder'
   * here would be true and useless; 'peer' says the only thing the rule needs, which is that
   * nobody in this conversation is above the person in it.
   */
  if (answeringIsTheOpener) return 'peer';
  const t = (openerRoleText ?? '').toLowerCase();
  if (!t.trim()) return 'peer';
  for (const { role, pattern } of READS_AS) if (pattern.test(t)) return role;
  return 'peer';
}
