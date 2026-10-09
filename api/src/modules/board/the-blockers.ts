import { theWaitSaid } from './a-wait-said-in-full';
import { inOurVoice } from '../reports/what-the-record-shows-over-time';
import { theReaderSaidAsYou, aThingWithoutItsHolder } from './a-holder-in-their-own-words';
import { howOftenItWasRaised } from './how-often-it-was-raised';
import { aDayPeopleRead, asDate } from './one-count-for-the-sessions';
import {
  type ACommitment, type AHandoff, type WhoIsReading,
  whoIs, whoIsWaitedOn, thatWaitsOn, theTimeGivenSaid,
} from './the-switchboards-own-sections';
import { aPartyOutside } from './a-thing-is-not-somebody';

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

const listed = (ns: string[]) => (ns.length <= 1 ? ns.join('') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`);
const inASentence = (phrase: string): string => {
  const t = (phrase ?? '').trim().replace(/[.!?]+$/, '');
  return /^(The|A|An|Whether|What|How|Who|When|Where|Which|Why|If|This|That|Our|Their|His|Her|Its)\b/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
};
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
}

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
): ABlocker[] {
  const out: (ABlocker & { order: number })[] = [];
  for (const d of handoffs) {
    if (!isOpen(d)) continue;
    if (d.onParticipantId && d.onParticipantId === d.fromParticipantId) continue;
    if (!r.handoffMayBeRead(d)) continue;
    const who = whoIs(r, d.fromParticipantId);
    const on = whoIsWaitedOn(r, d);
    const what = inASentence(on ? aThingWithoutItsHolder(d.what, d.onLabel) : d.what);
    const says = `${theWaitSaid(who, isAre(who), on, what)}${thatWaitsOn(d)}`;

    /* Every time it was raised: the days, and the sessions where the record says which. */
    const raisedRows = d.raisedAt?.length ? d.raisedAt : [{ at: d.createdAt ?? null, checkInId: d.sourceCheckInId ?? null }];
    const often = howOftenItWasRaised(raisedRows, now);
    const sessions = [...new Set(raisedRows.map((x) => sessionOf(x.checkInId)).filter((n): n is number => typeof n === 'number'))].sort((a, b) => a - b);
    const raised = often
      ? {
        ...often,
        sessions,
        inSessions: sessions.length ? `It was raised in ${sessions.length === 1 ? 'session' : 'sessions'} ${listed(sessions.map(String))}.` : null,
      }
      : null;

    /* What the proof shows: a line about this thing that a document backs, or a colleague confirmed. */
    const people = new Set([d.fromParticipantId, d.onParticipantId].filter(Boolean) as string[]);
    const backing = lines.find((l) => (l.mark === 'proven' || l.mark === 'confirmed')
      && l.wordsMayBeRead && r.personMayBeRead(l.participantId)
      && (!l.participantId || people.has(l.participantId) || r.mayReadEveryone)
      && isAboutTheThing(l.text, d.what));
    const proof: ABlocker['proof'] = backing
      ? {
        state: 'shown',
        says: backing.mark === 'proven'
          ? `A document backs what ${mid(whoIs(r, backing.participantId))} said about it.`
          : `A colleague confirmed what ${mid(whoIs(r, backing.participantId))} said about it.`,
      }
      : { state: 'none', says: `Nothing on record proves it yet. It rests on what ${mid(who)} said.` };

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
      && isAboutTheThing(c.text, d.what));
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
      order: new Date(d.createdAt).getTime(),
    });
  }
  /* The ones raised most often first, then the oldest. */
  return out
    .sort((a, b) => (b.raised?.times ?? 1) - (a.raised?.times ?? 1) || a.order - b.order)
    .map(({ order, ...b }) => b);
}
