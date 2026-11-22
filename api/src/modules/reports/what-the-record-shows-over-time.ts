import { theThingWaitedFor } from '../board/a-wait-said-in-full';
import { aPartyOutside, theSameThing } from '../board/a-thing-is-not-somebody';
import { someOfThemHave } from './some-of-them-has-or-have';
/**
 * THE LONGITUDINAL READ: WHAT THE RECORD SHOWS ACROSS EVERY SESSION, WRITTEN BY THE PRODUCT.
 *
 * Hafsah, 24 September 2026, on what a founder must be able to read before deciding about somebody:
 * goal, commitments, actions, evidence, progress, dependencies, patterns, gaps, contradictions,
 * unresolved issues, and the questions to clarify first. Measured against a live three-month
 * engagement, the report filled seven of those eleven and three came back empty - dependencies,
 * patterns and gaps - while the facts behind all three sat in tables the report never read.
 *
 * WHY THEY WERE EMPTY, AND IT IS NOT THE MODEL BEING LAZY. `networkPicture` is the hundred-account
 * read and correctly does not run for two people. `leadershipGaps` is a field the SYNTHESIS PROMPT
 * asks a model to route findings into, with its own instruction warning that "leadership findings
 * placed in divergences are lost" - and that is exactly what happened: both real findings went into
 * divergences, so the gaps section was empty on the one engagement that was entirely about a gap.
 * A section that exists only if a model remembers to route into it is a section that is sometimes
 * missing, and a founder cannot tell the difference between "nothing to report" and "not routed".
 *
 * SO THIS IS ARITHMETIC OVER ROWS AND NOTHING ELSE. Commitments made in check-ins, dependencies
 * between named people, pattern detections with their period history, and what the role was said to
 * be. No model is asked and no model can soften it. Where there is nothing, it says so in the same
 * words every time, which is what makes an empty section readable.
 *
 * AND IT IS NOT A VERDICT. Every line is a fact with the sessions it came from attached. "Said in
 * fortnight one, restated in three sessions, still open" is a countable thing about a promise. "He
 * is unreliable" is a judgement about a person, and this file does not produce one.
 */


import { THE_LEADS_LABEL } from './party-labels';
import { theNumbersPeopleCanRead } from '../board/an-aim-is-a-sentence-about-somebody';
import { whatWasTried, somebodyWentBackAboutIt, itWasTakenFurther } from './what-they-said-they-did-about-it';
import { anArticleSaidMidSentence } from '../board/a-holder-in-their-own-words';
import { oldWordingPutPlain } from './a-stored-sentence-reads-right';

export interface ACommitmentOverTime {
  participantId: string | null;
  who: string;
  what: string;
  /** Their own words for when. Never parsed into a date. */
  when: string | null;
  statedInSession: number | null;
  restatedIn: number[];
  status: string;
  /** Whether they said it themselves, or the lead said they would. */
  theySaidIt: boolean;
  /** How it was settled: SAID, PROVEN or CONFIRMED (week 9). Null while open or not known. */
  settledBy?: string | null;
  fromAPaste?: boolean;
  /**
   * The lead's label as the report is written (the party label, so the wrapper swaps in the lead's
   * name, or "you" for the lead themselves). The sentence names the lead with it, never "the lead".
   */
  leadLabel?: string;
  /**
   * Whether `what` (and, separately, `when`) is a passage of what the person actually typed, stamped
   * once when the commitment is written (conversation.service.ts, `saidWordForWord`/
   * `whenSaidWordForWord`). A model's own copy of a commitment is usually close but not exact, so
   * only a row stamped true here may be shown inside quotation marks. See aCommitmentSaid.
   */
  saidWordForWord?: boolean;
  whenSaidWordForWord?: boolean;
  /** The product's sentence about it, sessions and all. */
  say: string;
}

export interface ADependencyOverTime {
  what: string;
  from: string;
  fromParticipantId: string | null;
  /** The person it is on, where that is somebody in this check-in. */
  on: string | null;
  onParticipantId: string | null;
  sessionsWaiting: number | null;
  /**
   * Whether anybody went back about it after they first said they were waiting.
   *
   * Called `chased` and not `escalated` because this object is served whole. `overTime` is dumped
   * into the report and the board as it stands, so every key in it is on a page somebody reads, and
   * "escalated" is exactly the management word the wording rules ban. The row it comes from is
   * still `escalatedAt` in the database; this is the name it is read under.
   */
  chased: boolean;
  status: string;
  say: string;
}

export interface APatternOverTime {
  participantId: string;
  who: string;
  code: string;
  name: string;
  observation: string;
  seenInSessions: number[];
  consecutive: number;
  status: string;
  /** Whether it reached the floor, and by which count. */
  say: string;
}

export interface AGapOverTime {
  participantId: string;
  who: string;
  /** What the role was said to be, in the words somebody wrote. */
  expected: string;
  /** What the record holds about it: checkable lines, evidence, who moved it. */
  recordHolds: string;
  say: string;
}

export interface WhatTheRecordShowsOverTime {
  sessions: number;
  /**
   * The count of sessions as the end of a heading, in the right number: "in 1 session", "in 3
   * sessions" (screens request 87, which read "over 1 sessions"). Null before any session.
   */
  inSessions?: string | null;
  commitments: ACommitmentOverTime[];
  dependencies: ADependencyOverTime[];
  patterns: APatternOverTime[];
  gaps: AGapOverTime[];
  /** Named by somebody, never closed by anybody. */
  stillOpen: string[];
  /** What a reader may not conclude from any of it. */
  cannotTellYou: string[];
  /** What to settle before deciding anything about anybody. Questions, never conclusions. */
  toSettleFirst: string[];
}

export const NOTHING_OF_THIS_KIND = {
  commitments: 'Nobody has said they would do anything specific in a check-in yet.',
  dependencies: 'Nobody here has said they are waiting on anybody.',
  patterns: 'Nothing has been observed often enough to be a pattern.',
  gaps: 'No role here was defined, so there is nothing to read the record against.',
  stillOpen: 'Nothing was left open.',
};

/* ------------------------------------------------------------------------------------------------
 * COMMITMENTS - what somebody said they would do, and what happened to it
 * ---------------------------------------------------------------------------------------------- */

export interface ACommitmentRow {
  participantId: string | null;
  text: string;
  whenSaid: string | null;
  explicit: boolean;
  status: string;
  source: string;
  statedInSession: number | null;
  saidAgainIn: number[];
  /** How it was settled: SAID, PROVEN or CONFIRMED (week 9). Null while open. */
  settledBy?: string | null;
  /** Stamped when the row is written; see ACommitmentOverTime above. */
  saidWordForWord?: boolean | null;
  whenSaidWordForWord?: boolean | null;
}

export function commitmentsOverTime(
  rows: ACommitmentRow[],
  labelOf: (participantId: string | null) => string,
  sessionsSoFar: number,
  leadLabel: string = THE_LEADS_LABEL,
): ACommitmentOverTime[] {
  return (rows ?? []).map((c) => {
    const restatedIn = [...(c.saidAgainIn ?? [])].sort((a, b) => a - b);
    const stated = c.statedInSession ?? null;
    const who = labelOf(c.participantId);
    const row = {
      participantId: c.participantId,
      who,
      what: c.text,
      when: c.whenSaid ?? null,
      statedInSession: stated,
      restatedIn,
      status: c.status,
      theySaidIt: !!c.explicit,
      settledBy: c.settledBy ?? null,
      fromAPaste: c.source === 'PASTE',
      leadLabel,
      saidWordForWord: c.saidWordForWord === true,
      whenSaidWordForWord: c.whenSaidWordForWord === true,
    };
    return { ...row, say: aCommitmentSaid(row, sessionsSoFar) };
  });
}

/**
 * A WORD SAYING WHETHER `s` READS AS A TIME OR A DATE, so a `whenSaid` that is not one of those is
 * never read out as though it were.
 *
 * Caught on run 20 (24-scenario run, 30 September 2026): a commitment's `text` had landed in a report
 * as though it were the time given for it, and "lead that review with the team" is not a time at all.
 * Short, and holding a day, a month, a number, or a word like "next" or "soon" that only makes sense
 * about when something happens: that is what a person's answer to "when" actually looks like.
 */
