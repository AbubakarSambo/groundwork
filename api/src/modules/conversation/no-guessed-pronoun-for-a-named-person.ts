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
const NOT_A_NAME = new Set(['The', 'What', 'When', 'Where', 'Who', 'Why', 'How', 'That', 'This', 'These', 'Those', 'You', 'Your', 'Yes', 'Okay', 'Less', 'More', 'Let', 'And', 'But', 'Then', 'Now', 'One', 'Two', 'Not', 'Before', 'After', 'Once', 'Since', 'Which', 'Something', 'Nothing', 'Everyone', 'Nobody', 'Somebody', 'Success', 'Session', 'Groundwork', 'They', 'There', 'Here', 'If', 'It', 'So', 'As', 'In', 'On', 'At', 'For', 'To', 'Is', 'Are', 'Do', 'Does', 'Did', 'Can', 'Could', 'Would', 'Will', 'Thanks', 'Thank', 'Good', 'Great', 'Sure', 'Next', 'First', 'Also', 'Tell', 'Say', 'Please', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
  /* A pronoun with a capital is never a name (Drop Access short run, item 3): "She's the owner" in somebody's words made "She" a
     name, and "in her court" came out "in She's court", "so she has" came out "so She has". */
  'He', 'She', 'Him', 'Her', 'His', 'Hers', 'Himself', 'Herself', 'Them', 'Their', 'Theirs', 'We', 'Our', 'Ours', 'Its', 'My', 'Mine', 'Me',
  'Mr', 'Mrs', 'Ms', 'Dr', 'Madam', 'Sir']);
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
/*
 * A BUSINESS IS NOT A PERSON EITHER (Drop Access, 16 October). "You sent Jane Mwende at Savannah Cafe a price list ... sent her
 * a quote" came out "you sent Cafe's a quote", because "Cafe" was the last capital word said. A run of capital words with a
 * business word in it ("Savannah Cafe", "Kilele Hotel", "Juja Hardware") is a customer, and no word of it is taken for a person.
 */
const A_BUSINESS_WORD = /^(?:Cafe|Café|Hotel|Hotels|Supermarket|Supermarkets|Store|Stores|Shop|Shops|Office|Offices|Hardware|Mart|Minimart|Gym|Kiosk|Restaurant|Ltd|Limited|Electricals|Electronics|Foods|Food|Butchery|Deli|Distributors|Pharmacy|Bakery|School|Hospital|Clinic|Bank|Company|Enterprises|Traders|Wholesalers|Lodge|Inn|Bar|Club|Salon|Farm|Farms|Industries|Group|Services|Solutions)$/;
/*
 * AND A CUSTOMER ON RECORD IS NOT A PERSON (Drop Access run 1, items 30 and 31). "Kawangware Fresh" has no business word in it, so
 * "to see if she has a budget" after "Esther on Kawangware Fresh" came out "to see if Fresh has a budget", and "she decides
 * herself" came out "Fresh makes the decision". On a sales check-in the customers on record are handed in with what was said, as
 * one line each, `aCustomerIsNotAPerson(name)`; no word of a customer's name is ever taken for a person.
 */
const A_CUSTOMER_LINE = / is a customer, not a person\.$/;
export const aCustomerIsNotAPerson = (name: string): string => `${String(name ?? '').trim()} is a customer, not a person.`;
function theCustomersIn(said: readonly string[]): string[] {
  return said.filter((t) => A_CUSTOMER_LINE.test(t ?? '')).map((t) => t.replace(A_CUSTOMER_LINE, '').trim()).filter(Boolean);
}

