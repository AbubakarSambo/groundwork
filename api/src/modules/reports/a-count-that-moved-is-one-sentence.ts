import {
  aNumberPeopleCanRead,
  theNumbersPeopleCanRead,
  onlySaysWhatIsCounted,
  anAimAsASentence,
  theirOwnSentence,
  type WhoAnAimIsAbout,
} from '../board/an-aim-is-a-sentence-about-somebody';

/**
 * A COUNT THAT MOVED IS SAID IN PLAIN SENTENCES, WITH NUMBERS A PERSON CAN READ (review of 1 October
 * 2026, re-d, sales, session 2).
 *
 * What Bisi, the lead, read under "since the last round":
 *
 *   "The count for the team is aiming for 120 million naira disbursed went from 0 to 31000000, of the
 *    120000000 aimed for."
 *
 * The name of a target became a whole sentence about somebody (an-aim-is-a-sentence-about-somebody),
 * and this line still dropped that sentence into "The count for ... went from A to B, of the C aimed
 * for", with the numbers as the database holds them. Now each target that moved is said in its own
 * plain words:
 *
 *   "The team's approved facilities went from 0 to 11, against the aim of 40."
 *   "The team is aiming for 120 million naira disbursed. The team's total went from 0 to 31 million naira."
 *
 * A name that only says what is counted ("approved facilities") is what went from A to B. A name that
 * is a sentence stays a sentence of its own, and the count follows it as a second one. Money is a
 * "total" and keeps its word ("naira") on every number; anything else is a "count".
 *
 * WHO MAY READ THE NUMBER AIMED FOR does not change: `againstTheAim` is the caller's to give, and it
 * gives it only to the person who runs the check-in, as before. Where the aim's own sentence already
 * says the number, it is not said twice. A limit the lead set (decision 69) is "the limit", never "the
 * aim".
 */

const MONEY = /\b\d[\d,.]*(?:\s+(?:thousand|million|billion))?\s+(naira|dollars|shillings|cedis|rand|pounds|euros|kwacha)\b/i;

/** The money word a name counts in ("naira"), or null where it does not count money. */
export function theMoneyItCountsIn(readableName: string): string | null {
  const m = MONEY.exec(readableName ?? '');
  return m ? m[1].toLowerCase() : null;
}

export interface ACountThatMoved {
  name: string;
  target: number | null;
  count: number;
  prevCount: number;
  direction?: 'AIM' | 'LIMIT' | 'RATE' | 'DEADLINE' | 'ZERO' | null;
}

export interface WhoseCountItIs {
  /** "team" for the whole check-in's, "you" for the reader's own, or the name the reader may read. */
  whose: 'team' | 'you' | { name: string };
  /** Only for the person who runs the check-in: the number aimed for, said at the end. */
  againstTheAim: boolean;
  /** The aim's own sentence, named for this reader, where the name is a sentence. Built by the caller,
      who knows the labels and the names this reader may read. */
  aimAsTheReaderReadsIt?: (inLabels: string) => string;
  /** Who set it and who holds it, as labels, for the aim's sentence. */
  about?: Omit<WhoAnAimIsAbout, 'target' | 'direction'>;
}

const possessive = (w: WhoseCountItIs['whose']): string =>
  w === 'team' ? "The team's" : w === 'you' ? 'Your' : `${w.name}'s`;

