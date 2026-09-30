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
const FIRST_PERSON_FRAME = /^(?:i will|i'll|i am going to|i'm going to|i plan to|we will|we'll)\s+/i;
const FIRST_PERSON_WORD = /\b(?:i|me|my|mine|myself|we|us|our|ours|ourselves)\b/i;
export function inOurVoice(what: string | null | undefined): string | null {
  const trimmed = String(what ?? '').trim();
  if (!trimmed) return null;
  const frame = FIRST_PERSON_FRAME.exec(trimmed);
  const rest = (frame ? trimmed.slice(frame[0].length) : trimmed).trim().replace(/[.!?]+$/, '');
  if (!rest || FIRST_PERSON_WORD.test(rest)) return null;
  return rest[0].toLowerCase() + rest.slice(1);
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
    status: string; theySaidIt: boolean; settledBy?: string | null; fromAPaste?: boolean;
    saidWordForWord?: boolean; whenSaidWordForWord?: boolean;
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
  const stated = c.statedInSession ?? null;
  const status = String(c.status).toUpperCase();
  const open = status === 'UNKNOWN';
  const sessionsOpen = stated !== null ? Math.max(0, sessionsSoFar - stated) : null;
  const out: string[] = [];
  const quoteWhat = c.saidWordForWord === true;
  const quoteWhen = c.whenSaidWordForWord === true;

  const clause = inOurVoice(c.what);

  if (!c.theySaidIt) {
    if (quoteWhat) {
      out.push(stated !== null
        ? `In session ${stated}, the lead said that ${mid} would do this, "${c.what}"`
        : `The lead said that ${mid} would do this, "${c.what}"`);
    } else if (clause) {
      out.push(stated !== null
        ? `In session ${stated}, the lead committed ${mid} to ${clause}.`
        : `The lead committed ${mid} to ${clause}.`);
    } else {
      out.push(stated !== null
        ? `In session ${stated}, the lead committed ${mid} to something, which is in the record.`
        : `The lead committed ${mid} to something, which is in the record.`);
    }
    out.push(`${who} did not say it.`);
  } else if (quoteWhat) {
    if (stated !== null) out.push(`In session ${stated}, ${mid} said, "${c.what}"`);
    else if (c.fromAPaste) out.push(`In what the lead pasted in, ${mid} ${isWord} down to do this, "${c.what}"`);
    else out.push(`${who} said, "${c.what}"`);
  } else if (clause) {
    if (stated !== null) out.push(`In session ${stated}, ${mid} committed to ${clause}.`);
    else if (c.fromAPaste) out.push(`In what the lead pasted in, ${mid} committed to ${clause}.`);
    else out.push(`${who} committed to ${clause}.`);
  } else if (stated !== null) out.push(`In session ${stated}, ${mid} made a commitment, which is in the record.`);
  else out.push(`${who} made a commitment, which is in the record.`);
  if (c.when && quoteWhen) out.push(`The time ${c.theySaidIt ? mid : 'the lead'} gave for it was "${c.when}".`);
  else if (c.when && looksLikeATimeOrADate(c.when)) out.push(`The time ${c.theySaidIt ? mid : 'the lead'} gave for it was ${c.when}.`);
  if (c.restatedIn.length) {
    out.push(`${who} said it again in ${c.restatedIn.length === 1 ? `session ${c.restatedIn[0]}` : `sessions ${listed(c.restatedIn)}`}.`);
  }
  if (open) {
    out.push(sessionsOpen !== null && sessionsOpen > 0
      ? `It has been open for ${sessionsOpen} ${sessionsOpen === 1 ? 'session' : 'sessions'}, and nobody has said whether it happened.`
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
      const on = d.onParticipantId ? labelOf(d.onParticipantId) : (d.onLabel ?? null);
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
        ? ` for ${sessionsWaiting} ${sessionsWaiting === 1 ? 'session' : 'sessions'} now`
        : '';
      const sentences = [
        `${from} is waiting on ${on ?? 'somebody outside this check-in'} for "${d.what}"${howLong}.`,
        d.escalatedAt
          ? 'Somebody went back about it after that.'
          : 'Nothing on record says anybody has chased it since.',
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
        chased: !!d.escalatedAt,
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
      const where = seen.length ? `sessions ${seen.join(', ')}` : `${howMany} ${howMany === 1 ? 'session' : 'sessions'}`;
      const consecutive = p.periodsObserved >= 3 ? ', consecutively' : seen.length >= 3 ? ', not consecutively' : '';
      const say = surfaced
        ? `Seen in ${where} of ${sessionsSoFar}${consecutive}. Enough sessions to be a pattern rather than an incident.`
        : `Seen in ${where} of ${sessionsSoFar}. One or two sessions of something is not yet a pattern, and it is here so a reader can see what it was.`;
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

/** "is to cover the branches", "is Relationship officer, Ikeja": the description after "is". */
function afterIs(sentence: string): string {
  const m = /^([a-z]+)\b/.exec(sentence);
  if (!m) return sentence;
  const plain = TO_THE_PLAIN_VERB[m[1]] ?? (PLAIN_VERBS.has(m[1]) ? m[1] : null);
  if (!plain) return sentence;
  /* And a later fragment that is another thing they are there to do joins the first one. */
  const rest = sentence.slice(m[1].length).replace(/; ([a-z]+)\b/g, (whole, verb: string) =>
    (TO_THE_PLAIN_VERB[verb] ? `, and to ${TO_THE_PLAIN_VERB[verb]}` : whole));
  return `to ${plain}${rest}`;
}

/** What the record holds, in one list a sentence can end on. */
function whatTheRecordHolds(p: APersonsRecord): string {
  const holds = [
    aCount(p.sessions, 'session', 'sessions'),
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
      const titleOnly = expected.toLowerCase().replace(/[.\s]+$/, '') === p.label.toLowerCase().replace(/[.\s]+$/, '')
        || expected.split(/\s+/).length <= 5;
      return {
        participantId: p.participantId,
        who: p.label,
        expected,
        recordHolds: holds,
        say: titleOnly
          ? `${p.label} is down as "${expected.replace(/[.\s]+$/, '')}", and nothing on record says what that role covers. Since then, the record holds ${holds}.`
          : `The role written down for ${p.label} is ${afterIs(asOneSentence(expected))}. Since then, the record holds ${holds}.`,
      };
    });
}

/* ------------------------------------------------------------------------------------------------
 * AND WHAT NONE OF IT CAN TELL A READER
 * ---------------------------------------------------------------------------------------------- */

export function whatThisCannotTellYou(o: {
  documentsAttached: number;
  peopleWhoAnswered: number;
  peopleInvited: number;
  anybodyAskedWhoArrangedThings: boolean;
}): string[] {
  const out: string[] = [];
  if (!o.documentsAttached) {
    out.push('Nothing here is backed by a document. Every line is what somebody said, and none of it has been checked against anything outside this check-in.');
  }
  if (o.peopleWhoAnswered < o.peopleInvited) {
    out.push(`${o.peopleInvited - o.peopleWhoAnswered} of ${o.peopleInvited} people have not answered yet, so anything about them is missing rather than absent.`);
  }
  if (!o.anybodyAskedWhoArrangedThings) {
    out.push('Nobody on record has said who arranged the meetings that happened, so this cannot tell you who secured them.');
  }
  out.push('Most of what anybody did is not in here. This is what was said in the sessions, and nothing else.');
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
}): string[] {
  const out: string[] = [];

  const restated = theOnesStillOpen(o.commitments).filter((c) => c.restatedIn.length >= 2);
  if (restated.length) {
    const first = restated[0];
    /* Quoted only where `what` is the person's own words; otherwise said plainly, unquoted. */
    const what = first.saidWordForWord === true
      ? `"${first.what}"`
      : first.what.trim().replace(/[.!?]+$/, '').replace(/^\p{Ll}/u, (c) => c.toUpperCase());
    out.push(`${what} has been said again in ${first.restatedIn.length} sessions and nobody has said whether it happened. Ask ${first.who} what it is waiting on, and decide whether it is still wanted.`);
  }

  const inside = o.dependencies.filter((d) => !d.chased && d.onParticipantId);
  if (inside.length) {
    out.push(`${inside.length === 1 ? 'One thing is' : `${inside.length} things are`} waiting on somebody in this check-in, and nothing on record says anybody has gone back about it. Ask whether it was raised outside the sessions, because the record cannot tell you.`);
  }

  const outside = o.dependencies.filter((d) => !d.onParticipantId && !d.chased);
  if (outside.length) {
    out.push(`${outside.length === 1 ? 'One thing is' : `${outside.length} things are`} waiting on somebody outside this check-in, and nothing on record says anybody has chased it. Ask what has been tried beyond writing to them.`);
  }

  if (!o.anybodySaidWhoArrangedThings) {
    out.push('Nobody on record has said who arranged the meetings that happened. Ask who secured each one before crediting anybody with them.');
  }

  if (!o.documentsAttached) {
    out.push('Nothing here is backed by a document. Ask for one thing in writing that you could check yourself.');
  }

  const surfaced = o.patterns.filter((p) => String(p.status).toUpperCase() === 'SURFACED');
  for (const p of surfaced.slice(0, 2)) {
    out.push(`${p.observation} Seen in ${p.seenInSessions.length} sessions. Ask ${p.who}${A_QUESTION_BUILT_FROM_A_PATTERN_ENDS}`);
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
  return `in ${count} ${count === 1 ? 'session' : 'sessions'}`;
}

export function overTimeAsServed(it: WhatTheRecordShowsOverTime | null | undefined): WhatTheRecordShowsOverTime | null {
  if (!it) return null;
  return {
    ...it,
    inSessions: inSessions(it.sessions),
    /* The sentence is rebuilt from the row, so a report stored before it was rewritten reads it too. */
    commitments: (it.commitments ?? []).map((c) => (c && typeof c.what === 'string' && typeof c.who === 'string' && typeof c.theySaidIt === 'boolean'
      ? { ...c, say: aCommitmentSaid({ ...c, restatedIn: c.restatedIn ?? [] }, it.sessions ?? 0) }
      : c)),
    patterns: [],
    toSettleFirst: (it.toSettleFirst ?? []).filter((q) => !String(q).endsWith(A_QUESTION_BUILT_FROM_A_PATTERN_ENDS)),
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
): WhatTheRecordShowsOverTime | null {
  if (!it) return null;
  if (viewer.isLead) return overTimeAsServed(it);
  const mine = viewer.participantId;
  if (!mine) return null;
  return {
    sessions: it.sessions,
    inSessions: inSessions(it.sessions),
    commitments: (it.commitments ?? []).filter((c) => c.participantId === mine),
    dependencies: (it.dependencies ?? []).filter((d) => d.fromParticipantId === mine || d.onParticipantId === mine),
    /* Reads about people, all of them the lead's. */
    patterns: [],
    gaps: [],
    stillOpen: [],
    toSettleFirst: [],
    /* What none of it can tell anybody is true for every reader, and identifies nobody. */
    cannotTellYou: it.cannotTellYou ?? [],
  };
}
