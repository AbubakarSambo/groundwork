import { theDayZone } from '../../common/the-organisations-own-day';
import { theWaitSaid } from './a-wait-said-in-full';
import { inOurVoice } from '../reports/what-the-record-shows-over-time';
import { theReaderSaidAsYou, aThingWithoutItsHolder } from './a-holder-in-their-own-words';
import { howOftenItWasRaised } from './how-often-it-was-raised';
import { aDayPeopleRead, asDate } from './one-count-for-the-sessions';
import {
  type ACommitment, type AHandoff, type WhoIsReading,
  whoIs, whoIsWaitedOn, thatWaitsOn, aClaimOnlyTheSpeakerMakes, theirAccountOfTheWait, theTimeGivenSaid,
} from './the-switchboards-own-sections';
import { aPartyOutside } from './a-thing-is-not-somebody';
import { inASentence } from './a-phrase-inside-a-sentence';

/**
 * BLOCKERS, ONE SECTION, ONE ENTRY PER BLOCKER (request 105; the prototype's "Blockers. Each with its
 * history and the one thing that would clear it", in eng.txt, founder.txt, ops.txt, programme.txt,
 * salesorg.txt and support.txt).
 *
 * The same facts were spread across "Waiting on" (`whoWaitedOnWhom`) and "What could go wrong"
 * (`risks`). This gathers one blocker's whole story in one place: who is waiting on whom for what,
 * every time it was raised (the days and the sessions), what the proof shows, the time given for it,
 * and what would clear it.
 *
 * NEVER INVENTED. Every sentence is read from rows the record already holds:
 *  - every time it was raised: the check-ins it was said in (how-often-it-was-raised);
 *  - what the proof shows: a line about the same thing that a document backs or a colleague
 *    confirmed, from somebody this reader may read; otherwise that nothing on record proves it;
 *  - what would clear it: only an open commitment, from somebody this reader may read, whose words
 *    name the thing waited for. Where nobody has said, the entry says so. Groundwork never suggests
 *    an action here, because a suggestion is not something the record holds;
 *  - what it is holding up: the `then` that was said with it, where one was.
 *
 * THE SAME WALL AS EVERY OTHER WAIT: `handoffMayBeRead`, decided once by the caller. Nothing here
 * rates or labels anybody: each line says what was said and what happened.
 */
export interface ABlocker {
  id: string;
  /** Who is waiting, as this reader reads them: "You", a name, or "A colleague". */
  who: string;
  /** The same two people as the handoff row on this board, so a reader's own blockers can be told apart. */
  fromParticipantId: string;
  onParticipantId: string | null;
  /** The thing waited for, as it was stored, for a heading: "the bank statements". */
  name: string;
  /** "blocking" where it stops the work, "waiting" where the work can go on meanwhile. */
  state: 'blocking' | 'waiting';
  /** Who is waiting on whom, for what, as one full sentence. */
  says: string;
  /** Every time it was raised. */
  raised: {
    times: number;
    firstRaisedAt: string | null;
    lastRaisedAt: string | null;
    /** The sessions it was raised in, in order, where the record says which. */
    sessions: number[];
    /** "This has been raised 3 times, from 1 September to 23 September." */
    says: string;
    /** "It was raised in sessions 1, 2 and 3." Null where no session is on record. */
    inSessions: string | null;
  } | null;
  /** What the proof shows, in a full sentence. */
  proof: { state: 'shown' | 'none'; says: string };
  /** The time given for it, in a full sentence, and whether it was raised again after that day. */
  timeGiven: string;
  /** What would clear it, only where somebody said so. */
  wouldClearIt: string | null;
  /** Said always: what would clear it, or that nobody has said. */
  wouldClearItSays: string;
  /** What it is holding up, where that was said with it. */
  holdingUp: string | null;
}