function namesIn(text: string, customers: readonly string[] = []): string[] {
  const out: string[] = [];
  /* Each run of capital words, with what is just before it, so a hyphenated part and a place are seen whole. */
  for (const m of text.matchAll(/(-?)\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g)) {
    if (m[1] === '-') continue;
    const words = m[2].split(/\s+/);
    if (words.some((w) => A_PLACE_WORD.test(w) || A_BUSINESS_WORD.test(w))) continue;
    /* A run that is a customer's name, or part of one ("Kawangware Fresh", "Mama Pima"), is the customer. */
    if (customers.some((c) => { const cw = c.split(/\s+/); return cw.length > 0 && words.some((w) => cw.includes(w)) && (c.includes(m[2]) || m[2].includes(c)); })) continue;
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

/** "she will" is "they will", "she is" is "they are", "she has" is "they have", "she decides" is "they decide". */
const AGREES: Record<string, string> = { is: 'are', was: 'were', has: 'have', does: 'do', "isn't": "aren't", "wasn't": "weren't", "hasn't": "haven't", "doesn't": "don't" };
const NOT_A_VERB_S = /^(?:always|also|just|still|already|never|says?|is|was|has|does|thus|perhaps|yes|this|its|us|as|plus|less|unless)$/i;
function theyForTheSameSubject(w: string, asWritten: string, part: string, cursor: number, skip: (n: number) => void): string {
  const capital = /^[A-Z]/.test(asWritten);
  const cap = (t: string) => (capital ? t[0].toUpperCase() + t.slice(1) : t);
  if (w === 'his' || w === 'hers' || (w === 'her' && !AN_OBJECT_COMES_AFTER.test(part.slice(cursor).trimStart()))) return cap(w === 'hers' ? 'theirs' : 'their');
  if (w === 'him' || w === 'her') return cap('them');
  if (w === 'himself' || w === 'herself') return cap('themselves');
  /* he / she, with the verb after it made to agree. */
  const rest = part.slice(cursor);
  const short = /^['’](s|ll|d)\b/i.exec(rest);
  if (short) {
    const s = short[1].toLowerCase();
    if (s === 's') { skip(short[0].length); const done = /^\s*(?:been|had|got|gone|done|said|made|taken|told|asked|seen|left|finished|started|already)\b/i.test(rest.slice(short[0].length)); return cap(done ? "they've" : "they're"); }
    return cap('they');
  }
  const next = /^(\s+)((?:always|also|just|still|already|never)\s+)?([a-z’']+)/.exec(rest);
  if (next) {
    const verb = next[3];
    let agreed: string | null = AGREES[verb.toLowerCase().replace('’', "'")] ?? null;
    if (!agreed && /s$/.test(verb) && !NOT_A_VERB_S.test(verb) && verb.length > 3) agreed = /(?:ch|sh|ss|x|o)es$/.test(verb) ? verb.slice(0, -2) : /[^aeiou]ies$/.test(verb) ? `${verb.slice(0, -3)}y` : verb.slice(0, -1);
    if (agreed) {
      const lead = next[1] + (next[2] ?? '');
      skip(next[0].length);
      return `${cap('they')}${lead}${agreed}`;
    }
  }
  return cap('they');
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
  const customers = theCustomersIn(onTheRoster);
  const pick = (text: string) => {
    const found = namesIn(text, customers).filter((n) => n !== reader && aNameOnTheRoster(n, onTheRoster));
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
      /*
       * THE NAME IS THE SUBJECT OF THIS CLAUSE ALREADY (Drop Access short run, item 3). "Joseph is still dragging his feet" came
       * out "Joseph is still dragging Joseph's feet", and "Jane saying she will pay" came out "Jane saying Jane will pay". Where
       * the name was said in the same clause (nothing between them but words, and not after a word like "with" or "ask" that makes
       * it somebody else's object), the pronoun is said as "they", "them" or "their": still no guess, and never the name twice.
       */
      const clause = result.split(/[.,;:?!—–]|\s-\s|\b(?:so|but|and|because|while|although)\b/i).pop() ?? '';
      const nameAt = clause.search(new RegExp(`\\b${name}\\b`));
      const wordBefore = nameAt >= 0 ? clause.slice(0, nameAt).trim().split(/\s+/).pop()?.toLowerCase() ?? '' : '';
      if (nameAt >= 0 && !/^(?:with|to|for|of|on|at|ask|asked|tell|told|from|by|than|about|call|called|met|visit|visited|or)$/.test(wordBefore)) {
        result += theyForTheSameSubject(w, m[0], part, cursor, (n) => { cursor += n; });
        continue;
      }
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
