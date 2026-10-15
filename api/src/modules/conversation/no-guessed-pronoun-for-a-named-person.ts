/**
 * NO GUESSED PRONOUN FOR A NAMED PERSON (week 26, the pronoun check in the conversation).
 *
 * A name does not tell anybody a pronoun, and a wrong guess misgenders a real colleague in front of
 * the person they work with. The prompt already says so (prompt-library.ts, "NEVER GUESS SOMEBODY'S
 * PRONOUN FROM THEIR NAME"), and an instruction is a request. This is the check at the door: when
 * Groundwork's own turn gives a named person he, she, him, her, his or hers, and that person's
 * pronouns are not on record, the pronoun is written again as the name.
 *
 * "On record" means the person, or somebody in the check-in, said which pronouns the person uses.
 * Nothing else counts: a pronoun used in passing in somebody's own words is not a statement.
 *
 * Only Groundwork's own sentences go through this. Somebody's quoted words are theirs and are not
 * touched, and the pronoun stays when nobody is named in the turn before it (that is the job of
 * `pronounWithNobodyNamed`, and the pronoun may be about a client or a thing on no roster).
 */
const A_GENDERED_PRONOUN = /\b(he|she|him|his|hers|her|himself|herself)\b/gi;
const NOT_A_NAME = new Set(['The', 'What', 'When', 'Where', 'Who', 'Why', 'How', 'That', 'This', 'These', 'Those', 'You', 'Your', 'Yes', 'Okay', 'Less', 'More', 'Let', 'And', 'But', 'Then', 'Now', 'One', 'Two', 'Not', 'Before', 'After', 'Once', 'Since', 'Which', 'Something', 'Nothing', 'Everyone', 'Nobody', 'Somebody', 'Success', 'Session', 'Groundwork', 'They', 'There', 'Here', 'If', 'It', 'So', 'As', 'In', 'On', 'At', 'For', 'To', 'Is', 'Are', 'Do', 'Does', 'Did', 'Can', 'Could', 'Would', 'Will', 'Thanks', 'Thank', 'Good', 'Great', 'Sure', 'Next', 'First', 'Also', 'Tell', 'Say', 'Please', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
const THEIR_PRONOUNS_STATED = /\bpronouns?\b|\b(?:she|he|they)\s*\/\s*(?:her|him|them)\b/i;
/* After "her", these mean it is the object ("ask her to"), not the owner ("her target"). */
const AN_OBJECT_COMES_AFTER = /^(?:$|[.,;:?!)"”']|(?:once|twice|\w+\s+times)\b|(?:to|on|for|about|with|and|or|if|at|that|so|by|in|when|before|after|from|because|but|as|than|what|who|how|whether|again|too|now|today|then|there|here|directly)\b)/i;

/*
 * A PLACE OR A PRODUCT IS NOT A PERSON (night quality run 1). "M-Pesa codes for all his sales" came out "for all Pesa's
 * sales", and "what do you expect of him" came out "of Bay", because the last capital word said was the end of
 * "M-Pesa" or "Kendu Bay". A capital word straight after a hyphen is part of a word, and a run of capital words ending
 * in a place word ("Kendu Bay", "Rangwe Market") is a place: no word of either is ever taken for a person.
 */
const A_PLACE_WORD = /^(?:Bay|County|Market|Road|Street|Town|City|Hill|Hills|Lake|River|Island|Estate|Centre|Center|Mall|Station|Junction|Village|Ward|District|Region|Province|State|Port|Beach|Park)$/;
function namesIn(text: string): string[] {
  const out: string[] = [];
  /* Each run of capital words, with what is just before it, so a hyphenated part and a place are seen whole. */
  for (const m of text.matchAll(/(-?)\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g)) {
    if (m[1] === '-') continue;
    const words = m[2].split(/\s+/);
    if (words.some((w) => A_PLACE_WORD.test(w))) continue;
    for (const w of words) if (w.length >= 3 && !NOT_A_NAME.has(w)) out.push(w);
  }
  return out;
}

/** The names Groundwork may rewrite a pronoun into: people on the roster, which is in what was said. */
function aNameOnTheRoster(name: string, onTheRoster: string[]): boolean {
  return onTheRoster.some((t) => new RegExp(`\\b${name}\\b`).test(t));
}

function theirPronounsAreOnRecord(name: string, said: string[]): boolean {
  return said.some((t) => new RegExp(`\\b${name}\\b`).test(t) && THEIR_PRONOUNS_STATED.test(t));
}

/**
 * One sentence of Groundwork's own, with the turn before it (so "Amani delivered. She was late." is
 * understood). Returns the sentence with every guessed pronoun written as the name.
 */
export function withoutAGuessedPronoun(sentence: string, turnBefore: string, onTheRoster: string[], readerName?: string | null): string {
  if (!sentence || !new RegExp(A_GENDERED_PRONOUN.source, 'i').test(sentence)) return sentence;
  const reader = (readerName ?? '').trim().split(/\s+/)[0];
  /* Quoted words are theirs. Work on the text outside them, keep the quotes exactly. */
  const parts = sentence.split(/("[^"]*"|“[^”]*”)/);
  let before = turnBefore;
  let lastNamed: string | null = null;
  const pick = (text: string) => {
    const found = namesIn(text).filter((n) => n !== reader && aNameOnTheRoster(n, onTheRoster));
    return found.length ? found[found.length - 1] : null;
  };
  lastNamed = pick(before);
  const out = parts.map((part, i) => {
    if (i % 2 === 1) return part;
    let result = '';
    let cursor = 0;
    for (const m of part.matchAll(A_GENDERED_PRONOUN)) {
      const idx = m.index ?? 0;
      lastNamed = pick(before + ' ' + part.slice(0, idx)) ?? lastNamed;
      const name = lastNamed;
      result += part.slice(cursor, idx);
      cursor = idx + m[0].length;
      if (!name || theirPronounsAreOnRecord(name, onTheRoster)) { result += m[0]; continue; }
      const w = m[0].toLowerCase();
      let rewritten: string;
      if (w === 'he' || w === 'she') {
        rewritten = name;
        /* "he'll" is "Baraka will", never "Baraka'll" (release check, 9 October): a contraction on the pronoun is said in full after the name. */
        const short = /^['’](ll|d|s)\b/i.exec(part.slice(cursor));
        if (short) {
          const next = part.slice(cursor + short[0].length).trimStart();
          const done = /^(been|had|got|gone|done|said|made|taken|told|asked|seen|left|finished|started|already)\b/i.test(next);
          const s = short[1].toLowerCase();
          rewritten = `${name} ${s === 'll' ? 'will' : s === 'd' ? (done ? 'had' : 'would') : done ? 'has' : 'is'}`;
          cursor += short[0].length;
        }
      } else if (w === 'him' || w === 'himself' || w === 'herself') rewritten = w === 'him' ? name : name;
      else if (w === 'his' || w === 'hers') rewritten = `${name}'s`;
      else rewritten = AN_OBJECT_COMES_AFTER.test(part.slice(cursor).trimStart()) ? name : `${name}'s`;
      /* A name starting a sentence is already capital; mid-sentence it stays as the name. */
      result += rewritten;
    }
    result += part.slice(cursor);
    before += ' ' + part;
    return result;
  });
  return out.join('');
}
