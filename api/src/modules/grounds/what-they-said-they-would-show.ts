/**
 * WHAT SOMEBODY SAID THEY WOULD SHOW, AND HAS NOT ATTACHED.
 *
 * Hafsah, 22 September 2026: "It is also a place for participants to upload docs they agreed they
 * would share in the chat. So they should see docs/photos/things to upload - for example if they are
 * asked for evidence or context."
 *
 * The page had a dashed box that said nothing about what anybody had been asked for, so the one
 * thing a participant could do on it was attach a file nobody was waiting for. Everything needed to
 * do better already existed and nothing read it:
 *
 *   A DELIVERY is something they say they have done, with where the evidence is in their own words
 *   ("it is in the March deck", "I sent it to Kennedy"). That sentence is a promise of a document.
 *
 *   A COMMITMENT whose verb is about handing something over - send the proposal, share the sheet,
 *   write the list - is the same promise made before the fact.
 *
 * WHAT THIS IS NOT. Not a chase, and not a judgement: a person who described evidence and did not
 * attach it may have had it in an email all along. It is a list of the things this check-in is still
 * waiting to see, on the page where they can attach them.
 */

/** A verb that means "I will hand something over". */
const HANDING_SOMETHING_OVER =
  /\b(send|sending|share|sharing|attach|attaching|upload|forward|circulate|write up|put together|draft|produce|provide|show)\b/i;

/** A thing that arrives as a file: the noun half, so "send Kennedy a nudge" is not an ask. */
const A_THING_THAT_IS_A_FILE =
  /\b(proposal|deck|sheet|spreadsheet|doc|document|contract|invoice|report|plan|scope|brief|notes|minutes|list|checklist|screenshot|photo|picture|statement|terms|agreement|summary|breakdown|export|csv|pdf|questions|template|one[- ]pager|status|figures|numbers)\b/i;

export interface SomethingToShow {
  id: string;
  /** What was promised, in the words it was promised in. */
  what: string;
  /** Where it was said, for somebody who has forgotten the conversation. */
  askedIn?: string | null;
}

/** Whether this commitment is a promise to hand something over rather than to do something. */
export const readsAsAPromiseOfADocument = (text: string | null | undefined): boolean => {
  const t = (text ?? '').trim();
  if (!t) return false;
  return HANDING_SOMETHING_OVER.test(t) && A_THING_THAT_IS_A_FILE.test(t);
};

/**
 * What is still outstanding for one person.
 *
 * A promise is met by ANY file they have attached since they made it, because the product cannot
 * tell whether the sheet they attached is the sheet they meant - and telling somebody they still owe
 * a document they have just uploaded is worse than leaving the line up one session too long.
 */
export function whatTheyStillOweAShow(
  deliveries: { id: string; text: string; evidence?: string | null; createdAt: Date | string }[],
  commitments: { id: string; text: string; whenSaid?: string | null; createdAt: Date | string; status?: string }[],
  filesTheyAttached: { createdAt: Date | string }[],
): SomethingToShow[] {
  const attachedAt = filesTheyAttached.map((f) => new Date(f.createdAt).getTime()).sort((a, b) => b - a);
  const attachedSince = (when: Date | string) => attachedAt.some((t) => t >= new Date(when).getTime());
  const out: SomethingToShow[] = [];
  for (const d of deliveries ?? []) {
    if (!d?.evidence?.trim() || attachedSince(d.createdAt)) continue;
    out.push({ id: `delivery:${d.id}`, what: d.evidence.trim(), askedIn: 'said in a check-in' });
  }
  for (const c of commitments ?? []) {
    if ((c.status ?? 'UNKNOWN') !== 'UNKNOWN') continue;
    if (!readsAsAPromiseOfADocument(c.text) || attachedSince(c.createdAt)) continue;
    out.push({ id: `commitment:${c.id}`, what: c.text.trim(), askedIn: c.whenSaid?.trim() || null });
  }
  return out.slice(0, 8);
}