/** What is counted, from a name that only says that: "Freezers sold" -> "freezers sold", "Aisha’s sales" -> "sales". */
function whatIsCounted(readable: string): string {
  const words = readable.replace(/[.,;:]+$/, '').split(/\s+/);
  if (words.length > 1 && /(?:'|’)s$/i.test(words[0])) words.shift();
  if (/^\p{Lu}\p{Ll}*(?:-\p{Ll}+)*$/u.test(words[0] ?? '') && (words.length === 1 || /^\p{Ll}/u.test(words[1]))) words[0] = words[0].toLowerCase();
  return words.join(' ');
}

/**
 * One target that moved, as the reader reads it. One sentence, or two where the name is a sentence of
 * its own. Null where there is no name.
 */
export function aCountThatMovedSaid(o: ACountThatMoved, who: WhoseCountItIs): string | null {
  const name = (o.name ?? '').trim();
  if (!name) return null;
  const readable = theNumbersPeopleCanRead(name);
  const money = theMoneyItCountsIn(readable);
  /* "from 0 to 31 million naira": nought needs no money word. A share is said with its "%". */
  const n = (x: number) => (o.direction === 'RATE' ? `${aNumberPeopleCanRead(x)}%` : `${aNumberPeopleCanRead(x)}${money && x !== 0 ? ` ${money}` : ''}`);
  const isALimit = o.direction === 'LIMIT';
  const against = (alreadySaid: string) => {
    /* A count to keep at zero says so whoever reads it; a date to meet has no number to be against. */
    if (o.direction === 'ZERO') return o.count > 0 ? ', and this should stay at zero' : '';
    if (o.direction === 'DEADLINE') return '';
    if (!who.againstTheAim || typeof o.target !== 'number') return '';
    if (alreadySaid.includes(aNumberPeopleCanRead(o.target))) return '';
    if (o.direction === 'RATE') {
      const whoseRate = who.about?.setByTheHolder && who.whose !== 'team' ? (who.whose === 'you' ? 'your own' : `${who.whose.name}'s own`) : 'the';
      return `, against ${whoseRate} aim of ${n(o.target)} or more`;
    }
    /* A person's own aim is said as theirs, never as one somebody set for them (decision 75, item 37). */
    const whose = who.about?.setByTheHolder && who.whose !== 'team' ? (who.whose === 'you' ? 'your own' : `${who.whose.name}'s own`) : 'the';
    return `, against ${whose} ${isALimit ? 'limit' : 'aim'} of ${n(o.target)}`;
  };
  const moved = `went from ${n(o.prevCount)} to ${n(o.count)}`;

  /* Their own sentence ("my plan is five kits ...") is never "Hassan's my plan is ...": it is quoted, below. */
  const counted = onlySaysWhatIsCounted(readable) && !theirOwnSentence(name);
  /* A date to meet is done or not; its count of 0 or 1 is never said (decision 75, item 17). */
  if (o.direction === 'DEADLINE') {
    const done = o.count >= (typeof o.target === 'number' && o.target > 0 ? o.target : 1);
    const isOrNot = done ? 'is done' : 'is not done yet';
    if (counted && !/^\d/.test(whatIsCounted(readable))) return `${possessive(who.whose)} ${whatIsCounted(readable)} ${isOrNot}.`;
  }
  if (counted && !/^\d/.test(whatIsCounted(readable))) {
    return `${possessive(who.whose)} ${whatIsCounted(readable)} ${moved}${against('')}.`;
  }
  /* A sentence of its own, about whoever set it, then the count. The number aimed for is left out of
     the aim's sentence here: it is said at the end, and only to whoever may read it. A name that is
     its own number ("N120m disbursed") already says it, so that one is the aim's sentence as it is. */
  const inLabels = anAimAsASentence(name, {
    speaker: who.about?.speaker ?? null, holder: who.about?.holder ?? null,
    target: counted ? o.target : null, direction: o.direction ?? null,
    /* A person's own aim is said as theirs (decision 75, item 37). */
    setByTheHolder: who.about?.setByTheHolder ?? false,
  });
  const aim = who.aimAsTheReaderReadsIt ? who.aimAsTheReaderReadsIt(inLabels) : inLabels;
  if (o.direction === 'DEADLINE') return `${aim} ${o.count >= (typeof o.target === 'number' && o.target > 0 ? o.target : 1) ? 'It is done.' : 'It is not done yet.'}`;
  return `${aim} ${possessive(who.whose)} ${money ? 'total' : 'count'} ${moved}${against(aim)}.`;
}
