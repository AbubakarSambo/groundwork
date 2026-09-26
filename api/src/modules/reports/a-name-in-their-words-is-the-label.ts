/**
 * A PERSON'S NAME IN SOMEBODY'S WORDS BECOMES THAT PERSON'S LABEL, BEFORE A MODEL READS IT.
 *
 * Seen on the drift scenario of the twenty-four-scenario run (fix6-1). The lead is Nadia Haddad,
 * and a report calls her "the initiator". Zainab, who reports to her, said:
 *
 *   "Since March 11th, I've been almost entirely focused on inbound sales support as requested by
 *    Nadia, which has meant no progress on the three partnerships."
 *
 * Every model in the report pipeline is given people as labels and never as names. So it was given
 * "the initiator", and separately it was given "Nadia", and nothing told it they were one person.
 * It did the only thing it could and treated Nadia as somebody else. The judgement stored:
 *
 *   "Tell the initiator that Nadia has redirected Participant A..."
 *
 * which the lead then read as "Tell you that Nadia has redirected Zainab", about herself. The right
 * answer turns on exactly this fact: the person who moved Zainab onto sales is the lead.
 *
 * WHAT THIS DOES. It swaps the name for the label, so the model reads "as requested by the
 * initiator" and knows who that is. The serve step in party-labels.ts already turns every label
 * back into the right words for each reader: "you" for Nadia, "Nadia Haddad" for Zainab, and a
 * plain phrase for a reader who may not see that person's name. So nobody's words are reworded;
 * the name is written the way the report stores every other name, and is put back the same way.
 *
 * THE RULES, AND WHY EACH ONE IS NARROW.
 *  - The full name first, then the first name alone, whole word, with its capital. "Nadia Haddad"
 *    and "Nadia" both become the label; "nadia" in lower case is left, because in running text a
 *    name has a capital and a lower-case word usually is not a name.
 *  - "Nadia's" becomes "the initiator's", which withNames serves as "your" to Nadia.
 *  - A first name two people in this check-in share is left alone. Guessing which of two Grace's
 *    somebody meant is how one person's account gets put on another.
 *  - A surname on its own is left alone. People rarely call a colleague by it, and a surname is
 *    much more often a company, a street or somebody else's family.
 *  - Only the people in this check-in. "Victor", the contractor, is nobody here, and his name is
 *    the evidence in several scenarios, so it stays exactly as it was said.
 *
 * Pure, and handed the names by the caller, which already reads them for the labels. Nothing new is
 * read from the database for it.
 */

export interface ALabelAndItsName {
  label: string;
  name: string | null | undefined;
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* A whole word in any alphabet, so "Zoë" and "Chidinma" are bounded the same as "Nadia". */
const NOT_A_LETTER_BEFORE = "(?<![\\p{L}\\p{N}'’-])";
const NOT_A_LETTER_AFTER = '(?![\\p{L}\\p{N}-])';

/* "Nadia." at the start of a sentence becomes "The initiator", not "the initiator". */
const startsASentence = (text: string, at: number): boolean => {
  const before = text.slice(0, at).replace(/\s+$/, '');
  return before === '' || /[.!?:"“(]$/.test(before);
};
const withACapital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export function aNameInTheirWordsIsTheLabel(text: string, people: ALabelAndItsName[]): string {
  if (!text || !people.length) return text;

  const named = people
    .map((p) => ({ label: p.label, name: (p.name ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((p) => p.label && p.name && /^\p{Lu}/u.test(p.name));
  if (!named.length) return text;

  /* How many people in this check-in answer to each first name. More than one, and it is left. */
  const firstOf = (n: string) => n.split(' ')[0];
  const shared = new Map<string, number>();
  for (const p of named) shared.set(firstOf(p.name), (shared.get(firstOf(p.name)) ?? 0) + 1);

  /* Every full name before any first name, and longer before shorter, so "Nadia Haddad" is spent
     whole and cannot be left as "the initiator Haddad". */
  const swaps: { find: string; label: string }[] = [];
  for (const p of named) if (p.name.includes(' ')) swaps.push({ find: p.name, label: p.label });
  for (const p of named) {
    const first = firstOf(p.name);
    if (first.length < 2 || (shared.get(first) ?? 0) > 1) continue;
    swaps.push({ find: first, label: p.label });
  }
  swaps.sort((a, b) => b.find.length - a.find.length);

  let out = text;
  for (const s of swaps) {
    const re = new RegExp(`${NOT_A_LETTER_BEFORE}${esc(s.find)}(['’]s)?${NOT_A_LETTER_AFTER}`, 'gu');
    out = out.replace(re, (_m: string, possessive: string | undefined, offset: number, whole: string) => {
      const label = startsASentence(whole, offset) ? withACapital(s.label) : s.label;
      /* The straight apostrophe, because that is the one withNames turns into "your". */
      return possessive ? `${label}'s` : label;
    });
  }
  return out;
}