const STOP = new Set(['the', 'a', 'an', 'for', 'of', 'on', 'to', 'from', 'with', 'and', 'or', 'my', 'our', 'their', 'his', 'her', 'its', 'this', 'that', 'these', 'those', 'some', 'any', 'about', 'in', 'at', 'by', 'it', 'is', 'be', 'we', 'i', 'you', 'they', 'them', 'us']);
const wordsOf = (t: string) => (t ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
const contentWords = (t: string) => wordsOf(t).filter((w) => w.length >= 3 && !STOP.has(w));
const stem = (w: string) => w.replace(/(?:ies|es|s)$/, '');

/**
 * WHETHER A SENTENCE IS ABOUT THE THING WAITED FOR. The last word of what is waited for (its head:
 * "statements" in "the bank statements") must be in it, and at least half of the thing's own words.
 * Strict on purpose: a wrong match would put somebody's promise under a blocker it is not about.
 */
export function isAboutTheThing(text: string, what: string): boolean {
  const thing = contentWords(what);
  if (!thing.length) return false;
  const said = new Set(wordsOf(text).map(stem));
  const head = stem(thing[thing.length - 1]);
  if (!said.has(head)) return false;
  const found = thing.filter((w) => said.has(stem(w))).length;
  return found * 2 >= thing.length;
}

/*
 * A PROMISE IS PAIRED WITH A WAIT BY PERSON AND SUBJECT, NEVER BY A SHARED WORD (Hafsah's point 8, Drop Access, 17 October).
 * Kevin's wait on Paul for "a response to their calls" read "Would clear it: Kevin Omondi committed to give Ali a call.", and
 * Mercy's wait on Joseph for "the sample units" read "Would clear it: Mercy Wairimu committed to send Peter the quote for 30
 * units by Friday.", because "call" and "units" were in both. Behind Release 1's switch, a promise is what would clear a wait
 * only when:
 *  - it is the promise of the one waiting or the one holding it;
 *  - it names the thing itself: the thing's own words, never a word every wait shares ("units", "an answer", "a call"), and
 *    never a number or a currency;
 *  - where the wait is on somebody outside the team (a customer), it names them;
 *  - it names nobody else: a promise to Ali or to Peter is about Ali's or Peter's business, not this wait.
 * Otherwise it says nothing, and the entry says nobody has said what would clear it.
 */
const SAID_OF_EVERY_WAIT = new Set(['unit', 'answer', 'reply', 'response', 'decision', 'update', 'call', 'message', 'word', 'news', 'kes', 'ksh', 'ngn', 'usd', 'thing', 'information', 'info']);
const NEVER_A_NAME = /^(?:I|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|KES|KSh|Ksh|NGN|USD|OK)$/;
/* One word, said once or many times: "samples" is "sample", "calls" is "call", "deliveries" is "delivery". */
const one = (w: string) => w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
const theThingsOwnWords = (what: string): string[] => {
  const all = contentWords(what).filter((w) => !/^\d/.test(w));
  const own = all.filter((w) => !SAID_OF_EVERY_WAIT.has(w) && !SAID_OF_EVERY_WAIT.has(one(w))).map(one);
  return own.length ? own : all.map(one);
};
/** Capitalised words after the first, as names: "Ali", "Peter", "Juja Hardware". */
const theNamesIn = (text: string): string[] => {
  const words = String(text ?? '').replace(/[‘’“”"]/g, '').split(/\s+/).map((w) => w.replace(/^[^\p{L}]+|[^\p{L}'-]+$/gu, '')).filter(Boolean);
  return words.slice(1).filter((w) => /^\p{Lu}/u.test(w) && !NEVER_A_NAME.test(w)).map((w) => one(w.toLowerCase().replace(/['’]s$/, '')));
};

export function aPromiseAboutThisWait(
  promise: { participantId: string | null; text: string },
  wait: { fromParticipantId: string; onParticipantId: string | null; onLabel: string | null; what: string },
  namesOfThePeopleInIt: string[],
): boolean {
  if (!promise.participantId || (promise.participantId !== wait.fromParticipantId && promise.participantId !== wait.onParticipantId)) return false;
  const said = new Set(wordsOf(promise.text).map(one));
  const thing = theThingsOwnWords(wait.what);
  if (!thing.length || !said.has(thing[thing.length - 1])) return false;
  if (thing.filter((w) => said.has(w)).length * 2 < thing.length) return false;
  const party = wait.onParticipantId ? [] : contentWords(wait.onLabel ?? '').map(one);
  if (party.length && !party.some((w) => said.has(w))) return false;
  const known = new Set([...contentWords(wait.what), ...contentWords(wait.onLabel ?? ''), ...namesOfThePeopleInIt.flatMap((n) => wordsOf(n))].map(one));
  return theNamesIn(promise.text).every((n) => known.has(n));
}

const listed = (ns: string[]) => (ns.length <= 1 ? ns.join('') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`);
const isAre = (who: string) => (who === 'You' ? 'are' : 'is');
const mid = (who: string) => (who === 'You' ? 'you' : /^(A|Another|One) colleague/.test(who) ? who.charAt(0).toLowerCase() + who.slice(1) : who);

const isOpen = (d: AHandoff) => String(d.status).toUpperCase() !== 'CLEARED' && !d.clearedAt;

export interface ALineForTheBlockers {
  id: string;
  participantId: string | null;
  text: string;
  /** The same mark every line carries: 'proven' where a document backs it, 'confirmed' where a colleague did. */
  mark: string;
  /** Whether this reader may read this person's words. */
  wordsMayBeRead: boolean;
  /** When it was said, and in which check-in (Release 1's raised count). */
  createdAt?: Date | string | null;
  checkInId?: string | null;
  /** The words of the document behind it, where it can be read: proof counts only where they are about the thing waited for. */
  documentWords?: string | null;
}

/**
 * RELEASE 1'S SALES BOARD, THE KIT'S BLOCKER CARD (Hafsah's quality pass, 18 October, Q4, B-10, B-17 to B-20). What the card needs
 * that the waits alone do not hold: the deals (so "Affects" names the deal and what it holds), each person's first name, and the
 * waits as each was said (so a second "then" can say who decides).
 */
export interface TheKitsBlockerCard {
  deals: { name: string; fields?: Record<string, string> | null; buyingDate?: string | null; units?: number | null }[];
  firstName: (pid: string | null) => string | null;
  waitsAsSaid: { fromParticipantId: string | null; onParticipantId: string | null; what?: string | null; then?: string | null; dueSaid?: string | null; dueOn?: Date | string | null; createdAt: Date | string }[];
  /** Whether the wait on the lead is a yes or a no (aWaitTheLeadCanAnswer). */
  isAYesOrNo: (d: { what?: string | null }) => boolean;
  /** A person's own lines, to date what they said they tried. */
  linesOf?: (pid: string | null) => { text: string; createdAt: Date | string }[];
}

/** A line that names the thing waited for by its own word ("samples"), for the kit's card only: no deal name or common word counts. */
const GENERIC = new Set(['unit', 'units', 'answer', 'price', 'promised', 'thing', 'things', 'reply', 'decision']);
function namesTheThing(text: string, what: string): boolean {
  const words = contentWords(what).filter((w) => !GENERIC.has(w) && !/^[A-Z]/.test(w));
  const said = wordsOf(text);
  return words.some((w) => w.length >= 4 && said.some((x) => x.slice(0, 5) === w.slice(0, 5)));
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const capitalised = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dayInFull = (d: Date) => {
  const key = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 ? d.toISOString().slice(0, 10) : new Intl.DateTimeFormat('en-CA', { timeZone: theDayZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const [y, m, day] = key.split('-').map(Number);
  const W = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${W[new Date(Date.UTC(y, m - 1, day, 12)).getUTCDay()]} ${day} ${M[m - 1]}`;
};
const shortRange = (first: string | null, last: string | null): string => {
  const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const at = (k: string) => { const [, m, d] = k.split('-').map(Number); return { m, d }; };
  if (!first) return '';
  const a = at(first);
  if (!last || last === first) return `on ${a.d} ${M[a.m - 1]}`;
  const b = at(last);
  return a.m === b.m ? `from ${a.d} to ${b.d} ${M[b.m - 1]}` : `from ${a.d} ${M[a.m - 1]} to ${b.d} ${M[b.m - 1]}`;
};
/** "I'll call him back" said as theirs: "Joseph calls Mr Kariuki back". Null where it is not said as their own next step. */
const theirNextStep = (then: string, first: string, them: string | null): string | null => {
  const m = then.trim().replace(/[.\s]+$/, '').match(/^(?:then\s+)?I(?:['’]ll| will)\s+(\w+)\s*(.*)$/i);
  if (!m) return null;
  const verb = m[1].toLowerCase();
  const third = /(?:s|sh|ch|x|o)$/.test(verb) ? `${verb}es` : /[^aeiou]y$/.test(verb) ? `${verb.slice(0, -1)}ies` : `${verb}s`;
  const rest = them ? m[2].replace(/\b(?:him|her|them)\b/i, them) : m[2];
  return `${first} ${third}${rest ? ` ${rest}` : ''}`;
};

/** A word that says the sentence is somebody speaking for themselves. */
const FIRST_PERSON = /(?<![\p{L}'’])(?:I|I'm|I’m|I'll|I’ll|I've|I’ve|I'd|I’d|me|my|mine|myself|we|we'll|we’ll|we're|we’re|our|ours|us)(?![\p{L}'’])/iu;

/**
 * WHAT A BLOCKER IS HOLDING UP, NEVER AS A LINE WITH NOBODY'S NAME IN IT (request 115 e).
 *
 * "Once it is cleared, I will ask Chandarana for the signed agreement on 2 October when they decide." put
 * the waiting person's own "I" in the product's sentence, so nobody could tell who "I" was. Now:
 *  - where it is not said in the first person, as before: "Once it is cleared, the delivery can go out.";
 *  - where it is, and it is word for word what they typed, it is quoted as theirs and never changed:
 *    "Baraka Mwangi said that once it is cleared, "I will ask Chandarana ..."";
 *  - where it is the record's own words in the first person, "I will" becomes the name ("Baraka Mwangi
 *    will ask ..."), and only where nothing else in it is first person; otherwise it says only that they
 *    said what happens next, because rewriting more would put words in their mouth.
 */
/*
 * A LINE THAT STARTS WITH A VERB HAS LOST ITS SUBJECT (item 18). Tobi read "Once it is cleared, lead the client
 * meetings." and Samuel "Once it is cleared, submit the request to Finance for approval.", an order with nobody in
 * it. A line whose first word is lower case and could not begin a subject is said with the person as its subject:
 * "Once it is cleared, you will lead the client meetings." A line that starts with its own subject is left.
 */
const STARTS_A_SUBJECT = /^(?:the|a|an|this|that|these|those|it|its|they|their|he|his|she|her|we|our|you|your|there|everyone|everybody|someone|somebody|nobody|no|each|every|all|both|one|some|any|another|other|more|most|work|everything|nothing)\b/i;
const startsWithAVerb = (t: string): boolean => /^[a-z]/.test(t) && !STARTS_A_SUBJECT.test(t) && !/^\d/.test(t);

/*
 * A THING, NOT SOMETHING TO DO (run-26, project). "testing and deployment" was given "you will" and read "Once it is
 * cleared, Samuel Otieno will testing and deployment.", and "people can write code" read "Once it is cleared, you will
 * people can write code." A line that names a thing (its first word ends in "-ing", "-tion" or "-sion") is said as
 * the thing that can go ahead. A line with its own verb after one to three words ("people can write code") is already
 * a whole clause and keeps its own subject.
 */
const NOT_A_THING_ENDING = /^(?:bring|ring|sing|swing|fling|sting|string|cling|wring|spring|mention|question|position|sanction|function|caution|condition|commission|provision|petition|auction|envision)$/;
const A_VERB_OF_ITS_OWN = /^(?:\S+\s+){1,3}?(?:can|could|will|would|may|might|should|must|is|are|was|were|has|have|had)\s/i;
const A_MODAL_ANYWHERE = /\s(?:can|could|will|would|may|might|should|must|shall)\s/i;
/** "people can write code", and "questions about client needs and contract details would go to him": a plural noun first, then a verb. */
const HAS_ITS_OWN_VERB = { test: (t: string): boolean => A_VERB_OF_ITS_OWN.test(t) || (A_MODAL_ANYWHERE.test(t) && /^[a-z]+(?<!s)s(?:\s|$)/i.test(t) && !/^[a-z]+(?:us|is|ss)\s/i.test(t)) };
const namesAThing = (t: string): boolean => {
  const first = (t.split(/\s+/)[0] ?? '').toLowerCase();
  return /(?:ing|tion|sion)$/.test(first) && !NOT_A_THING_ENDING.test(first);
};

/**
 * NEVER A PROMISE THEY DID NOT MAKE (B-093). "I assumed the drivers or sales would call them" was kept as "call them", and the board said "Once it is
 * cleared, Halima Yusuf will call them". A line with no subject of its own is given the person as its subject only when what they typed shows they said
 * they would do it (`theyPromisedIt`, worked out in the-handoff-words-the-person-typed); otherwise there is no line, because a gap nobody owns is
 * already said by the blocker itself. Where nothing they typed could be read, the line is said as it was.
 */
export function whatItIsHoldingUp(then: string, theirWords: string | null, who: string, theyPromisedIt = true): string | null {
  const t = then.trim().replace(/[.!?]+$/, '');
  const subject = who === 'You' ? 'you' : mid(who);
  if (!FIRST_PERSON.test(t)) {
    /* "for that deal to move forward" is not something to do: it read "Joseph Kariuki will for that deal to move forward." It says "that deal can move forward". */
    const forItTo = /^for\s+(.+?)\s+to\s+([a-z].*)$/.exec(t);
    if (forItTo) return `Once it is cleared, ${inASentence(forItTo[1])} can ${forItTo[2]}.`;
    if (!theyPromisedIt && startsWithAVerb(t) && !(/^[a-z]/.test(t) && namesAThing(t) && !HAS_ITS_OWN_VERB.test(t)) && !HAS_ITS_OWN_VERB.test(t)) return null;
    if (/^[a-z]/.test(t) && namesAThing(t) && !HAS_ITS_OWN_VERB.test(t)) return `Once it is cleared, ${inASentence(t)} can go ahead.`;
    if (HAS_ITS_OWN_VERB.test(t)) return `Once it is cleared, ${inASentence(t)}.`;
    return startsWithAVerb(t) ? `Once it is cleared, ${subject} will ${t}.` : `Once it is cleared, ${inASentence(t)}.`;
  }
  if (theirWords) {
    const q = theirWords.trim();
    return `${who} said that once it is cleared, "${/[.!?]$/.test(q) ? q : `${q}.`}"`;
  }
  /* "I can lead a client meeting" is theirs to say as "you can lead ..." too (item 18). */
  const swapped = t.replace(/^I(?:\s+will|['’]ll)\s+/i, `${subject} will `).replace(/^I\s+can\s+/i, `${subject} can `);
  if (swapped !== t && !FIRST_PERSON.test(swapped.slice(subject.length + 1))) return `Once it is cleared, ${swapped}.`;
  return `${who} said what ${who === 'You' ? 'you will' : 'they will'} do once it is cleared.`;
}

export function theBlockers(
  handoffs: (AHandoff & { raisedAt?: { at: Date | string | null; checkInId: string | null }[] | null; then?: string | null })[],
  commitments: ACommitment[],
  lines: ALineForTheBlockers[],
  sessionOf: (checkInId: string | null | undefined) => number | null,
  r: WhoIsReading,
  now = new Date(),
  /** Release 1's switch: a promise is paired with a wait by person and subject (aPromiseAboutThisWait). */
  opts: { byPersonAndSubject?: boolean; theKitsCard?: TheKitsBlockerCard | null } = {},
): ABlocker[] {
  const kit = opts.theKitsCard ?? null;
  const out: (ABlocker & { order: number })[] = [];
  for (const d of handoffs) {
    if (!isOpen(d)) continue;
    if (d.onParticipantId && d.onParticipantId === d.fromParticipantId) continue;
    if (!r.handoffMayBeRead(d)) continue;
    const who = whoIs(r, d.fromParticipantId);
    const on = whoIsWaitedOn(r, d);
    const what = inASentence(on ? aThingWithoutItsHolder(d.what, d.onLabel) : d.what);
    /* A claim only the speaker makes is their account, with the note beside it (decision 137; change 4). */
    const says = on && aClaimOnlyTheSpeakerMakes(d) ? theirAccountOfTheWait(who, on, what, d, r) : `${theWaitSaid(who, isAre(who), on, what)}${thatWaitsOn(d)}`;

    /* Every time it was raised: the days, and the sessions where the record says which. */
    const raisedRows = [...(d.raisedAt?.length ? d.raisedAt : [{ at: d.createdAt ?? null, checkInId: d.sourceCheckInId ?? null }])];
    /*
     * RAISED AGAIN IN THEIR OWN WORDS (Release 1, B-19): a later check-in of the person waiting whose own line is about the thing and
     * names who holds it ("I called Joseph yesterday about the samples.") raised it again, wait row or not.
     */
    const holderFirst = kit && d.onParticipantId ? kit.firstName(d.onParticipantId) : null;
    if (kit && holderFirst) {
      for (const l of lines) {
        if (l.participantId !== d.fromParticipantId || !l.checkInId || !l.createdAt) continue;
        if (!(isAboutTheThing(l.text, d.what) || namesTheThing(l.text, d.what)) || !new RegExp(`\\b${escapeRe(holderFirst)}\\b`).test(l.text)) continue;
        if (raisedRows.some((x) => x.checkInId === l.checkInId)) continue;
        raisedRows.push({ at: l.createdAt, checkInId: l.checkInId });
      }
    }
    if (kit) {
      /* Each raising dated by the day the person said it in that check-in (a wait can be kept with the clock of the day before). */
      for (const x of raisedRows) {
        const said = lines.filter((l) => l.participantId === d.fromParticipantId && l.checkInId && l.checkInId === x.checkInId && l.createdAt).map((l) => new Date(l.createdAt as any).getTime());
        if (said.length) x.at = new Date(Math.max(...said));
      }
    }
    const often = howOftenItWasRaised(raisedRows, now);
    const sessions = [...new Set(raisedRows.map((x) => sessionOf(x.checkInId)).filter((n): n is number => typeof n === 'number'))].sort((a, b) => a - b);
    const raised = often
      ? {
        ...often,
        sessions,
        inSessions: sessions.length ? `It was raised in ${sessions.length === 1 ? 'check-in' : 'check-ins'} ${listed(sessions.map(String))}.` : null,
      }
      : null;

    /* What the proof shows: a line about this thing that a document backs, or a colleague confirmed. */
    const people = new Set([d.fromParticipantId, d.onParticipantId].filter(Boolean) as string[]);
    const backing = lines.find((l) => (l.mark === 'proven' || l.mark === 'confirmed')
      && l.wordsMayBeRead && r.personMayBeRead(l.participantId)
      /* Only the people in the wait (Drop Access, 16 October): Kevin's M-Pesa line about "units" was read as the proof of Mercy's
         "delivery for the 25 units", because the lead may read everybody. Somebody else's line is never the proof of this wait. */
      && (!l.participantId || people.has(l.participantId))
      && isAboutTheThing(l.text, d.what)
      /* A document backs it only where the document is about the thing too (quality pass, 18 October, B-17): Greenfield's signed
         order, attached to Mercy's line about Joseph's samples, was read as proof of the samples. */
      && (!l.documentWords || isAboutTheThing(l.documentWords, d.what)));
    const proof: ABlocker['proof'] = backing
      ? {
        state: 'shown',
        says: backing.mark === 'proven'
          ? `A document backs what ${mid(whoIs(r, backing.participantId))} said about it.`
          : `A colleague confirmed what ${mid(whoIs(r, backing.participantId))} said about it.`,
      }
      : { state: 'none', says: `Nothing on record proves it yet. It rests on what ${mid(who)} said.` };
    if (kit && !backing) {
      /* "It rests on what Mercy and Joseph both said." where the one holding it said it too (B-17). */
      const from = d.fromParticipantId === r.meId ? 'you' : kit.firstName(d.fromParticipantId) ?? mid(who);
      const fromFirst = kit.firstName(d.fromParticipantId);
      const heSaidItToo = !!d.onParticipantId && lines.some((l) => l.participantId === d.onParticipantId && l.wordsMayBeRead
        && (isAboutTheThing(l.text, d.what) || (namesTheThing(l.text, d.what) && !!fromFirst && new RegExp(`\\b${escapeRe(fromFirst)}\\b`).test(l.text))));
      const holder = d.onParticipantId === r.meId ? 'you' : kit.firstName(d.onParticipantId ?? null);
      proof.says = heSaidItToo && holder ? `Nothing on record proves it. It rests on what ${from} and ${holder} both said.` : `Nothing on record proves it. It rests on what ${from} said.`;
    }

    /* The time given, and whether it was raised again once that day had passed. */
    let timeGiven = theTimeGivenSaid(d, who) ?? 'No time has been given for it.';
    const due = asDate(d.dueOn as any);
    const last = raised?.lastRaisedAt ? asDate(raised.lastRaisedAt) : null;
    if (due && last && last.getTime() > due.getTime()) timeGiven += ` It was raised again after ${aDayPeopleRead(due, now)}, the day it was due.`;

    /* What would clear it: only what somebody said they would do about it. */
    /* Somebody this reader may read about, or the person who holds it (never the lead, whose commitments are the
       lead's own): both people in a wait read what the one holding it promised to do about it. */
    const theHolderPromised = (c: ACommitment) => !!c.participantId && c.participantId === d.onParticipantId && c.participantId !== r.theLeadsId;
    const promise = commitments.find((c) => String(c.status ?? '').toUpperCase() === 'UNKNOWN'
      && ((r.personMayBeRead(c.participantId) && r.commitmentMayBeRead(c)) || theHolderPromised(c))
      /* And only a promise by somebody in the wait: Kevin's "follow up with Jane" was what would clear Mercy's wait on Mama Mboga Mart. */
      && (opts.byPersonAndSubject
        ? aPromiseAboutThisWait(c, d, [d.fromParticipantId, d.onParticipantId].map((id) => (id ? r.nameOf(id) ?? '' : '')).concat(r.myNames ?? []))
        : (!c.participantId || people.has(c.participantId)) && isAboutTheThing(c.text, d.what)));
    let wouldClearIt: string | null = null;
    if (promise) {
      const by = whoIs(r, promise.participantId);
      const clause = theReaderSaidAsYou(inOurVoice(promise.text, by === 'You' ? 'you' : 'them') ?? '', r.myNames) || null;
      const words = String(promise.text ?? '').trim();
      wouldClearIt = clause
        ? `${by} committed to ${clause}.`
        : promise.saidWordForWord && words
          ? `${by} said, "${/[.!?]$/.test(words) ? words : `${words}.`}"`
          : `${by} made a commitment about it. It is in the work plan.`;
    }
    const nobodyNamed = !d.onParticipantId && !aPartyOutside(d);
    const wouldClearItSays = wouldClearIt
      ?? (nobodyNamed
        ? 'Nobody has said what would clear it, and nobody has been named as holding it.'
        : 'Nobody has said what would clear it yet.');

    const then = (d.then ?? '').trim();
    /* The holder's own word that they will bring it ("I'll also drop samples off for Mercy on Thursday."), for the kit's card. */
    const theHolderSaidTheyWould = !!kit && !!d.onParticipantId && lines.some((l) => l.participantId === d.onParticipantId && l.wordsMayBeRead
      && /\b(?:I['’]ll|I will|I am going to|I'm going to|I promised)\b/i.test(l.text) && namesTheThing(l.text, d.what));
    const card = kit ? theKitsCard(d, kit, r, raised, now, { aPromiseIsKept: !!promise, theHolderSaidTheyWould }) : null;
    out.push({
      id: d.id,
      who,
      fromParticipantId: d.fromParticipantId,
      onParticipantId: d.onParticipantId ?? null,
      name: d.what,
      state: String(d.status).toUpperCase() === 'BLOCKING' ? 'blocking' : 'waiting',
      says,
      raised,
      proof,
      timeGiven,
      wouldClearIt,
      wouldClearItSays,
      holdingUp: then ? whatItIsHoldingUp(then, (d as any).thenTheirWords ?? null, who, (d as any).thenIsTheirPromise !== false) : null,
      ...(card ?? {}),
      order: new Date(d.createdAt).getTime(),
    });
  }
  /* The ones raised most often first, then the oldest. */
  return out
    .sort((a, b) => (b.raised?.times ?? 1) - (a.raised?.times ?? 1) || a.order - b.order)
    .map(({ order, ...b }) => b);
}

/**
 * THE KIT'S CARD FOR ONE WAIT (Release 1's sales board; Hafsah's quality pass, 18 October, Q4, B-10, B-18 to B-20), in first names:
 *   Waiting on: Joseph
 *   Raised: 3 times, from 12 to 14 October.
 *   Affects: Tuskys Westgate. Peter can make a decision once the samples come.   /   Juja Hardware, 5 units, KES 22,500.
 *   Promised: Joseph said Thursday 15 October. That day has passed, and nothing since says they came.
 *   Would clear it: Joseph brings the samples to Mercy. Then Peter at Tuskys Westgate can make a decision.
 *                   Your yes or no. Then Joseph calls Mr Kariuki back for a buying date.
 * Every part from the record: the waits as each was said, the deal it is about, and what each person said they would do.
 */
function theKitsCard(
  d: AHandoff & { then?: string | null },
  kit: TheKitsBlockerCard,
  r: WhoIsReading,
  raised: ABlocker['raised'],
  now: Date,
  said: { aPromiseIsKept: boolean; theHolderSaidTheyWould: boolean } = { aPromiseIsKept: false, theHolderSaidTheyWould: false },
): Partial<ABlocker> & { on: string | null; tried?: string } {
  const onTheLead = !!d.onParticipantId && d.onParticipantId === r.theLeadsId;
  const readerIsTheHolder = !!d.onParticipantId && d.onParticipantId === r.meId;
  const holder = (onTheLead && r.theLeadsId === r.meId) || readerIsTheHolder ? 'You' : (d.onParticipantId ? kit.firstName(d.onParticipantId) : null) ?? (d.onLabel ?? null);
  const from = kit.firstName(d.fromParticipantId) ?? 'They';
  const what = String(d.what ?? '').trim();
  const deal = kit.deals.find((x) => what.toLowerCase().includes(x.name.toLowerCase()))
    ?? kit.deals.find((x) => {
      const amounts = (what.match(/\d[\d,]*/g) ?? []).map((a) => a.replace(/,/g, ''));
      const held = `${x.fields?.['Price each'] ?? ''} ${x.fields?.Value ?? ''}`.replace(/,/g, '');
      return amounts.some((a) => a.length >= 3 && held.includes(a));
    });
  const thing = what.replace(/^(?:the|a|an|some)\s+/i, '').replace(deal ? new RegExp(`\\s+for\\s+${escapeRe(deal.name)}$`, 'i') : /$^/, '');
  const many = /s$/i.test(thing.split(/\s+/).pop() ?? '');
  const contact = String(deal?.fields?.Contact ?? '').trim() || null;
  /* The waits as each was said, by the same two people: a "then" that names who decides ("Peter can make a decision"). */
  const thens = kit.waitsAsSaid.filter((w) => w.fromParticipantId === d.fromParticipantId && w.onParticipantId === d.onParticipantId).map((w) => String(w.then ?? '').trim()).filter(Boolean);
  const aPersonDecides = thens.find((t) => /^[A-Z][a-z]+\s+(?:can|will|could)\b/.test(t) && !/^I\b/.test(t)) ?? null;
  const withTheirPlace = (t: string) => (deal && contact && t.startsWith(`${contact} `) ? t.replace(`${contact} `, `${contact} at ${deal.name} `) : t);
  const out: Partial<ABlocker> & { on: string | null; tried?: string } = { on: holder };
  /* First names, as the kit names people on the lead's board (B-10). */
  const waiter = d.fromParticipantId === r.meId ? 'You' : from;
  out.who = waiter;
  const forWhat = holder === 'You' ? what.replace(/^(?:her|his|their)\s+/i, 'your ') : what;
  if (holder) out.says = `${waiter} ${waiter === 'You' ? 'are' : 'is'} waiting on ${holder === 'You' ? 'you' : holder} for ${forWhat.charAt(0).toLowerCase()}${forWhat.slice(1).replace(/[.\s]+$/, '')}.`;
  if (raised) {
    const range = shortRange(raised.firstRaisedAt, raised.lastRaisedAt);
    raised.says = `${raised.times === 1 ? 'Once' : `${raised.times} times`}, ${range}.`;
  }
  /* Affects: the deal, and what it holds; or, where it holds no number, who decides once it comes. */
  if (deal) {
    const units = deal.units ?? null;
    const value = String(deal.fields?.Value ?? '').trim();
    out.holdingUp = units && value
      ? `${deal.name}, ${units} ${units === 1 ? 'unit' : 'units'}, ${value}.`
      : aPersonDecides
        ? `${deal.name}. ${aPersonDecides.replace(/[.\s]+$/, '')} once the ${thing} ${many ? 'come' : 'comes'}.`
        : `${deal.name}.`;
  }
  /* Promised: the day the one holding it gave, from the wait as it was said. */
  const due = kit.waitsAsSaid.filter((w) => w.fromParticipantId === d.fromParticipantId && w.onParticipantId === d.onParticipantId && w.dueOn).map((w) => new Date(w.dueOn as any)).sort((a, b) => b.getTime() - a.getTime())[0];
  if (due && holder && !onTheLead) {
    const passed = due.getTime() < new Date(new Intl.DateTimeFormat('en-CA', { timeZone: theDayZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(now) + 'T00:00:00Z').getTime();
    const said = readerIsTheHolder ? 'You said' : `${holder} said`;
    out.timeGiven = passed
      ? `${said} ${dayInFull(due)}. That day has passed, and nothing since says ${many ? 'they' : 'it'} came.`
      : `${said} ${dayInFull(due)}.`;
  }
  /*
   * WHAT WAS TRIED, IN A FULL SENTENCE (Q4; the kit has no "Tried:" label): from the waits as said, the person waiting's own words
   * ("I called Joseph yesterday"), dated by the line they said it in: "Mercy called Joseph on 13 October."
   */
  for (const w of kit.waitsAsSaid.filter((x) => x.fromParticipantId === d.fromParticipantId && x.onParticipantId === d.onParticipantId)) {
    const t = String((w as any).triedSaid ?? '').trim().replace(/[.\s]+$/, '');
    const m = t.match(/^I\s+(called|rang|phoned|messaged|texted|emailed|visited|asked|reminded)\s+(.+?)(?:\s+(yesterday|today|this morning))?$/i);
    if (!m) continue;
    const saidIn = (kit.linesOf?.(d.fromParticipantId) ?? []).find((l) => l.text.toLowerCase().includes(t.toLowerCase().slice(0, 16)));
    const at = saidIn ? new Date(saidIn.createdAt) : new Date(w.createdAt);
    const day = /yesterday/i.test(m[3] ?? '') ? new Date(at.getTime() - 86_400_000) : at;
    const whom = holder && m[2].toLowerCase() === 'him' ? holder : m[2];
    out.tried = `${waiter} ${m[1].toLowerCase()} ${whom === 'You' ? 'you' : whom} on ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: theDayZone() }).format(day)}.`;
    break;
  }

  /* Would clear it. */
  if (onTheLead && kit.isAYesOrNo(d)) {
    const next = d.then ? (d.fromParticipantId === r.meId ? theirNextStep(d.then, 'You', contact)?.replace(/^You (\w+?)(?:e?s)\b/, (_m, v) => `you ${v}`) ?? null : theirNextStep(d.then, from, contact)) : null;
    const forADate = next && deal && !deal.buyingDate ? ' for a buying date' : '';
    const yours = r.theLeadsId === r.meId ? 'Your' : `${kit.firstName(r.theLeadsId ?? null) ?? 'The lead'}'s`;
    out.wouldClearIt = next ? `${yours} yes or no. Then ${next}${forADate}.` : `${yours} yes or no.`;
    out.wouldClearItSays = out.wouldClearIt;
  } else if (d.onParticipantId && holder && !onTheLead && !said.aPromiseIsKept && said.theHolderSaidTheyWould) {
    /* Only where the one holding it said they would bring it: never made up from the wait alone. */
    const verb = /\bsample|\bunit|\bstock|\bgoods\b/i.test(thing) ? 'brings' : 'gives';
    const to = d.fromParticipantId === r.meId ? 'you' : from;
    const by = readerIsTheHolder ? 'You' : holder;
    const action = `${by} ${readerIsTheHolder ? verb.replace(/s$/, '') : verb} the ${thing} to ${to}.`;
    out.wouldClearIt = aPersonDecides ? `${action} Then ${withTheirPlace(aPersonDecides.replace(/[.\s]+$/, ''))}.` : action;
    out.wouldClearItSays = out.wouldClearIt;
  }
  return out;
}