const A_TIME_OR_DATE = /\b(?:today|tomorrow|tonight|yesterday|next|this|last|by|before|after|soon|asap|now|end of|week|weeks|month|months|day|days|year|years|session|sessions|morning|afternoon|evening|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|q[1-4]|quarter|deadline|\d)\b/i;
export function looksLikeATimeOrADate(s: string): boolean {
  const words = s.trim().split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 8) return false;
  return A_TIME_OR_DATE.test(s);
}

/**
 * A COMMITMENT'S TEXT, MADE PART OF THE PRODUCT'S OWN SENTENCE, so it never reads as a clipped
 * instruction ("committed to this. Lead that review with the team.") or as first-person words put
 * into a sentence that is not that person's own ("Priti Sharma committed to this. I'll reach out to
 * the InfoSec team...", "I" belonging to nobody the reader is reading about).
 *
 * A commitment is usually written first person - "I will do X", "I'll do X" - because that is how the
 * person said it. Said in our own voice, that becomes "{who} committed to do X": the leading
 * first-person frame comes off, and the verb after it is lower-cased since it is now the middle of a
 * sentence, not its start. A fragment that never had a first-person frame ("lead that review with the
 * team", the lead's own shorthand for what somebody would do) already reads as the object of
 * "committed to" once it is lower-cased, so nothing else changes.
 *
 * AND WHERE A FIRST-PERSON WORD IS LEFT AFTER THAT - "my", "me", "I", "our", deeper in the sentence
 * than the opening frame - IT CANNOT BE SAID SAFELY IN OUR VOICE, because whoever it belongs to is
 * not the "I" of this sentence any more. Null tells the caller to fall back to a sentence with no
 * text in it at all.
 */
/*
 * AND THE OTHER WAYS PEOPLE SAY THEY WILL (item 21, the founder's board). "I just need to schedule a dedicated call
 * for that exact topic." and "I am continuing to assess the documentation and codebases" kept their "I", so the
 * board said "you made a commitment, which is in the record." with nothing in it. Each of these frames is taken off
 * the same way, with up to two small words between ("I just need to", "I will definitely").
 */
const FIRST_PERSON_FRAME = /^(?:i|we)(?:\s+will|['’]ll|\s+am going to|['’]m going to|\s+are going to|['’]re going to|\s+plan to|\s+need to|\s+have to|\s+must|\s+intend to|\s+want to|\s+would like to|['’]d like to|\s+(?:just|still|also|really|definitely|now|then|first)(?:\s+(?:just|still|also|really|definitely|now|then|first))?\s+(?:will|need to|have to|must|want to|plan to))(?:\s+(?:just|still|also|really|definitely|now|then|first|be sure to|make sure to)){0,2}\s+/i;
/* "I am continuing to assess ..." is a promise to continue: "continue to assess ...". */
const FIRST_PERSON_CONTINUING = /^(?:i am|i['’]m|we are|we['’]re)\s+(?:still\s+)?continuing\s+(?=to\s)/i;
const FIRST_PERSON_WORD = /\b(?:i|me|my|mine|myself|we|us|our|ours|ourselves)\b/i;
/**
 * "ask Amina to provide me with the commercial terms for each client" is a promise the person made about themselves.
 * Said about them, "me" is "them" and "my" is "their"; said to them, it is "you" and "your". Only these three words are
 * turned, because they take no verb after them. A line with "I" or "we" in it still cannot be said in our voice.
 */
