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

/*
 * AN ORDINARY WORD IS NOT A NAME EITHER (run-26, project). The lead said she was waiting on "Everyone involved in the
 * project", kept with its capital, and the board said "You are waiting on Everyone involved in the project ..." 12
 * times. A leading "Everyone", "Someone", "Nobody" and the like, followed by more words, is said in lower case
 * mid-sentence. A single word on its own is left, and "All" or "Each" are not touched because they can start a name.
 */
const AN_ORDINARY_WORD_BEFORE_MORE = /^(\s*)(Everyone|Everybody|Someone|Somebody|Anyone|Anybody|Nobody|Everything|Something|Anything|Nothing)(?=\s+\S)/;

export function anArticleSaidMidSentence(holder: string): string {
  return holder
    .replace(AN_ARTICLE_BEFORE_A_WORD, (_m, lead: string, article: string, gap: string) => `${lead}${article.toLowerCase()}${gap}`)
    .replace(AN_ORDINARY_WORD_BEFORE_MORE, (_m, lead: string, word: string) => `${lead}${word.toLowerCase()}`);
}

export function aHolderInTheirOwnWords(onLabel: string | null | undefined, readerIsTheOneWaiting: boolean): string | null | undefined {
  if (typeof onLabel !== 'string') return onLabel;
  const m = onLabel.match(MINE);
  if (!m) return anArticleSaidMidSentence(onLabel);
  const rest = m[2].trim();
  return readerIsTheOneWaiting ? `your ${rest}` : `their own ${rest}`;
}

/*
 * WHOSE, NAMED (Hafsah, 19 October, point 6: "Name whose supervisor."). David Mwangi said he was waiting on "my supervisor" for a clear
 * role on the Jamii Clinics employment claim, and Wanjiru's weekly letter read "David Mwangi cannot move until it is settled, and it is
 * waiting on my supervisor.", David's words in her mouth. Where the sentence already names who is waiting, the holder is said with
 * that name: "David Mwangi’s supervisor"; to the person waiting, "your supervisor". With no name to give, as before.
 */
export function aHolderSaidWithWhose(onLabel: string, whose: string | null, readerIsTheOneWaiting = false): string {
  const m = String(onLabel ?? '').match(MINE);
  if (!m) return anArticleSaidMidSentence(onLabel);
  const rest = m[2].trim();
  if (readerIsTheOneWaiting) return `your ${rest}`;
  /* "our" is the team's, and the reader is on it. */
  if (m[1].toLowerCase() === 'our') return `${whose ? `${whose}’s team’s` : 'the team’s'} ${rest}`;
  return whose ? `${whose}’s ${rest}` : `their own ${rest}`;
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

/*
 * WHAT A PERSON WAITS FOR, IN THEIR OWN WORDS, SAID FROM THE READER'S SIDE (item 21, the asset loans board).
 *
 * Musa said he was waiting for "the grinding machine I was approved for" and for "this loan cleared from my name", and
 * the thing was kept as he said it. So he read "You cannot move on the grinding machine I was approved for until it
 * comes from the field officer.", and Amaka read "Musa Danjuma is waiting on the field officer for the grinding machine
 * I was approved for": an "I" inside a sentence about somebody else. To the person waiting, "I" and "my" are "you" and
 * "your"; to anybody else they are "they" and "their". Only the first-person words change; nothing else is touched.
 */
export function aThingInTheirOwnWords(what: string | null | undefined, readerIsTheOneWaiting: boolean): string | null | undefined {
  if (typeof what !== 'string' || !/\b(?:I|I['’]m|I['’]ve|I['’]d|I['’]ll|my|me|myself|mine)\b/.test(what)) return what;
  const you = readerIsTheOneWaiting;
  return what
    .replace(/\bI was\b/g, you ? 'you were' : 'they were')
    .replace(/\bI am\b/g, you ? 'you are' : 'they are')
    .replace(/\bI['’]m\b/g, you ? "you're" : "they're")
    .replace(/\bI['’]ve\b/g, you ? "you've" : "they've")
    .replace(/\bI['’]d\b/g, you ? "you'd" : "they'd")
    .replace(/\bI['’]ll\b/g, you ? "you'll" : "they'll")
    .replace(/\bI\b/g, you ? 'you' : 'they')
    .replace(/\bmyself\b/g, you ? 'yourself' : 'themselves')
    .replace(/\bmine\b/g, you ? 'yours' : 'theirs')
    .replace(/\bmy\b/g, you ? 'your' : 'their')
    .replace(/\bme\b/g, you ? 'you' : 'them');
}

/*
 * A THING IS NOT SAID WITH ITS HOLDER TWICE (run-26, project). Samuel said he was waiting on "the provider" for "the
 * sandbox credentials from the provider", and the board said "waiting on the provider for the sandbox credentials from
 * the provider" and "You cannot move on the sandbox credentials from the provider until it comes from the provider."
 * Where what is waited for ends in "from" and the holder, that ending is left off wherever it is said next to the
 * holder. The person's own words, kept in quotation marks elsewhere, are never changed.
 */
const theWordsWithoutThe = (t: string): string => t.trim().toLowerCase().replace(/[.,;:!?]+$/, '').replace(/^(?:the|a|an)\s+/, '');
export function aThingWithoutItsHolder(what: string, holder: string | null | undefined): string {
  const h = theWordsWithoutThe(holder ?? '');
  if (!h) return what;
  const m = what.match(/^(.*\S)\s+from\s+(.+?)[.\s]*$/i);
  if (!m || !m[1].trim() || theWordsWithoutThe(m[2]) !== h) return what;
  return m[1];
}

/** One wait, its holder and what it waits for, said from this reader's side. */
export function aWaitInTheirOwnWords<T extends { fromParticipantId?: string | null; what?: unknown; onLabel?: unknown }>(d: T, readerParticipantId: string | null): T {
  if (!d) return d;
  const theirs = !!readerParticipantId && d.fromParticipantId === readerParticipantId;
  const out: any = { ...d };
  if (typeof d.what === 'string') out.what = aThingInTheirOwnWords(d.what, theirs);
  if (typeof d.onLabel === 'string') out.onLabel = aHolderInTheirOwnWords(d.onLabel, theirs);
  return out;
}

/*
 * THE READER'S OWN NAME INSIDE WORDS ABOUT THEM IS "YOU" (run-26, cofounder). Tunde said he would "clarify this with
 * Ada directly", and Ada, who runs the check-in, read "Tunde Bakare committed to clarify this with Ada directly." Her
 * own name, in a sentence the product wrote about what somebody else will do, is "you" ("with you directly") and her
 * own name with 's is "your". Only the reader's own full name, first name and last name are changed, and only as
 * whole words, so a longer name that holds it ("Adaeze") is not touched. The words inside quotation marks are the
 * person's own and are never passed through this.
 */
export function theReaderSaidAsYou(text: string, readerNames: readonly string[] | null | undefined): string {
  if (!text || !readerNames?.length) return text;
  const names = [...new Set(readerNames.map((n) => (n ?? '').trim()).filter((n) => n.length > 1))].sort((a, b) => b.length - a.length);
  let out = text;
  for (const n of names) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:['\u2019]s)?(?![\\p{L}\\p{N}])`, 'gu');
    out = out.replace(re, (m) => (/['\u2019]s$/.test(m) ? 'your' : 'you'));
  }
  return out;
}
