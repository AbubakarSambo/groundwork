/**
 * WHO A WAIT IS ON, WHEN THE PERSON NAMED THEM IN THEIR OWN WORDS (item 18, the onboarding board, 2 October 2026).
 *
 * Tobi said he was waiting on "my direct reports" for three dates for a meeting, and the holder was kept as he said it.
 * So Tobi read "You are waiting on my direct reports ..." and "My direct reports holds it.", and Amina, who runs it,
 * read "Tobi Adewale is waiting on my direct reports ...", as if they were hers.
 *
 * A holder that starts with "my" or "our" is said from the reader's side: "your direct reports" to the person who is
 * waiting, and "their own direct reports" to everybody else. No name is added, so a reader who may not see who is
 * waiting learns nothing new.
 */
const MINE = /^\s*(my|our)\s+(.+)$/i;

/*
 * A HOLDER IS SAID MID-SENTENCE (run-25, sales). Femi said he was waiting on "The customers", kept with its capital,
 * and the board said "Femi Okonkwo is waiting on The customers for their documents" and "with The customers, and
 * nothing on record says ...", 47 times. A holder is always said inside a sentence ("waiting on ...", "with ...") or
 * given its capital where it opens one (`holdsItSaid`), so a leading "The", "A" or "An" before a lower-case word is
 * said in lower case. A name keeps its capitals: "The Gambia", "The Body Shop", "A Plus Logistics".
 */
const AN_ARTICLE_BEFORE_A_WORD = /^(\s*)(The|A|An)(\s+)(?=[a-z])/;

export function anArticleSaidMidSentence(holder: string): string {
  return holder.replace(AN_ARTICLE_BEFORE_A_WORD, (_m, lead: string, article: string, gap: string) => `${lead}${article.toLowerCase()}${gap}`);
}

export function aHolderInTheirOwnWords(onLabel: string | null | undefined, readerIsTheOneWaiting: boolean): string | null | undefined {
  if (typeof onLabel !== 'string') return onLabel;
  const m = onLabel.match(MINE);
  if (!m) return anArticleSaidMidSentence(onLabel);
  const rest = m[2].trim();
  return readerIsTheOneWaiting ? `your ${rest}` : `their own ${rest}`;
}

/*
 * ONE HOLDER OR SEVERAL (2 October 2026). "Their own direct reports holds it." read as broken English. Whoever holds
 * a wait can be one person, a team, or several people in the waiting person's own words, so the verb follows them.
 *
 * Several: "you", "they" or "we"; a list of names ("Ade and Bola", "Ade, Bola and Chi"); or words that start with "the",
 * "your", "their own" and so on and end in a plural ("their own direct reports", "the suppliers"). One: a name
 * ("James", "Chris", "Wairimu Kamau, the head of sales"), a team ("the sales and marketing team"), a word ending in
 * "ss", "us", "is" or "ics" ("the boss", "logistics"), or a capitalised name at the end ("the Ministry of Lands").
 */
const DETERMINER = /^(the|your|their(?: own)?|our|my|his|her|its|these|those|both|all|some|several|many|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+/i;
const MANY_ALWAYS = /^(these|those|both|several|many|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+/i;
const PLURAL_WORDS = new Set(['people', 'children', 'men', 'women', 'police']);

export function aHolderIsMany(holder: string | null | undefined): boolean {
  const h = (holder ?? '').trim().replace(/[.,;:!?]+$/, '');
  if (!h) return false;
  if (/^(you|they|we)$/i.test(h)) return true;
  if (!DETERMINER.test(h)) return /\s(and|&)\s/i.test(h);
  if (MANY_ALWAYS.test(h)) return true;
  /* The word that says who: before "in the warehouse" or "of Lands", so "the people in the warehouse" are several. */
  const head = h.split(/\s+(?:in|at|from|of|on|for|with|at)\s+/i)[0];
  const last = head.split(/\s+/).pop() ?? '';
  if (/^[A-Z]/.test(last)) return false;
  const word = last.toLowerCase();
  if (PLURAL_WORDS.has(word)) return true;
  return /s$/.test(word) && !/(ss|us|is|ics)$/.test(word);
}

/** "Wairimu holds it.", "You hold it.", "Their own direct reports hold it." With a capital at the start. */
export function holdsItSaid(holder: string | null | undefined): string {
  const h = (holder ?? '').trim() || 'Somebody';
  return `${h.charAt(0).toUpperCase()}${h.slice(1)} ${aHolderIsMany(h) ? 'hold' : 'holds'} it.`;
}
