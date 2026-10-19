import { sentencesOf, theirWordsItCameFrom } from './the-handoff-words-the-person-typed';

/**
 * WHO "HIM" IS, FROM THE LINE BEFORE IN THEIR CHECK-IN (Drop Access short run, 18 October).
 *
 * Grace's team report read Mercy's "Will do" as "I'll call him again on Thursday morning." and Joseph's as "I'll ask Grace
 * first about the price, then I'll call him back.", and nobody reading it could tell who "him" was. The check-in itself says:
 * Groundwork had just asked Mercy "What happens if Joseph doesn't deliver on Thursday?", and Joseph "what will you do about
 * getting that date from Mr Kariuki, and by when?".
 *
 * So "him" is read from the line just before the person's sentence in that check-in (their own sentence before it in the same
 * answer, or else the question they were answering). Where that line names exactly one person on record (somebody in the
 * check-in, or the person a deal is with), and is not the speaker, that person is who they meant. Where the line before names
 * nobody but itself says "him" or "he", the line before that is read, up to three lines back. Anything else, two names, a name
 * only "Mrs." or "Ms." could be, or no name at all, and nothing is said: the person's own words stay as they are.
 *
 * Read from the record and the conversation alone; nothing is written and no model is asked.
 */

export interface ATurn { role: string; content: string }

const HIM = /\bhim\b/i;
const HE_OR_HIM = /\b(?:he|him|his)\b/i;
const A_WOMAN = /^(?:Mrs|Ms|Miss)\.?\s/;
const plain = (t: string) => String(t ?? '').toLowerCase().normalize('NFC').replace(/[‘’']/g, '').replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The people a line names, from the names on record: the longest name wins ("Mr Kariuki" over "Kariuki"). */
export function thePeopleALineNames(line: string, people: readonly string[]): string[] {
  const found: string[] = [];
  const sorted = [...new Set(people.map((p) => p.trim()).filter((p) => p.length >= 2 && /^\p{Lu}/u.test(p)))].sort((a, b) => b.length - a.length);
  let rest = ` ${line} `;
  for (const name of sorted) {
    const re = new RegExp(`(?<![\\p{L}])${escape(name)}(?![\\p{L}])`, 'u');
    if (!re.test(rest)) continue;
    found.push(name);
    rest = rest.replace(new RegExp(`(?<![\\p{L}])${escape(name)}(?![\\p{L}])`, 'gu'), ' ');
  }
  return found;
}

/**
 * Who "him" is in one sentence the person typed, or null. `turns` is the check-in's conversation in order, both sides;
 * `people` the names on record; `speaker` the names of the person who typed it, never who they meant.
 */
export function whoHimIs(sentence: string, turns: readonly ATurn[], people: readonly string[], speaker: readonly string[] = []): string | null {
  if (!HIM.test(sentence)) return null;
  const said = turns.flatMap((t) => sentencesOf(String(t.content ?? '')).map((s) => ({ role: t.role, s })));
  const at = said.findIndex((x) => x.role === 'PERSON' && plain(x.s) === plain(sentence));
  if (at < 0) return null;
  const notThem = people.filter((p) => !speaker.some((s) => plain(s) === plain(p)));
  for (let i = at - 1; i >= 0 && i >= at - 3; i--) {
    const names = thePeopleALineNames(said[i].s, notThem);
    if (names.length === 1) return A_WOMAN.test(names[0]) ? null : names[0];
    if (names.length > 1 || !HE_OR_HIM.test(said[i].s)) return null;
  }
  return null;
}

/**
 * A person's words with "him" said as who they meant, sentence by sentence, or null where no sentence's "him" can be named.
 * `words` are either their own typed sentences or a record line drawn from them.
 */
export function theirWordsWithTheName(words: string, turns: readonly ATurn[], people: readonly string[], speaker: readonly string[] = []): string | null {
  if (!HIM.test(words)) return null;
  const typed = turns.filter((t) => t.role === 'PERSON').map((t) => t.content ?? '');
  let changed = false;
  const out = sentencesOf(words).map((s) => {
    if (!HIM.test(s)) return s;
    const theirs = (theirWordsItCameFrom(s, typed) ?? []).find((x) => HIM.test(x)) ?? s;
    const who = whoHimIs(theirs, turns, people, speaker);
    if (!who) return s;
    changed = true;
    return s.replace(/\bhim\b/gi, who);
  });
  return changed ? out.join(' ') : null;
}
