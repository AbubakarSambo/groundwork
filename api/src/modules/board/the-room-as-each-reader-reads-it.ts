/**
 * WHAT THE ROOM IS ABOUT, AS EACH READER READS IT (run-25).
 *
 * The room's read is stored once, with people's names, and was served to every reader as it was stored. So on his
 * own board Femi read "Femi Okonkwo is trying to get twelve approved facilities by collecting as many strong
 * applications as possible.", Tunde read "Tunde Bakare is responsible for and will run the product and engineering
 * sides of the business." and Zainab read "Zainab Suleiman is worried that she will be measured on targets that she
 * has not been able to work on." Each is about the reader, and the reader is "you".
 *
 * And where a wall took an aim's words out for this reader (a colleague's hidden number, a goal not told), the row was
 * left behind with nothing in it: `{ "aim": "", "held": ["Kwame Mensah"] }`. A row with no words is dropped.
 *
 * The naming is the one every board sentence goes through (`name`, which is `withNames` for this reader), so the
 * reader's own name becomes "you" with its verb, and nothing here decides who may read whose name. In a sentence
 * that is only about the reader (they are the only one who holds it, and nobody else is named in it), "she" and "he"
 * are the reader too, because the sentence has nobody else for them to be: "You are worried that you will be
 * measured on targets that you have not been able to work on." In the lists of who holds or named something, the
 * reader is "You".
 */

export interface TheRoomServed {
  aims?: { aim: string; held: string[]; andOthers?: number }[];
  places?: { name: string; named: string[] }[];
  things?: { name: string; named: string[] }[];
  [k: string]: unknown;
}

export interface TheReader {
  /** The reader's full name as the room stores it, or null for a reader who is not in it. */
  fullName: string | null;
  /** Every other person's names, full, first and last, so a sentence naming somebody else is left alone. */
  otherNames: string[];
  /** The board's own naming for this reader. */
  name: (text: string) => string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "has" -> "have", "is" -> "are", "wants" -> "want", after "you". */
function withYou(verb: string): string {
  const w = verb.toLowerCase();
  const said: Record<string, string> = {
    is: 'are', was: 'were', has: 'have', does: 'do', "isn't": "aren't", "wasn't": "weren't", "hasn't": "haven't", "doesn't": "don't",
    'isn’t': 'aren’t', 'wasn’t': 'weren’t', 'hasn’t': 'haven’t', 'doesn’t': 'don’t',
  };
  if (said[w]) return said[w];
  if (/^(?:will|would|can|could|should|must|may|might|shall|had|did|said|thought|felt|wanted|needed|expected|knew|got|made)$/.test(w)) return verb;
  if (/[^aeiou]ies$/.test(w)) return verb.slice(0, -3) + 'y';
  if (/(?:sh|ch|x|ss|o)es$/.test(w)) return verb.slice(0, -2);
  if (/[^s]s$/.test(w)) return verb.slice(0, -1);
  return verb;
}

const LITTLE_WORDS = '(?:also|always|never|still|just|only|already|often|now|really)';

/** "she has not" -> "you have not", "he worries" -> "you worry", "her own" -> "your own", in a sentence only about the reader. */
export function sheIsTheReaderToo(text: string): string {
  return text
    .replace(new RegExp(String.raw`\b(?:she|he)(\s+(?:${LITTLE_WORDS}\s+)?)([a-z’']+)`, 'g'), (_m, gap: string, verb: string) => `you${gap}${withYou(verb)}`)
    .replace(new RegExp(String.raw`\b(?:She|He)(\s+(?:${LITTLE_WORDS}\s+)?)([a-z’']+)`, 'g'), (_m, gap: string, verb: string) => `You${gap}${withYou(verb)}`)
    .replace(/\b(?:herself|himself)\b/g, 'yourself')
    .replace(/\b(?:her|his)\s+(?=[a-z])/g, 'your ')
    /* "falls to her." and "would go to him" end the sentence or the clause, so they are the reader too (run-26). */
    .replace(/\b(?:her|him)(?=\s*(?:[.,;:!?]|$))/g, 'you');
}

const namesSomebodyElse = (text: string, others: string[]): boolean =>
  others.some((n) => n.trim().length > 1 && new RegExp(`(?<![\\p{L}])${escapeRe(n.trim())}(?![\\p{L}])`, 'iu').test(text));

const youInTheList = (who: string[], fullName: string | null): string[] => {
  if (!fullName) return who;
  const mine = who.some((w) => w.trim().toLowerCase() === fullName.trim().toLowerCase());
  return mine ? ['You', ...who.filter((w) => w.trim().toLowerCase() !== fullName.trim().toLowerCase())] : who;
};

export function theRoomAsThisReaderReadsIt<T extends TheRoomServed | null | undefined>(room: T, reader: TheReader): T {
  if (!room || typeof room !== 'object') return room;
  const aims = Array.isArray(room.aims)
    ? room.aims
      .filter((a) => typeof a?.aim === 'string' && a.aim.trim())
      .map((a) => {
        const held = Array.isArray(a.held) ? a.held : [];
        let aim = reader.name(a.aim);
        const onlyTheirs = !!reader.fullName && !a.andOthers && held.length === 1 && held[0].trim().toLowerCase() === reader.fullName.trim().toLowerCase();
        if (onlyTheirs && /\b[Yy]ou(?:r|rs|rself)?\b/.test(aim) && !namesSomebodyElse(aim, reader.otherNames)) aim = sheIsTheReaderToo(aim);
        return { ...a, aim, held: youInTheList(held, reader.fullName) };
      })
    : room.aims;
  const listed = <R extends { named: string[] }>(rows: R[] | undefined) =>
    Array.isArray(rows) ? rows.map((r) => ({ ...r, named: youInTheList(Array.isArray(r.named) ? r.named : [], reader.fullName) })) : rows;
  return { ...room, aims, places: listed(room.places), things: listed(room.things) } as T;
}
