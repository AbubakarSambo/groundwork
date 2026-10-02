import { theShortNameOf } from './a-title-is-not-a-first-name';

/**
 * A NAME IS SAID ONCE, NOT TWICE IN A ROW (item 18, the project board, 2 October 2026).
 *
 * The report is written in labels, and the model sometimes puts the person's name after the label as
 * well: "Put Participant B, Kwabena Mensah, and Participant D, Samuel Aryee, in a room together". Once
 * the label becomes the name, and a later mention is shortened, Tunde read "Put Kwabena Mensah,
 * Kwabena, and Samuel Aryee, Samuel, in a room together" and "Yemi Adeyinka, Yemi, delivered ...".
 *
 * Where a person's name is followed straight away, after a comma, by their name again (in full or
 * short), the second one goes, with the comma that closed it: "Put Kwabena Mensah and Samuel Aryee in
 * a room together". Only the same person's own name is removed, so nothing is lost and nobody else is
 * touched.
 */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function aNameSaidTwiceInARow(text: string, names: Iterable<string>): string {
  if (!text) return text;
  let out = text;
  const people = [...new Set([...names].map((n) => (n ?? '').trim()).filter((n) => n.split(/\s+/).length >= 1 && n.length > 1))]
    .sort((a, b) => b.length - a.length);
  for (const full of people) {
    const short = theShortNameOf(full);
    const forms = [...new Set([full, short].filter(Boolean))].sort((a, b) => b.length - a.length).map(escapeRe).join('|');
    /* "Kwabena Mensah, Kwabena," and "Kwabena, Kwabena Mensah," both become "Kwabena Mensah". */
    const twice = new RegExp(`(?<![\\w])(${forms}),\\s+(${forms})(?![\\w])(,(?=\\s))?`, 'g');
    out = out.replace(twice, (_m: string, a: string, b: string) => (a.length >= b.length ? a : b));
  }
  return out;
}