const OBJECT_FIRST_PERSON = /\b(?:me|my|myself)\b/gi;
export function inOurVoice(what: string | null | undefined, aboutThem?: 'you' | 'them'): string | null {
  const trimmed = String(what ?? '').trim();
  if (!trimmed) return null;
  const continuing = FIRST_PERSON_CONTINUING.exec(trimmed);
  /* "going to continue with that", kept without its "I" (item 21, the support desk board): "You committed to going to continue with that." */
  const frame = continuing ? null : FIRST_PERSON_FRAME.exec(trimmed) ?? /^going to\s+/i.exec(trimmed);
  const rest = (continuing ? `continue ${trimmed.slice(continuing[0].length)}` : frame ? trimmed.slice(frame[0].length) : trimmed).trim().replace(/[.!?]+$/, '');
  if (!rest) return null;
  /* "ask Zawadi myself whether..." said about them became "ask Zawadi themselves whether...", which reads as though Zawadi does it (anchor walk, 8 October). The "myself" there only stresses who asks; without it the sentence says the same thing. */
  let said = rest.replace(/\b((?:ask|tell|call|email|message|text|remind|speak to|talk to|check with)\s+[A-Za-z'’-]+)\s+myself\b/gi, '$1');
  if (FIRST_PERSON_WORD.test(said)) {
    if (!aboutThem) return null;
    const turned = said.replace(OBJECT_FIRST_PERSON, (w) => {
      const l = w.toLowerCase();
      return aboutThem === 'you' ? (l === 'me' ? 'you' : l === 'my' ? 'your' : 'yourself') : (l === 'me' ? 'them' : l === 'my' ? 'their' : 'themselves');
    });
    if (FIRST_PERSON_WORD.test(turned)) return null;
    said = turned;
  }
  return said[0].toLowerCase() + said.slice(1);
}

/**
 * ONE COMMITMENT, IN FULL SENTENCES, SAYING TRULY HOW IT WAS SETTLED (week 9).
 *
 * It read "Tobi Adewale: "I will continue to monitor client health closely." - said in session 1; by
 * their own timing, "next"; somebody marked it done." Joined with a colon, dashes and semicolons, and
 * "somebody marked it done" was untrue: Tobi settled it himself, in his own check-in. `settledBy`
 * says how it was settled (SAID on the person's own word, PROVEN by a document they added, CONFIRMED
 * by the colleague who received it), and the sentence says that. The person's quoted words are kept
 * exactly. No pronoun is guessed: the name is used again.
 *
 * AND QUOTATION MARKS GO ROUND A COMMITMENT'S TEXT OR TIME ONLY WHEN THOSE ARE ITS OWN WORDS.
 * `GroundCommitment.text` and `.whenSaid` are a model's reading of a check-in, and 6 of 604 served
 * quotes in run 20 (30 September 2026) were not, character for character, in the record they claimed
 * to be from - once a commitment's `text`, once a `whenSaid` that read like the commitment itself
 * ("lead that review with the team"), never anybody's exact words. `saidWordForWord` and
 * `whenSaidWordForWord` are stamped once, when the row is written (conversation.service.ts), true
 * only where the words are a passage of what the person typed in that session. Where either is false,
 * the marks come off and the sentence says plainly that it is what the person committed to, never
 * that these are their words, and names the person again rather than guessing a pronoun. A `when`
 * that does not read as a time or a date at all is left out rather than mislabelled as one.
 */
export function aCommitmentSaid(
  c: {
    who: string; what: string; when: string | null; statedInSession: number | null; restatedIn: number[];
    status: string; theySaidIt: boolean; settledBy?: string | null; fromAPaste?: boolean; leadLabel?: string;
    saidWordForWord?: boolean; whenSaidWordForWord?: boolean;
    /** Somebody else said it happened (board/somebody-said-it-happened.ts): who, the day, and their words where this reader may read them. */
    saidHappened?: { who: string; day: string | null; words: string | null } | null;
  },
  sessionsSoFar: number,
): string {
  /*
   * THE READER'S OWN NAME, SWAPPED FOR "You", IS "you" ANYWHERE BUT THE START OF A SENTENCE
   * (screens request 87). The name was put back as "You" on the row (a word on its own starts a
   * sentence), and this sentence is rebuilt from the row on every read, so it read "In session 1,
   * You committed" and "The time You gave for it". `who` is used as it is at the start of a
   * sentence and as `mid` everywhere else, and "is" becomes "are" after "you".
   */
  const who = c.who;
  const mid = who === 'You' ? 'you' : who;
  const isWord = who === 'You' ? 'are' : 'is';
  /* The lead is named with their label (their name, or "you" for the lead), never "the lead". */
  const leadStart = c.leadLabel ?? 'the lead'; // only a row kept before the label was stored
  const leadMid = leadStart === 'You' ? 'you' : leadStart;
  const leadFirst = leadStart.charAt(0).toUpperCase() + leadStart.slice(1);
  const stated = c.statedInSession ?? null;
  const status = String(c.status).toUpperCase();
  const open = status === 'UNKNOWN';
  const sessionsOpen = stated !== null ? Math.max(0, sessionsSoFar - stated) : null;
  const out: string[] = [];
  const quoteWhat = c.saidWordForWord === true;
  const quoteWhen = c.whenSaidWordForWord === true;

  /* What they said they would do, said about them ("ask Amina to provide them with ...") where it is not in their own marks. */
  const clause = inOurVoice(c.what, who === 'You' ? 'you' : 'them');
  /* The time is already said when every word of it is in their words, in any order (live copy, 21 November: "Monday morning... Wednesday"
     beside "call her monday morning, if nothing ill go to their westlands office wednesday" was said a second time on the end). */
  const whenAlreadySaidIn = (when: string, what: string) => { const f = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); const said = new Set(f(what).split(' ')); return !!f(when) && f(when).split(' ').every((w) => said.has(w)); };
  /* A piece that is not a sentence: it has no stop, starts in lower case and holds no "I" or "my". */
  const aFragmentOfTheirs = c.theySaidIt && quoteWhat && !!clause && !/[.!?]["\u201d]?\s*$/.test(String(c.what ?? '').trim()) && /^[a-z]/.test(String(c.what ?? '').trim()) && !FIRST_PERSON_WORD.test(String(c.what ?? ''));
  let whenIsInTheSentence = false;

  if (!c.theySaidIt) {
    if (quoteWhat) {
      out.push(stated !== null
        ? `In check-in ${stated}, ${leadMid} said that ${mid} would do this, "${c.what}"`
        : `${leadFirst} said that ${mid} would do this, "${c.what}"`);
    } else if (clause) {
      out.push(stated !== null
        ? `In check-in ${stated}, ${leadMid} committed ${mid} to ${clause}.`
        : `${leadFirst} committed ${mid} to ${clause}.`);
    } else {
      out.push(stated !== null
        ? `In check-in ${stated}, ${leadMid} committed ${mid} to something, which is in the record.`
        : `${leadFirst} committed ${mid} to something, which is in the record.`);
    }
    out.push(`${who} did not say it.`);
  } else if (aFragmentOfTheirs) {
    /* "In session 1, you said, "send the data room". The time you gave for it was "on Wednesday"." is two clipped quotes. A piece of
       theirs that is not a sentence is said as what they said they would do, with the time inside it (request 136 item 3). */
    const theTime = c.when && looksLikeATimeOrADate(c.when) && !whenAlreadySaidIn(c.when, c.what) ? ` ${c.when.trim().replace(/[.!?]+$/, '')}` : '';
    whenIsInTheSentence = true;
    out.push(stated !== null
      ? `In check-in ${stated}, ${mid} said ${who === 'You' ? 'you' : 'they'} would ${clause}${theTime}.`
      : c.fromAPaste ? `In what ${leadMid} pasted in, ${mid} ${isWord} down to ${clause}${theTime}.` : `${who} said ${who === 'You' ? 'you' : 'they'} would ${clause}${theTime}.`);
  } else if (quoteWhat) {
    if (stated !== null) out.push(`In check-in ${stated}, ${mid} said, "${c.what}"`);
    else if (c.fromAPaste) out.push(`In what ${leadMid} pasted in, ${mid} ${isWord} down to do this, "${c.what}"`);
    else out.push(`${who} said, "${c.what}"`);
  } else if (clause) {
    if (stated !== null) out.push(`In check-in ${stated}, ${mid} committed to ${clause}.`);
    else if (c.fromAPaste) out.push(`In what ${leadMid} pasted in, ${mid} committed to ${clause}.`);
    else out.push(`${who} committed to ${clause}.`);
  } else if (stated !== null) out.push(`In check-in ${stated}, ${mid} made a commitment, which is in the record.`);
  else out.push(`${who} made a commitment, which is in the record.`);
  /* The time once: "In session 1, you said, "I will deliver the Tuskys cookers on 9 October." The time you gave
     for it was "on 9 October"." said it twice (request 111 e). Where the words already say it, it is not repeated. */
  const whenAlreadySaid = !!c.when && whenAlreadySaidIn(c.when, c.what ?? '') && (quoteWhat || !!clause);
  if (whenAlreadySaid || whenIsInTheSentence) { /* said in the words above */ }
  /* Quoted or not, only words that read as a time are said as the time (messages test, 19 October, finding 11): "given their histories",
     kept word for word as the time Wanjiru gave, is a reason and is left out. */
  else if (c.when && quoteWhen && looksLikeATimeOrADate(c.when)) out.push(`The time ${c.theySaidIt ? mid : leadMid} gave for it was "${c.when}".`);
  else if (c.when && looksLikeATimeOrADate(c.when)) out.push(`The time ${c.theySaidIt ? mid : leadMid} gave for it was ${c.when}.`);
  if (c.restatedIn.length) {
    out.push(`${who} said it again in ${c.restatedIn.length === 1 ? `check-in ${c.restatedIn[0]}` : `check-ins ${listed(c.restatedIn)}`}.`);
  }
  if (open && c.saidHappened) {
    /* NEVER "NOBODY HAS SAID" WHEN SOMEBODY DID (messages test, 19 October, finding 4). It stays open: only its maker settles it. */
    const by = c.saidHappened.who;
    const on = c.saidHappened.day ? ` on ${c.saidHappened.day}` : '';
    const words = String(c.saidHappened.words ?? '').trim().replace(/"/g, '\u201d');
    out.push(words ? `${by} said${on}, "${/[.!?]$/.test(words) ? words : `${words}.`}"` : `${by} said${on} that it happened.`);
  } else if (open) {
    out.push(sessionsOpen !== null && sessionsOpen > 0
      ? `It has been open for ${sessionsOpen} ${sessionsOpen === 1 ? 'check-in' : 'check-ins'}, and nobody has said whether it happened.`
      : 'Nobody has said yet whether it happened.');
  } else {
    const outcome = status === 'DONE' ? 'done' : status === 'NOT_DONE' ? 'not done' : status === 'DROPPED' ? 'dropped' : status.toLowerCase().replace(/_/g, ' ');
    const by = String(c.settledBy ?? '').toUpperCase();
    if (by === 'PROVEN' && status === 'DONE') out.push(`A document ${mid} added shows it was done.`);
    else if (by === 'CONFIRMED' && status === 'DONE') out.push(`The colleague who received it confirmed that it was done.`);
    else if (by === 'SAID') out.push(`${who} said later that it was ${outcome}.`);
    else out.push(`It is marked ${outcome}, and the record does not say who marked it.`);
  }
  /* A quote ends inside its own marks; the sentence after it still starts on its own. */
  return out.map((t) => (/[.!?]"?$/.test(t) ? t : `${t}.`)).join(' ').replace(/([.!?])"\./g, '$1"');
}

const listed = (ns: number[]) => (ns.length <= 1 ? ns.join('') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`);

/**
 * THE ONES WORTH A FOUNDER'S EYE FIRST: open, and either old or said more than once.
 *
 * Not a ranking of people. A commitment restated three times and never closed is the single most
 * checkable thing in a record, whoever it belongs to.
 */
export function theOnesStillOpen(all: ACommitmentOverTime[]): ACommitmentOverTime[] {
  return all
    .filter((c) => String(c.status).toUpperCase() === 'UNKNOWN')
    .sort((a, b) => (b.restatedIn.length - a.restatedIn.length) || ((a.statedInSession ?? 99) - (b.statedInSession ?? 99)));
}

/* ------------------------------------------------------------------------------------------------
 * DEPENDENCIES - who is waiting on whom, in sessions rather than weeks
 * ---------------------------------------------------------------------------------------------- */

export interface ADependencyRow {
  what: string;
  fromParticipantId: string;
  onParticipantId: string | null;
  onLabel: string | null;
  status: string;
  escalatedAt: Date | null;
  /** What they said they had done about it, in their own words, where they said anything. */
  triedSaid?: string | null;
  /** Taken above the person it was with, or round them, as the assessment read their words. */
  takenFurther?: boolean | null;
  /** The session the person was in when they first said it. */
  statedInSession?: number | null;
}

export function dependenciesOverTime(
  rows: ADependencyRow[],
  labelOf: (participantId: string | null) => string,
  sessionsSoFar: number,
): ADependencyOverTime[] {
  return (rows ?? [])
    .filter((d) => String(d.status).toUpperCase() !== 'CLEARED')
    .map((d) => {
      /* A thing is not somebody: "the data structure decision" is what is waited for, not who holds it (request 107 b). */
      const on = d.onParticipantId ? labelOf(d.onParticipantId) : (aPartyOutside(d) ? (d.onLabel ? anArticleSaidMidSentence(d.onLabel) : null) : null);
      const aThingItWaitsOn = !d.onParticipantId && d.onLabel?.trim() && !aPartyOutside(d) && !theSameThing(d.onLabel, d.what) ? anArticleSaidMidSentence(d.onLabel.trim()) : null;
      const from = labelOf(d.fromParticipantId);
      const stated = d.statedInSession ?? null;
      const sessionsWaiting = stated !== null ? Math.max(0, sessionsSoFar - stated) : null;
      /*
       * FULL SENTENCES, ONE IDEA EACH, AND NOT A ROW OF FRAGMENTS JOINED BY SEMICOLONS.
       *
       * This line was the single most-repeated thing the product wrote. It appears on every
       * dependency of every report and board, and again in `stillOpen`, and it read:
       *
       *   Femi Okonkwo is waiting on Ngozi Eze for "their bank statements"; 2 sessions; nothing on
       *   record about escalating it; this is work Ngozi Eze owes Femi Okonkwo, not the other way
       *   round.
       *
       * Two problems, both of them the wording rules. "Escalating" is management jargon, and it was
       * on the page 163 times in one twenty-four-scenario run - more than every other banned word
       * put together. And the semicolons are the clipped shape the rules ban: four fragments where
       * three sentences say the same thing and read like a person wrote them.
       */
      const howLong = sessionsWaiting !== null && sessionsWaiting > 0
        ? ` for ${sessionsWaiting} ${sessionsWaiting === 1 ? 'check-in' : 'check-ins'} now`
        : '';
      /*
       * ONE SENTENCE, SO WHAT WAS TRIED NEVER STANDS WITHOUT THE THING IT WAS TRIED ON, AND READ FROM
       * WHAT THEY SAID AS WELL AS FROM THE PRODUCT'S OWN STAMP (review of 1 October 2026).
       *
       * Two sentences let the quote check take the first and leave "Nothing on record says anybody
       * has chased it since." on its own, about nothing, at the top of the lead's list. And the second
       * read only `escalatedAt`, the overnight sweep's stamp, so Ngozi Eze, who had said "I have
       * chased the committee four times in writing ... I also escalated to the Head of Credit", was
       * the one person told nobody had chased. See what-they-said-they-did-about-it.
       */
      const tried = whatWasTried(d);
      /* Never from `escalatedAt`, the product's own stamp: "somebody went back about it" was said when nobody had (decision 139, must-fix 3). */
      const since = tried === 'went-around' ? 'another way through has been tried'
          : itWasTakenFurther(d) ? 'it has been taken above the person it was with'
            : tried === 'escalated' || tried === 'asked-again' ? 'it has been chased more than once since'
              : tried === 'asked-once' ? 'it has been asked about once since'
                : 'nothing on record says anybody has chased it since';
      const sentences = [
        aThingItWaitsOn
          ? `${from} is waiting for "${d.what}"${howLong}, and ${since}. That waits on ${aThingItWaitsOn}.`
          : !on && d.onLabel?.trim()
            ? `${from} is waiting for "${d.what}"${howLong}, and ${since}.`
            : `${from} is waiting on ${on ?? 'somebody outside this check-in'} for "${d.what}"${howLong}, and ${since}.`,
      ];
      /*
       * THE DIRECTION IS THE FINDING, AND IT IS SAID PLAINLY BECAUSE IT KEEPS BEING READ BACKWARDS.
       * A lead waiting on somebody inside the check-in is not a lead with a communication problem.
       */
      if (d.onParticipantId) sentences.push(`This is work ${on} owes ${from}, not the other way round.`);
      return {
        what: d.what,
        from,
        fromParticipantId: d.fromParticipantId,
        on,
        onParticipantId: d.onParticipantId,
        sessionsWaiting,
        chased: somebodyWentBackAboutIt(d),
        status: d.status,
        say: sentences.join(' '),
      };
    });
}

/* ------------------------------------------------------------------------------------------------
 * PATTERNS - the period history, said out loud
 * ---------------------------------------------------------------------------------------------- */

export interface APatternRow {
  participantId: string;
  code: string;
  observationText: string | null;
  seenInSessions: number[];
  periodsObserved: number;
  lastPeriodNumber: number | null;
  status: string;
}

export function patternsOverTime(
  rows: APatternRow[],
  nameOf: (code: string) => string,
  labelOf: (participantId: string | null) => string,
  sessionsSoFar: number,
): APatternOverTime[] {
  return (rows ?? [])
    .filter((p) => (p.observationText ?? '').trim())
    .map((p) => {
      const seen = [...(p.seenInSessions ?? [])].sort((a, b) => a - b);
      const howMany = seen.length || p.periodsObserved || 1;
      const surfaced = String(p.status).toUpperCase() === 'SURFACED';
      /* "Seen in sessions 1 of 2" was one session (request 109 f). */
      const where = seen.length === 1 ? `check-in ${seen[0]}` : seen.length ? `check-ins ${seen.join(', ')}` : `${howMany} ${howMany === 1 ? 'check-in' : 'check-ins'}`;
      const consecutive = p.periodsObserved >= 3 ? ', consecutively' : seen.length >= 3 ? ', not consecutively' : '';
      const say = surfaced
        ? `It was seen in ${where} of ${sessionsSoFar}${consecutive}. Enough check-ins to be a pattern rather than an incident.`
        : `It was seen in ${where} of ${sessionsSoFar}. One or two check-ins of something is not yet a pattern, and it is here so a reader can see what it was.`;
      return {
        participantId: p.participantId,
        who: labelOf(p.participantId),
        code: p.code,
        name: nameOf(p.code),
        observation: (p.observationText ?? '').trim(),
        seenInSessions: seen,
        consecutive: p.periodsObserved,
        status: p.status,
        say,
      };
    })
    .sort((a, b) => (b.status === 'SURFACED' ? 1 : 0) - (a.status === 'SURFACED' ? 1 : 0) || b.seenInSessions.length - a.seenInSessions.length);
}

/* ------------------------------------------------------------------------------------------------
 * GAPS - the role as somebody wrote it, against what the record holds
 * ---------------------------------------------------------------------------------------------- */

export interface APersonsRecord {
  participantId: string;
  label: string;
  /** The role, in the words the lead used. Empty where nobody defined one. */
  expected: string;
  /** Lines taken from what they said. */
  lines: number;
  /** Of those, the ones with a name, a number or a date in them. */
  checkable: number;
  /** Of those, the ones a document backs. */
  documented: number;
  /** Open commitments of their own. */
  openCommitments: number;
  /** Things other people here are waiting on THEM for, uncleared. */
  owedToOthers: number;
  sessions: number;
}

/** "1 session", "none", "3 lines": a count a sentence can hold. Nought is "none", never "0". */
const aCount = (n: number, one: string, many: string) => (n === 0 ? `no ${many}` : `${n} ${n === 1 ? one : many}`);

/**
 * WORDS THAT START A FRAGMENT OF A ROLE AND ARE NOT ANYBODY'S NAME, so they can go lower case once
 * the fragments are one sentence. Anything else keeps the capital it was written with: "Ikeja"
 * after a stop is a place, and a place written "ikeja" is wrong.
 */
const ORDINARY_STARTS = new Set([
  'target', 'targets', 'aim', 'goal', 'goals', 'owns', 'runs', 'leads', 'manages', 'handles', 'covers',
  'works', 'responsible', 'reports', 'based', 'expected', 'must', 'should', 'will', 'needs', 'has', 'is',
  'was', 'joined', 'started', 'new', 'main', 'focus', 'focused', 'also', 'plus', 'the', 'a', 'an', 'to',
  'for', 'in', 'on', 'at', 'by', 'with', 'currently', 'supports', 'sells', 'builds', 'looks', 'brings',
  'delivers', 'oversees', 'keeps', 'makes', 'helps', 'deputy', 'acting', 'senior', 'junior', 'and',
  /* And the verbs a remit starts with, for the first word: "is build the government relationships". */
  'build', 'confirm', 'sell', 'find', 'grow', 'close', 'win', 'deliver', 'run', 'lead', 'own', 'manage',
  'support', 'bring', 'get', 'hit', 'reach', 'make', 'help', 'keep', 'cover', 'handle', 'set', 'open',
  'drive', 'recruit', 'hire', 'train', 'write', 'design', 'ship', 'launch', 'secure', 'raise', 'collect',
]);

/**
 * THE DESCRIPTION, AS ONE SENTENCE, WITH ITS WORDS UNCHANGED.
 *
 * A lead describes a person in fragments: "Relationship officer, Ikeja. Target 14 approved facilities
 * this quarter." Glued after "was taken on for:" that became "Ngozi Eze was taken on for:
 * Relationship officer, Ikeja. Target 14 approved facilities this quarter. What the record holds
 * about it: 1 session on reco...", a slot name, then the lead's two fragments, then another slot
 * name (sales, run 10, eighteen times on the lead's report and eighteen on the lead's board). Only
 * the stops between fragments change, to semicolons, so it reads as one sentence the way the lead
 * wrote it.
 */
function asOneSentence(description: string): string {
  const ordinary = (word: string) => (ORDINARY_STARTS.has(word.toLowerCase()) ? word.toLowerCase() : word);
  return description
    .trim()
    .replace(/[.!?\s]+$/, '')
    /* The first word too, since the description now continues "is ..." rather than starting one. */
    .replace(/^([A-Za-z][\w'-]*)/, (word: string) => ordinary(word))
    .replace(/([^\s.!?])[.!?]+\s+([A-Za-z][\w'-]*)/g, (_m, before: string, word: string) =>
      `${before}; ${ordinary(word)}`);
}

/**
 * A REMIT THAT STARTS WITH A VERB IS WHAT SOMEBODY IS THERE TO DO. "The role written down for Femi is
 * covers the mainland branches" is not English; "is to cover the mainland branches" is. The third
 * person goes back to the plain verb, from this short list only, and anything else is left alone.
 */
const TO_THE_PLAIN_VERB: Record<string, string> = {
  owns: 'own', runs: 'run', leads: 'lead', manages: 'manage', handles: 'handle', covers: 'cover',
  supports: 'support', sells: 'sell', builds: 'build', brings: 'bring', delivers: 'deliver',
  oversees: 'oversee', keeps: 'keep', makes: 'make', helps: 'help', drives: 'drive', recruits: 'recruit',
  trains: 'train', writes: 'write', designs: 'design', secures: 'secure', raises: 'raise', collects: 'collect',
};
const PLAIN_VERBS = new Set([...Object.values(TO_THE_PLAIN_VERB),
  'confirm', 'find', 'grow', 'close', 'win', 'get', 'hit', 'reach', 'set', 'open', 'hire', 'ship', 'launch']);

/*
 * A PLAIN VERB ONLY BEFORE WHAT IT ACTS ON. "Support team manager, six weeks in" is a job title, and read
 * "support" as the verb: "The role written down for Daniel Park is to support team manager" (run-21,
 * newmanager). A plain verb starts what somebody is there to do only where "the", "a", a number or a
 * possessive follows it ("Grow the book", "Hit 12 deals"); "owns", "runs" and the rest always do.
 */
const WHAT_A_VERB_ACTS_ON = /^\s+(?:the|a|an|our|their|his|her|its|all|every|each|new|\d)/i;

/** Whether the description starts with what somebody is there to do, rather than with a job title. */
function startsWithAVerb(sentence: string): boolean {
  const m = /^([A-Za-z]+)\b/.exec(sentence.trim());
  if (!m) return false;
  const w = m[1].toLowerCase();
  if (TO_THE_PLAIN_VERB[w]) return true;
  return PLAIN_VERBS.has(w) && WHAT_A_VERB_ACTS_ON.test(sentence.trim().slice(m[1].length));
}

/** "is to cover the branches", "is Relationship officer, Ikeja": the description after "is". */
function afterIs(sentence: string): string {
  const m = /^([a-z]+)\b/.exec(sentence);
  if (!m || !startsWithAVerb(sentence)) return sentence;
  const plain = TO_THE_PLAIN_VERB[m[1]] ?? (PLAIN_VERBS.has(m[1]) ? m[1] : null);
  if (!plain) return sentence;
  /* And a later fragment that is another thing they are there to do joins the first one. */
  const rest = sentence.slice(m[1].length).replace(/; ([a-z]+)\b/g, (whole, verb: string) =>
    (TO_THE_PLAIN_VERB[verb] ? `, and to ${TO_THE_PLAIN_VERB[verb]}` : whole));
  return `to ${plain}${rest}`;
}

/*
 * A ROLE WRITTEN AS A JOB TITLE IS SAID AS ONE, IN FULL SENTENCES (review of 1 October 2026, re-d, sales).
 *
 * The lead read "The role written down for Femi Okonkwo is Relationship officer, Lagos mainland; target
 * 12 approved facilities this quarter." - the lead's fragments joined with a semicolon. Now:
 *
 *   "Femi Okonkwo is a relationship officer for Lagos mainland, with a goal of 12 approved facilities
 *    this quarter."
 *   "Tobi Adewale is an Engagement Director. Tobi Adewale owns the relationships with the five largest
 *    clients."
 *
 * What somebody does ("owns", "hands", "did") is said about them; where they are ("on Daniel's team",
 * "currently building ...") is what they are; anything else the lead wrote is quoted as the role
 * description, word for word. A description that starts with what they are there to do keeps its
 * sentence ("The role written down for you is to manage ...").
 */
const A_GOAL = /^(?:targets?|goals?|aims?|quota)\b[:\s]*(?:(?:of|is)\s+)?(.+)$/i;
const SAID_ABOUT_THEM = /^(?:owns|runs|leads|manages|handles|covers|supports|sells|builds|brings|delivers|oversees|keeps|makes|helps|drives|recruits|trains|writes|designs|secures|raises|collects|hands|did|took|built|was|had|has|joined|started|works|reports)\b/i;
const WHAT_THEY_ARE = /^(?:currently|on|in|at|based|responsible|believed|expected|leaving|new|still)\b/i;

const anArticleFor = (title: string): string =>
  /^head of\b/i.test(title) ? '' : /^(?:[aeio]|u(?!ni|se|su))/i.test(title) ? 'an ' : 'a ';

/** The first word in lower case where it is an ordinary word ("Relationship officer"), not a name ("Engagement Director", "CFO"). */
const ordinaryFirst = (t: string): string => {
  const words = t.split(/\s+/);
  if (/^\p{Lu}\p{Ll}+$/u.test(words[0] ?? '') && (words.length === 1 || /^[\p{Ll}\p{N}-]/u.test(words[1]))) words[0] = words[0].toLowerCase();
  return words.join(' ');
};
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export function aRoleWrittenAsATitle(label: string, description: string): string | null {
  const fragments = description.trim().replace(/[.!?;\s]+$/, '').split(/(?<=[^\s.!?;])\s*(?:[.!?]+\s+|;\s*)/).map((f) => f.trim()).filter(Boolean);
  if (!fragments.length || startsWithAVerb(fragments[0])) return null;
  const [first, ...rest] = fragments;
  const comma = first.indexOf(', ');
  const title = ordinaryFirst(comma > 0 ? first.slice(0, comma) : first);
  const detail = comma > 0 ? first.slice(comma + 2).trim() : '';
  const where = !detail ? ''
    : /^\p{Lu}/u.test(detail) && !detail.includes(',') && detail.split(/\s+/).length <= 3 ? ` for ${detail}` : `, ${detail}`;
  const goals: string[] = [];
  const more: string[] = [];
  for (const f of rest) {
    const goal = A_GOAL.exec(f);
    if (goal) { goals.push(`a goal of ${theNumbersPeopleCanRead(goal[1].trim())}`); continue; }
    if (SAID_ABOUT_THEM.test(f)) { more.push(`${label} ${lowerFirst(f)}.`); continue; }
    if (WHAT_THEY_ARE.test(f)) { more.push(`${label} is ${lowerFirst(f)}.`); continue; }
    more.push(`The role description also says "${f}."`);
  }
  const withGoals = goals.length ? `, with ${goals.length === 1 ? goals[0] : `${goals.slice(0, -1).join(', ')} and ${goals[goals.length - 1]}`}` : '';
  /* The person's label is written from their job title ("Relationship officer"), and the names go in
     afterwards: a title that is also the label would be read as the name ("Ngozi Eze is a Ngozi Eze").
     Inside quotation marks it is left as the lead wrote it. */
  const isTheirLabel = label.toLowerCase().startsWith(title.toLowerCase());
  const role = isTheirLabel ? `down as "${comma > 0 ? first.slice(0, comma) : first}"` : `${anArticleFor(title)}${title}`;
  /* "Finance operations" is where somebody works, not one of a kind: "works in finance operations", never "is a finance operations" (item 21). */
  const aField = !isTheirLabel && /^\p{Ll}/u.test(title) && title.split(/\s+/).length <= 3
    && /^(?:operations|logistics|communications|relations|analytics|partnerships|payments|admissions)$/i.test(title.split(/\s+/).pop() ?? '');
  return [aField ? `${label} works in ${title}${where}${withGoals}.` : `${label} is ${role}${where}${withGoals}.`, ...more].join(' ');
}

/** What the record holds, in one list a sentence can end on. */
function whatTheRecordHolds(p: APersonsRecord): string {
  const holds = [
    aCount(p.sessions, 'check-in', 'check-ins'),
    `${aCount(p.lines, 'line', 'lines')} of what was said`,
    `${p.checkable === 0 ? 'none' : p.checkable} with a name, a number or a date in ${p.checkable === 1 ? 'it' : 'them'}`,
    `${p.documented === 0 ? 'none' : p.documented} backed by a document`,
  ];
  if (p.openCommitments) holds.push(`${aCount(p.openCommitments, 'commitment', 'commitments')} still open`);
  if (p.owedToOthers) holds.push(`${aCount(p.owedToOthers, 'thing', 'things')} somebody else here is waiting for`);
  return holds.length > 1 ? `${holds.slice(0, -1).join(', ')} and ${holds[holds.length - 1]}` : holds[0];
}

export function gapsOverTime(people: APersonsRecord[]): AGapOverTime[] {
  return (people ?? [])
    .filter((p) => (p.expected ?? '').trim())
    .map((p) => {
      const holds = whatTheRecordHolds(p);
      /*
       * THE SENTENCE IS THE COMPARISON AND NOT A CONCLUSION FROM IT. What the role was said to be,
       * and what the record holds. A reader draws the conclusion; that is the whole point of
       * putting the two next to each other.
       */
      /*
       * AND THE ROLE NAME IS NOT A DESCRIPTION OF THE ROLE.
       *
       * First run of this section printed "Government Liaison Consultant was taken on for:
       * Government Liaison Consultant", because `roleAsDescribed` is a job title and the sentence
       * assumed it was a remit. Where the only thing on record is the title, the sentence says so
       * plainly instead of reading it back as though it explained anything.
       *
       * AND NO SLOT NAMES. Both sentences are whole sentences, with the person's label where a name
       * goes, so the read puts the name in (or "you", for the lead's own row).
       */
      const expected = p.expected.trim();
      /* A title alone is one short piece. "Finance operations. Owns daily reconciliation." and "Senior engineer, doing
         the build" are five words each and say what the role covers, so they are not read as a title alone (item 21). */
      const onePiece = !/[,;]|[.!?]\s+\S/.test(expected.replace(/[.\s]+$/, ''));
      const titleOnly = expected.toLowerCase().replace(/[.\s]+$/, '') === p.label.toLowerCase().replace(/[.\s]+$/, '')
        || (onePiece && expected.split(/\s+/).length <= 5);
      return {
        participantId: p.participantId,
        who: p.label,
        expected,
        recordHolds: holds,
        say: titleOnly
          ? `${p.label} is down as "${expected.replace(/[.\s]+$/, '')}", and nothing on record says what that role covers. Since then, the record holds ${holds}.`
          : `${aRoleWrittenAsATitle(p.label, expected) ?? `The role written down for ${p.label} is ${afterIs(asOneSentence(expected))}.`} Since then, the record holds ${holds}.`,
      };
    });
}

/* ------------------------------------------------------------------------------------------------
 * AND WHAT NONE OF IT CAN TELL A READER
 * ---------------------------------------------------------------------------------------------- */

/** Whether any line speaks of a meeting, a visit or an introduction: only then is who arranged it a question. */
export function aMeetingIsOnRecord(lines: { text: string }[]): boolean {
  /* "met" and "meet" alone are not a meeting (release round, 5 October 2026): "met the target" and "meet the deadline" put
     the meetings line on five check-ins where nobody spoke of a meeting. Only "met with", "meet with" or "met up" is one. Nor is
     "introduced to the product" or "not able to visit": a person introduced to a person, or a visit that happened, is. */
  /* "met the Permanent Secretary", "meet Amina": met or meet before a name or a title, which is written with a capital. */
  const METS_A_PERSON = /\b(?:[Mm]et|[Mm]eet) (?:the |with |up with )?\p{Lu}/u;
  return lines.some((l) => /\b(?:meetings?|(?:met|meet|meeting) (?:with|up)|introduced (?:me|us|him|her|them)|introductions?|visited|appointments?)\b/i.test(String(l.text ?? '')) || METS_A_PERSON.test(String(l.text ?? '')));
}

/**
 * A STORED REPORT THAT SPEAKS OF MEETINGS NOBODY MENTIONED (requests 127, 129, 130, 131, 132, 134, 135, 136).
 *
 * The line about who arranged the meetings is only written where a meeting is on the record. Reports stored before
 * that rule still hold it, and a report is not rewritten when a board is opened. So it is left out when the record is
 * read now: the support desk, the loans, the outage and the founder's own check-in never spoke of a meeting.
 */
export const THE_MEETINGS_LINE = /^Nobody on record has said who arranged the meetings that happened/;

export async function meetingsOnRecordFor(prisma: any, groundId: string): Promise<boolean | undefined> {
  try {
    const rows: { text: string }[] | undefined = await prisma?.recordEntry?.findMany?.({
      where: { disputedAt: null, participant: { groundId } },
      select: { text: true },
    });
    return Array.isArray(rows) ? aMeetingIsOnRecord(rows) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * ONE COUNT OF WHO HAS ANSWERED (run 8: "Over time" said "Two of the five people have answered" while Today and the board said "2 of 4"). The line was written
 * with the report, from the count of that day, and kept. It is the same sentence `whatThisCannotTellYou` writes, said again from the board's one count.
 */
const A_STORED_COUNT_OF_WHO_HAS_NOT_ANSWERED = /not answered yet, so anything about them is missing rather than absent\.$/;
function withTheLiveCountOfWhoAnswered(lines: string[] | undefined, answered?: number | null, ofPeople?: number | null): string[] {
  const all = lines ?? [];
  if (typeof answered !== 'number' || typeof ofPeople !== 'number' || ofPeople <= 0) return all;
  return all.flatMap((l) => (A_STORED_COUNT_OF_WHO_HAS_NOT_ANSWERED.test(String(l))
    ? (answered < ofPeople ? [someOfThemHave(ofPeople - answered, ofPeople, 'not answered yet, so anything about them is missing rather than absent.')] : [])
    : [l]));
}

function withoutTheMeetingsLine(lines: string[] | undefined, meetingsOnRecord: boolean | undefined): string[] {
  const all = lines ?? [];
  return meetingsOnRecord === false ? all.filter((l) => !THE_MEETINGS_LINE.test(String(l))) : all;
}

export function whatThisCannotTellYou(o: {
  documentsAttached: number;
  peopleWhoAnswered: number;
  peopleInvited: number;
  anybodyAskedWhoArrangedThings: boolean;
  /**
   * Whether anybody spoke of a meeting at all (item 21, the outage check-in). "Nobody on record has said who arranged
   * the meetings that happened" was said on a check-in about an outage, where nobody had spoken of a meeting. Left out,
   * it is said as before.
   */
  meetingsOnRecord?: boolean;
}): string[] {
  const out: string[] = [];
  if (!o.documentsAttached) {
    out.push('Nothing here is backed by a document. Every line is what somebody said, and none of it has been checked against anything outside this check-in.');
  }
  if (o.peopleWhoAnswered < o.peopleInvited) {
    out.push(someOfThemHave(o.peopleInvited - o.peopleWhoAnswered, o.peopleInvited, 'not answered yet, so anything about them is missing rather than absent.'));
  }
  if (!o.anybodyAskedWhoArrangedThings && o.meetingsOnRecord !== false) {
    out.push('Nobody on record has said who arranged the meetings that happened, so this cannot tell you who secured them.');
  }
  out.push('Most of what anybody did is not in here. This is what was said in the check-ins, and nothing else.');
  return out;
}

/**
 * WHAT TO SETTLE BEFORE DECIDING ANYTHING, WRITTEN BY THE PRODUCT.
 *
 * She asked for this by name: "questions for the founder - what the founder should clarify before
 * making a decision". What the report had was one model-written central question, and on the
 * engagement that was entirely about a consultant who secured nothing, it asked: "what was the
 * single most useful action that led to the meeting with the Permanent Secretary's office" - a
 * meeting the client's own team had arranged, handed to him as an achievement.
 *
 * These come from rows instead, so they are the same questions every time the same facts are true.
 * Every one is answerable by a person in a sentence, and not one of them contains a conclusion.
 */
export function toSettleFirst(o: {
  commitments: ACommitmentOverTime[];
  dependencies: ADependencyOverTime[];
  patterns: APatternOverTime[];
  documentsAttached: number;
  anybodySaidWhoArrangedThings: boolean;
  /** Whether anybody spoke of a meeting at all; see whatThisCannotTellYou. */
  meetingsOnRecord?: boolean;
}): string[] {
  const out: string[] = [];

  const restated = theOnesStillOpen(o.commitments).filter((c) => c.restatedIn.length >= 2);
  if (restated.length) {
    const first = restated[0];
    /* Quoted only where `what` is the person's own words; otherwise said plainly, unquoted. */
    const what = first.saidWordForWord === true
      ? `"${first.what}"`
      : first.what.trim().replace(/[.!?]+$/, '').replace(/^\p{Ll}/u, (c) => c.toUpperCase());
    out.push(`${what} has been said again in ${first.restatedIn.length} check-ins and nobody has said whether it happened. Ask ${first.who} what it is waiting on, and decide whether it is still wanted.`);
  }

  const inside = o.dependencies.filter((d) => !d.chased && d.onParticipantId);
  if (inside.length) {
    out.push(`${inside.length === 1 ? 'One thing is' : `${inside.length} things are`} waiting on somebody in this check-in, and nothing on record says anybody has gone back about ${inside.length === 1 ? 'it' : 'them'}. Ask whether ${inside.length === 1 ? 'it was' : 'they were'} raised outside the check-ins, because the record cannot tell you.`);
  }

  const outside = o.dependencies.filter((d) => !d.onParticipantId && !d.chased);
  if (outside.length) {
    out.push(`${outside.length === 1 ? 'One thing is' : `${outside.length} things are`} waiting on somebody outside this check-in, and nothing on record says anybody has chased ${outside.length === 1 ? 'it' : 'them'}. Ask what has been tried beyond writing to ${outside.length === 1 ? 'them' : 'those people'}.`);
  }

  if (!o.anybodySaidWhoArrangedThings && o.meetingsOnRecord !== false) {
    out.push('Nobody on record has said who arranged the meetings that happened. Ask who secured each one before crediting anybody with them.');
  }

  if (!o.documentsAttached) {
    out.push('Nothing here is backed by a document. Ask for one thing in writing that you could check yourself.');
  }

  const surfaced = o.patterns.filter((p) => String(p.status).toUpperCase() === 'SURFACED');
  for (const p of surfaced.slice(0, 2)) {
    /* "Seen in 1 sessions." (request 109 f): the count and its noun agree. */
    const n = p.seenInSessions.length;
    out.push(`${p.observation} It was seen in ${n === 1 ? 'one check-in' : `${n} check-ins`}. Ask ${p.who}${A_QUESTION_BUILT_FROM_A_PATTERN_ENDS}`);
  }

  const noRole = o.commitments.length === 0;
  if (noRole) out.push('Nobody has said in a check-in what they would do next. Ask for one thing, with a date, from each person.');

  return out;
}

/**
 * How the one question in `toSettleFirst` that is built from a pattern ends. It is the product's own
 * fixed sentence, so a stored read can be told apart from the questions around it without guessing -
 * see overTimeAsServed, which has to take it out of reports kept before patterns stopped being served.
 */
export const A_QUESTION_BUILT_FROM_A_PATTERN_ENDS = ' what they have changed about it since the first time.';

/**
 * AND NO PATTERN IN IT AT ALL, FOR ANY READER, WHETHER PATTERNS ARE SERVED OR NOT.
 *
 * This is the read the capability check found on the lead's board, 27 September 2026: "Seen once or
 * twice, not yet a pattern", fourteen lines like "You · Claimed Work Inflation · Seen in sessions…",
 * after two sessions. The record over time is still built and kept whole on the report, because
 * detection keeps running. But what is stored here was written at synthesis, with the internal name,
 * the person's name beside it and patterns seen once, and before the person it is about had read it,
 * so it can never be served under Hafsah's rules. Patterns reach a page only through
 * patterns/who-reads-a-pattern, read live from the rows; this read leaves out the patterns and the
 * questions made from them, with the switch on or off.
 */
export function inSessions(n: number | null | undefined): string | null {
  const count = Number(n ?? 0);
  if (!count || count < 1) return null;
  return `in ${count} ${count === 1 ? 'check-in' : 'check-ins'}`;
}

/**
 * A LINE ABOUT WHAT IS STILL OPEN NAMES WHAT IS STILL OPEN (review of 1 October 2026).
 *
 * The lead's list of what is still open read, on the sales run, "Nothing on record says anybody has
 * chased it since.", "Nobody has said yet whether it happened." and "The time Femi Okonkwo gave for
 * it was tomorrow. Nobody has said yet whether it happened.": the sentence that said what "it" was
 * had been taken out by the quote check, and the sentences after it stayed. A line that starts with
 * one of those after-sentences has lost its subject, and is not served.
 */
const A_LINE_THAT_LOST_ITS_SUBJECT = /^\s*(?:nothing on record says|somebody went back about it|nobody has said(?: yet)? whether it happened|it has been open for|the time .{1,80}? gave for it was|this is work .{1,80}? owes|it is marked|a document .{1,80}? shows it was done|the colleague who received it)/i;
export function theThingIsNamed(line: unknown): boolean {
  return typeof line === 'string' && !!line.trim() && !A_LINE_THAT_LOST_ITS_SUBJECT.test(line);
}

export function overTimeAsServed(
  it: WhatTheRecordShowsOverTime | null | undefined,
  /*
   * THE SESSIONS SO FAR, FROM THE RECORD AS IT IS NOW, where the caller has it (item 18). The stored count is the
   * one the report was written with, and on "Atlas delivery" it was 3 while two sessions had been finished, so
   * Tunde read "It has been open for 2 sessions" here and "It has been open for 1 session" in the work plan, about
   * the same commitment. The board passes its own count, the one the work plan uses.
   */
  opts: { sessionsSoFar?: number | null; meetingsOnRecord?: boolean; /** The one count (grounds/this-sessions-count.ts), so the line about who has not answered is the board's own number and never the one stored with the report. */ answered?: number | null; ofPeople?: number | null } = {},
): WhatTheRecordShowsOverTime | null {
  if (!it) return null;
  /*
   * A wait stored before it was written without "her" (Drop Access run 1, A7; theThingWaitedFor) reads as it is written now:
   * Grace read "Joseph Kariuki is waiting on you for her approval" from the report kept before the fix.
   */
  if (Array.isArray(it.dependencies)) {
    it = {
      ...it,
      dependencies: it.dependencies.map((d: any) => {
        if (!d || typeof d.what !== 'string' || !d.onParticipantId) return d;
        const what = theThingWaitedFor(d.what, d.onParticipantId);
        return what === d.what ? d : { ...d, what, ...(typeof d.say === 'string' ? { say: d.say.split(d.what).join(what) } : {}) };
      }),
    };
  }
  const sessionsSoFar = opts.sessionsSoFar && opts.sessionsSoFar > 0 ? opts.sessionsSoFar : (it.sessions ?? 0);
  /* The sentence is rebuilt from the row, so a report stored before it was rewritten reads it too. */
  const commitments = (it.commitments ?? []).map((c) => (c && typeof c.what === 'string' && typeof c.who === 'string' && typeof c.theySaidIt === 'boolean'
    ? { ...c, say: aCommitmentSaid({ ...c, restatedIn: c.restatedIn ?? [] }, sessionsSoFar) }
    : c));
  /*
   * AND WHAT IS STILL OPEN IS BUILT FROM THE SAME ROWS, as it was when the report was written: what
   * each person is waiting on, then the promises nobody closed, each in the sentence the list above
   * serves. A line that lost the sentence naming its thing is left out. See theThingIsNamed.
   */
  /* Only rows this read can rebuild: a row stored before the commitment carried who said it keeps its stored list. */
  const rebuilt = Array.isArray(it.dependencies) && Array.isArray(it.commitments) && it.commitments.some((c) => typeof c?.theySaidIt === 'boolean')
    ? [...it.dependencies.map((d) => d?.say), ...theOnesStillOpen(commitments as ACommitmentOverTime[]).slice(0, 10).map((c) => c.say)]
    : (it.stillOpen ?? []);
  return {
    ...it,
    sessions: sessionsSoFar,
    inSessions: inSessions(sessionsSoFar),
    /* A wait's line that lost the sentence naming it is not served (item 18): Amina read "Nothing on record says
       anybody has chased it since. This is work you owe Tobi Adewale, not the other way round." about nothing. */
    dependencies: Array.isArray(it.dependencies)
      ? it.dependencies.map((d: any) => (d && typeof d.say === 'string' ? (!theThingIsNamed(d.say) ? { ...d, say: null } : { ...d, say: oldWordingPutPlain(d.say) }) : d))
      : it.dependencies,
    commitments,
    stillOpen: (rebuilt as unknown[]).filter(theThingIsNamed).map((x) => oldWordingPutPlain(String(x))),
    patterns: [],
    cannotTellYou: withTheLiveCountOfWhoAnswered(withoutTheMeetingsLine(it.cannotTellYou, opts.meetingsOnRecord), opts.answered, opts.ofPeople),
    /* And by its count too (item 21, the support desk board): where the person asked is the reader, the question's end has
       already become "Your own account of this is not in this check-in." by the time it is read here, so Maria read "The
       record names another person positively with specific evidence of their contribution. Seen in 1 sessions. Your own
       account of this is not in this check-in." */
    toSettleFirst: withoutTheMeetingsLine(it.toSettleFirst, opts.meetingsOnRecord).filter((q) => !String(q).endsWith(A_QUESTION_BUILT_FROM_A_PATTERN_ENDS)
      && !/(?:^|[.!?]\s+)(?:It was seen|Seen) in (?:one session|\d+ sessions?)\.\s/.test(String(q))).map((q) => oldWordingPutPlain(String(q))),
  };
}

export function theRecordOverTime(o: {
  sessions: number;
  commitments: ACommitmentOverTime[];
  dependencies: ADependencyOverTime[];
  patterns: APatternOverTime[];
  gaps: AGapOverTime[];
  stillOpen: string[];
  cannotTellYou: string[];
  toSettleFirst: string[];
}): WhatTheRecordShowsOverTime {
  return {
    sessions: o.sessions,
    commitments: o.commitments,
    dependencies: o.dependencies,
    patterns: o.patterns,
    gaps: o.gaps,
    stillOpen: o.stillOpen,
    cannotTellYou: o.cannotTellYou,
    toSettleFirst: o.toSettleFirst,
  };
}

/**
 * AND A PARTICIPANT SEES ONLY THEIR OWN ROWS OF IT.
 *
 * Caught on a four-person sales ground, 24 September 2026, in the same session this section was
 * built. The board gates it correctly (`overTime: isInitiator ? ... : null`), and the REPORT does
 * not - the read returns the whole row - so a relationship officer opening his own report found
 * this in it:
 *
 *   "Relationship officer, Ikeja. Target 14 approved facilities this quarter. is waiting on the
 *    credit committee and the Head of Credit for the eleven complete files"
 *
 * That is his colleague's pipeline, her escalation and her label, on his page. On a four-person
 * team the role label names her as surely as her name would. Every other read in this file was
 * built for the lead, who may see all of it; nothing narrowed it for anybody else.
 *
 * WHAT A PARTICIPANT KEEPS. What they themselves said they would do, and what they themselves are
 * waiting on, because those are their own words coming back. Everything that is a read ABOUT people
 * - the patterns, the role-against-record gaps, the questions for the lead to settle, the list of
 * what is still open across everybody - is the lead's, and a participant gets none of it.
 *
 * FAIL CLOSED ON AN UNKNOWN READER. No participantId means no rows, not all rows.
 */
export function overTimeForThisReader(
  it: WhatTheRecordShowsOverTime | null | undefined,
  viewer: { isLead: boolean; participantId: string | null },
  opts: { meetingsOnRecord?: boolean; judgements?: boolean } = {},
): WhatTheRecordShowsOverTime | null {
  if (!it) return null;
  /* Judgements of a person off for the organisation (organisation/person-judgements.ts): the lead reads no pattern about anybody. */
  if (viewer.isLead) { const served = overTimeAsServed(it, { meetingsOnRecord: opts.meetingsOnRecord }); return served && opts.judgements === false ? { ...served, patterns: [] } as any : served; }
  const mine = viewer.participantId;
  if (!mine) return null;
  return {
    sessions: it.sessions,
    inSessions: inSessions(it.sessions),
    commitments: (it.commitments ?? []).filter((c) => c.participantId === mine),
    dependencies: (it.dependencies ?? []).filter((d) => d.fromParticipantId === mine || d.onParticipantId === mine).map((d) => (typeof d.say === 'string' ? { ...d, say: oldWordingPutPlain(d.say) } : d)),
    /* Reads about people, all of them the lead's. */
    patterns: [],
    gaps: [],
    stillOpen: [],
    toSettleFirst: [],
    /* What none of it can tell anybody is true for every reader, and identifies nobody. */
    cannotTellYou: withoutTheMeetingsLine(it.cannotTellYou, opts.meetingsOnRecord),
  };
}
