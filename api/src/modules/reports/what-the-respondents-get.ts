/**
 * WHAT THE RESPONDENTS GET, AND WHO DECIDES IT.
 *
 * Hafsah, 23 September 2026: "The important point is that Groundwork does not automatically decide
 * to anonymise. You decide."
 *
 * Before this there was no decision to make. A report was stored without names, names were put back
 * on the way out for whoever was entitled to them, and whether two respondents could see each
 * other's names came from `peersVisibleToEachOther` - a check-in-wide setting, made at set-up,
 * usually never touched, and about the check-in rather than about this act of sharing. The
 * organiser pressed one button and whatever that setting said is what a hundred people received.
 *
 * So the choice moves to the moment it is made. `sharedAs` is written when the organiser sends, it
 * is their answer and not the product's, and nothing about the stored report changes: the same
 * report can be sent named this time and anonymised next time, because the names were never in it.
 *
 * TWO HALVES, AND ONLY ONE OF THEM IS THE SETTING.
 *
 * The first half is whether names are put back at all, which is this file's `namesTheyMayRead`.
 * The second half is the one that actually leaks: a quote. The model is told never to use a name,
 * and mostly it does not, but an account that says "Adaeze at Harvestline told us to prepay" is a
 * name inside a sentence and no label substitution touches it. On a check-in between two people
 * that is survivable, because they both know who they are. Across a hundred strangers it is the
 * whole promise. So `withoutWhoSaidIt` runs over the text of an anonymised copy and takes the
 * people and the organisations out of it by name.
 *
 * WHAT THIS DOES NOT CLAIM. Somebody who wrote "we are the only cassava processor in Ilaro" has
 * identified themselves in a way no scrub can fix. The organiser is told that plainly rather than
 * sold a guarantee the product cannot keep.
 */

export type HowItWasShared = 'NAMED' | 'ANONYMOUS';

export function isHowItWasShared(v: unknown): v is HowItWasShared {
  return v === 'NAMED' || v === 'ANONYMOUS';
}

/**
 * Whether this reader gets names put back for the OTHER people in the check-in.
 *
 * The lead is never anonymised to themselves: they ran it, they hold the addresses, and a lead
 * reading their own check-in in placeholders is the bug that `applyNames` exists to fix. Sharing
 * anonymously is a choice about what the respondents receive.
 */
export function namesTheyMayRead(
  { viewerIsLead, sharedAs, peersAreNamed }:
  { viewerIsLead: boolean; sharedAs: string | null | undefined; peersAreNamed: boolean },
): boolean {
  if (viewerIsLead) return true;
  if (sharedAs === 'ANONYMOUS') return false;
  if (sharedAs === 'NAMED') return true;
  /* Not shared with anybody yet: the check-in's own setting, exactly as before. */
  return peersAreNamed;
}

/** A person or an organisation whose name must not survive into an anonymised copy. */
export interface Identity { name?: string | null; organisation?: string | null }

/**
 * Take the people and the organisations out of a piece of text by name.
 *
 * Longest first, so "Harvestline Foods" goes before "Harvestline" and never leaves a stump. Word
 * boundaries, so a name that happens to sit inside another word is not cut out of it. A first name
 * on its own goes too: "Adaeze said" is as identifying as the full name to anybody in that network.
 */
export function withoutWhoSaidIt(text: string, identities: Identity[]): string {
  if (!text) return text;
  const words = new Map<string, string>();
  for (const who of identities) {
    const name = (who.name ?? '').trim();
    const org = (who.organisation ?? '').trim();
    if (name.length > 2) {
      words.set(name, 'somebody in this check-in');
      /* Their parts, for "Adaeze said" and "Nwosu's account". Two letters is not a name. */
      for (const part of name.split(/\s+/)) if (part.length > 2) words.set(part, 'somebody in this check-in');
    }
    if (org.length > 2) {
      words.set(org, 'one organisation');
      const head = org.split(/\s+/)[0];
      /* Only a distinctive first word. "The" and "National" name half the sector between them. */
      if (head && head.length > 4 && !/^(the|national|federal|nigeria|nigerian|centre|center|institute|university|state)$/i.test(head)) {
        words.set(head, 'one organisation');
      }
    }
  }
  let out = text;
  for (const [what, withWhat] of Array.from(words.entries()).sort((a, b) => b[0].length - a[0].length)) {
    const escaped = what.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), withWhat);
  }
  return out;
}

/** The same, over every string in a report-shaped object, however deep. */
export function nothingIdentifyingIn<T>(value: T, identities: Identity[]): T {
  if (typeof value === 'string') return withoutWhoSaidIt(value, identities) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => nothingIdentifyingIn(v, identities)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = nothingIdentifyingIn(v, identities);
    return out as unknown as T;
  }
  return value;
}

/**
 * WHAT THE ORGANISER IS TOLD BEFORE THEY CHOOSE, in the words that are actually true.
 *
 * Not "this anonymises the report". It removes the names, and it says what it cannot remove.
 */
export const WHAT_ANONYMOUS_MEANS =
  'Names and organisations are taken out of the copy people receive, including inside quotes. What it cannot take out is somebody describing themselves - "the only cassava processor in Ilaro" identifies them however it is labelled. You keep the full named version.';

export const WHAT_NAMED_MEANS =
  'People see who said what, by name and organisation, the same way you do.';
