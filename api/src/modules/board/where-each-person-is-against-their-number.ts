import { A_FORTNIGHT, waysThrough, type Effort } from '../conversation/a-blocker-is-not-a-blocker-until-you-have-tried';
import { carriesANumber } from '../reports/a-number-written-as-a-word-is-a-number';

/**
 * THE ONE PAGE A MANAGER ACTUALLY OPENS.
 *
 * Asked by a chief of staff running ten salespeople against 270 leases: "I need to know where each
 * person is and what to do with them." The board could not answer it. It showed the team - what is
 * agreed, where people differ, what is in the way - which is the right shape for a team of four
 * working on one thing, and the wrong shape entirely for ten people each carrying their own number.
 *
 * So this is ten rows, one per person, ordered by what needs attention rather than by name.
 *
 * IT RANKS SITUATIONS, NOT PEOPLE. Nothing here scores anybody, and the order is not a league
 * table: a person at the top is a person whose week has something in it worth a conversation, and
 * somebody quietly hitting their number belongs at the bottom precisely because there is nothing to
 * do. The moment this sorts on attainment it becomes a performance ranking published to a manager,
 * which is a different product and not this one.
 *
 * AND IT NEVER SAYS WHAT SOMEBODY IS. "Musa is blocked" is a status anybody could read off the
 * board, and "Musa is coasting" is a judgement nobody has earned the right to make. What a manager
 * can act on is the gap between how long a thing has sat and what has been tried, and one thing to
 * ask for. See `whatToAskThemToDo` next door.
 */

export interface PersonRow {
  participantId: string;
  who: string;
  /**
   * WHETHER `who` IS A NAME OR A ROLE STANDING IN FOR ONE.
   *
   * Somebody with no name of their own falls back to their role, which is right and reads on a list
   * of people as a person called "Head of Sales, West Africa". Watched on a live board with two.
   *
   * MY FIRST VERSION ASKED THE WRONG QUESTION. It tested whether they had an account, and both of
   * them did - they had joined and simply never gave a first name, so the flag said "joined" while
   * the row still showed a role. The condition is not about joining at all: it is whether the
   * label is a name. Asked of the label, which is the only thing that can answer it.
   */
  nameIsTheirRole?: boolean;
  /** Their own target from the board, where one belongs to them. */
  target: number | null;
  count: number;
  /** Have they answered the round that is currently open. */
  answeredThisRound: boolean;
  /** How many rounds have opened for them in all. */
  roundsSoFar: number;
  /** What they have said is in their way, oldest first. */
  /** `onTheReader`: what they wait on is with the person reading the board (request 65). */
  /** `since`: the day it began, said in place of a count of days (request 117, part 9). `days` is measured to the record's own clock. */
  inTheWay: { what: string; owner: string | null; days: number; tried: Effort; onTheReader?: boolean; since?: string | null }[];
  /**
   * WHETHER ANYTHING THEY SAID THIS ROUND CAN BE CHECKED: the check-in's own read of how checkable
   * their answers were, and, for a check-in not read yet, whether the record of it holds a number, a
   * date or a document.
   *
   * Hafsah, 28 September 2026: the rating of how specific and checkable a person's answers are is
   * needed. It rates the answers, not the person or their work, so decision 11 does not cover it,
   * and the prototype shows it on the lead's board as "Nothing checkable", with what to ask next.
   * Between 27 and 28 September (a1747927) the board asked only the record and called it "nothing to
   * count yet"; this puts back what the prototype shows. Only whoever runs the check-in reads it.
   */
  saidAnythingCheckable: boolean;
  /** How many check-ins in a row they missed just before their latest one (night quality run 1: Jared missed two, then answered). */
  missedJustBefore?: number;
  /** How many of their check-ins in a row, up to this one, had nothing checkable. */
  nothingCheckableInARow?: number;
  /** Whether what was missing was proof: a photo, a message or a document. */
  noProof?: boolean;
  /** "week" on a weekly check-in, so the row can say "the second week in a row". */
  roundIsA?: 'week' | 'fortnight' | 'month' | 'check-in';
  /**
   * WHETHER THIS READER MAY SEE THIS PERSON'S TARGET AT ALL (decision 53, item 11; decision 47).
   *
   * The lead, and the person themselves, always see it; another admin does only where the ground's
   * `whoSeesTargets` shares it with everybody. Where it is hidden, `target` on this row is already
   * null, so nothing here can tell the difference between "hit the number" and "cannot see the
   * number" - and "has checked in, and nothing here needs you this week" was being said in both
   * cases, which is a claim about the second case this reader has no way to know is true. Such a
   * reader reads only that the person has checked in.
   */
  targetHiddenFromReader?: boolean;
  /**
   * SET WHERE AN ADMIN DID NOT LET THIS PERSON INTO THE ORGANISATION (screens request 85).
   * There is nobody to ask to check in, so the row says what happened and asks for nothing. `by` is
   * the decider's name; the board builds this row only for whoever runs the check-in or an admin,
   * the same readers who may see the decider on GET /grounds/:id.
   */
  notLetIn?: { by: string | null; at: Date | null; declined?: boolean };
  /** Invited and has not joined yet, by the one joined rule (withWhoHasNotJoinedMarked). */
  notJoinedYet?: boolean;
}

/**
 * Why this row is where it is. One reason, the strongest. These are keys for the order and for the
 * screen to choose a colour by; they are never the words a lead reads about a person. What a lead
 * reads is `says`, a full sentence about what happened. Read on the board, 27 Sep 2026: the key sat
 * beside the name as a coloured pill, so "stuck and not chasing" read as a label on the person. The key itself was renamed on 12 October
 * (Hafsah: no labels on people), so the words cannot reach a page even by mistake.
 */
export type Reason =
  | 'has not answered'
  | 'something in the way two weeks'
  | 'behind the pace'
  | 'nothing checkable'
  | 'waiting on someone'
  | 'nothing to do'
  | 'not let in'
  /* Invited and has not joined yet: counted, and named as not joined (Hafsah, 1 November), so never "has not checked in" (round 3). */
  | 'not joined';

/** Ordered worst first. The order IS the product; a manager reads down until it stops mattering. */
const ORDER: Reason[] = ['has not answered', 'something in the way two weeks', 'behind the pace', 'nothing checkable', 'waiting on someone', 'nothing to do', 'not let in', 'not joined'];

/**
 * A NUMBER, A DATE OR A DOCUMENT, READ OFF ONE LINE OF THE RECORD.
 *
 * A fact about what was written down, and nothing about the person who said it. Numbers written as
 * words count ("forty tonnes a week" is a number: a rice miller's one fact per answer was lost the
 * last time this was read as a digit only). "May" counts only beside a day, because on its own it is
 * nearly always the verb. What counts as a number is the report's rule too, from one place: see
 * a-number-written-as-a-word-is-a-number.
 */
const A_DATE = [
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
  /\b\d{1,2}(?:st|nd|rd|th)?\s+may\b|\bmay\s+\d{1,2}\b/i,
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|yesterday)\b/i,
  /\b(?:every|each|per|by|within|since|last|next|this)\s+(?:day|week|fortnight|month|quarter|year)\b/i,
];
export function hasANumberADateOrADocument(line: { text?: string | null; anchoredDocumentId?: string | null; documentSays?: string | null }): boolean {
  if (line.anchoredDocumentId || (line.documentSays ?? '').trim()) return true;
  const text = line.text ?? '';
  return carriesANumber(text) || A_DATE.some((r) => r.test(text));
}

/**
 * BEHIND THE PACE IS A COMPARISON WITH THE CALENDAR, NOT WITH ANOTHER PERSON.
 *
 * Somebody on 4 of 35 is not behind if one round of twelve has happened. The only honest read is
 * against how much of the run has gone, and it needs a planned length to mean anything at all -
 * without one it says nothing rather than guessing.
 */
export function behindThePace(row: PersonRow, roundsPlanned: number | null): boolean {
  if (row.target == null || !roundsPlanned || roundsPlanned <= 0 || row.roundsSoFar <= 0) return false;
  const soFar = Math.min(1, row.roundsSoFar / roundsPlanned);
  /* A fifth of the way behind where the calendar is. Wide on purpose: sales does not arrive evenly,
     and a read that fires on every ordinary lumpy quarter is one a manager learns to ignore. */
  return row.count < row.target * soFar * 0.8;
}

/** Something in the way a fortnight or more that has only been asked about, oldest first. */
function sittingUnchased(row: PersonRow) {
  return row.inTheWay
    .filter((b) => b.days >= A_FORTNIGHT && (b.tried === 'nothing' || b.tried === 'asked-once' || b.tried === 'asked-again'))
    .sort((a, b) => b.days - a.days);
}

export function whyThisRow(row: PersonRow, roundsPlanned: number | null): Reason {
  if (row.notLetIn) return 'not let in';
  if (row.notJoinedYet) return 'not joined';
  if (!row.answeredThisRound) return 'has not answered';
  if (sittingUnchased(row).length) return 'something in the way two weeks';
  if (behindThePace(row, roundsPlanned)) return 'behind the pace';
  if (!row.saidAnythingCheckable) return 'nothing checkable';
  /*
   * SOMEBODY WAITING ON A COLLEAGUE IS NOT "NOTHING TO DO" (request 115 d). Neema, Amani and Baraka were
   * each waiting on Rukia, recently and already chased, and the lead's board sent "nothing to do" beside
   * them while the same row said they still had something in the way. A wait on the reader keeps its own
   * sentence below ("is waiting on you"), so this is only a wait on somebody else.
   */
  if (row.inTheWay.length && !row.inTheWay.some((b) => b.onTheReader)) return 'waiting on someone';
  return 'nothing to do';
}

/**
 * WHAT THE LEAD READS ABOUT EACH PERSON: WHAT HAPPENED, AND WHAT WOULD CHANGE IT.
 *
 * One or two full sentences, with the person's name as the row already resolves it for this reader.
 * Never a word for what somebody is. "Behind" and "not chasing" were read beside names as labels;
 * a count against the calendar, and how long a thing has sat against what was tried, are facts the
 * lead can do something with.
 *
 * Where nobody has given a name, `who` was their role, and "Head of Sales has not checked in" read
 * as if the role were a person, so the sentence said "the person listed as" the role. The board no
 * longer uses the role as a name at all (request 36: it is the lead's own description of the
 * person), so somebody with no name is "a colleague", or "another colleague" where there are several,
 * in the words every surface uses (plainWordsByPerson in party-labels).
 */
/** The plain words for somebody with no name (party-labels' plainWordsByPerson), in any case. */
const PLAIN_WORDS = /^(?:(?:a|an|one|another)\s+(?:[a-z]+\s+)?colleague|(?:your|the)\s+lead)$/i;

export function subjectFor(row: Pick<PersonRow, 'who' | 'nameIsTheirRole'>, atTheStart: boolean): string {
  const who = (row.who ?? '').trim();
  if (!who) return atTheStart ? 'A colleague' : 'a colleague';
  if (PLAIN_WORDS.test(who)) {
    const lower = who.toLowerCase();
    return atTheStart ? `${lower[0].toUpperCase()}${lower.slice(1)}` : lower;
  }
  if (row.nameIsTheirRole) return `${atTheStart ? 'The' : 'the'} person listed as ${who}`;
  return who;
}

const ORDINAL: Record<number, string> = { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth' };

export function whatHappened(row: PersonRow, reason: Reason, roundsPlanned: number | null): string {
  const start = subjectFor(row, true);
  const mid = subjectFor(row, false);
  switch (reason) {
    case 'not let in':
      if (row.notLetIn?.declined === false) return `${start} is waiting to be let in, so there is nobody to ask yet.`;
      return row.notLetIn?.by
        ? `${start} was not let in by ${row.notLetIn.by}, so there is nobody to ask.`
        : `${start} was not let in, so there is nobody to ask.`;
    case 'has not answered':
      return `${start} has not checked in for this session yet.`;
    case 'not joined':
      return `${start} was invited and has not joined yet.`;
    case 'something in the way two weeks': {
      const oldest = sittingUnchased(row)[0];
      /* The day it began, never a count of days from the reading (request 117, part 9). */
      const days = `${oldest.days} ${oldest.days === 1 ? 'day' : 'days'}`;
      if (oldest.onTheReader) return oldest.since ? `${start} has been waiting on you for ${oldest.what} since ${oldest.since}.` : `${start} has been waiting ${days} on you for ${oldest.what}.`;
      const sat = oldest.since ? `since ${oldest.since}` : `for ${days}`;
      if (oldest.tried === 'nothing') {
        return `${start} has had something in the way ${sat}, and nobody has said yet what was tried to clear it. Finding out who could clear it, and asking them, would move it.`;
      }
      return `${start} has had something in the way ${sat}, and so far it has only been asked about. Chasing it, or asking someone else, would move it.`;
    }
    case 'behind the pace': {
      const gone = Math.min(row.roundsSoFar, roundsPlanned ?? row.roundsSoFar);
      const rounds = `${gone} of the ${roundsPlanned} rounds ${gone === 1 ? 'has' : 'have'} gone`;
      return `${start} is at ${row.count} of ${row.target}, and ${rounds}. At this pace, ${row.target} would not be reached by the end.`;
    }
    case 'nothing checkable': {
      const n = row.nothingCheckableInARow ?? 1;
      const again = n >= 2 ? ` This is the ${ORDINAL[n] ?? `${n}th`} ${row.roundIsA ?? 'check-in'} in a row.` : '';
      return `Nothing ${mid} said this round can be checked yet.${again} A number, a date or a document for what moved would change that.`;
    }
    case 'waiting on someone': {
      const w = [...row.inTheWay].sort((a, b) => b.days - a.days)[0];
      const what = w.what.trim().replace(/[.!?]+$/, '').replace(/^(The|A|An|Whether|What|How|Which|Who|When|If)\b/, (x) => x.toLowerCase());
      const forWhat = /^(whether|what|how|which|who|when|if)\b/.test(what) ? `a decision on ${what}` : what;
      const owner = (w.owner ?? '').trim();
      /* With the day it began, so the row's ask need not say the wait again (request 117, parts 7 and 9). */
      if (w.since) {
        return owner
          ? `${start} has checked in, and has been waiting on ${owner} for ${forWhat} since ${w.since}.`
          : `${start} has checked in, and has been waiting for ${forWhat} since ${w.since}.`;
      }
      return owner
        ? `${start} has checked in, and is waiting on ${owner} for ${forWhat}.`
        : `${start} has checked in, and is waiting for ${forWhat}.`;
    }
    case 'nothing to do':
    default: {
      /* Never "nothing here needs you" while they are waiting on you (week 16): Today lists it too. */
      const onYou = row.inTheWay.find((b) => b.onTheReader);
      if (onYou) {
        const what = onYou.what.trim().replace(/[.!?]+$/, '').replace(/^(The|A|An|Whether|What|How|Which|Who|When|If)\b/, (w) => w.toLowerCase());
        const forWhat = /^(whether|what|how|which|who|when|if)\b/.test(what) ? `a decision on ${what}` : what;
        return onYou.since
          ? `${start} has checked in, and has been waiting on you for ${forWhat} since ${onYou.since}.`
          : `${start} has checked in, and is waiting on you for ${forWhat}.`;
      }
      /* Decision 53, item 11: never told "nothing here needs you" when this reader cannot see
         whether that is true. */
      if (row.targetHiddenFromReader) return `${start} has checked in.`;
      /*
       * AND NEVER WHILE SOMETHING IS STILL IN THEIR WAY (review of 1 October 2026). Femi Okonkwo read
       * "has checked in, and nothing here needs you this week" on the lead's board while the same
       * board listed him waiting on his customers' bank statements, because he had chased them and it
       * was under a fortnight old, so there was nothing to ask. Something open is something.
       */
      if (row.inTheWay.length) return `${start} has checked in, and still has something in the way.`;
      /* Never after two missed in a row (night quality run 1): Jared answered once after missing two, and the board said nothing needed the lead. The misses themselves reach the lead only at decision 136's threshold. */
      if ((row.missedJustBefore ?? 0) >= 2) return `${start} has checked in.`;
      return `${start} has checked in, and nothing here needs you this week.`;
    }
  }
}

export interface Ranked {
  participantId: string;
  who: string;
  /** True where `who` is a role standing in for a name nobody has given. */
  nameIsTheirRole: boolean;
  target: number | null;
  count: number;
  reason: Reason;
  /** What happened and what would change it, in full sentences. The only words about the row a lead reads. */
  says: string;
  /** What the manager can ask them to do. Null where there is nothing to ask for. */
  ask: string | null;
  /** Whether an admin did not let this person in, who decided and when (request 85). Null where not. */
  notLetIn: boolean;
  notLetInBy: string | null;
  notLetInAt: Date | null;
}

/**
 * WHAT THEY HAVE SAID THEY TRIED, as the end of a sentence about them.
 *
 * `HOW_HARD_THEY_TRIED` next door says the same thing in the clipped form the conversation's own
 * notes use ("asked once"), and this row is read by a person, so it is said in full here. The tiers
 * are the same five; only escalated and went-around never reach this, because nothing is asked then.
 */
const WHAT_THEY_TRIED_SAID_IN_FULL: Record<Effort, string> = {
  'nothing': 'nobody has said yet what was tried',
  'asked-once': 'so far they have asked about it once',
  'asked-again': 'so far they have asked about it more than once, the same way each time',
  'escalated': 'it has been taken above the person it was with',
  'went-around': 'they found another way through',
};

/**
 * THE THING TO ASK FOR, drawn from the oldest unchased blocker, or nothing.
 *
 * It read "21 days on "the lease", asked once. Ask them to speak to Amina rather than write to
 * them." on the board: pieces joined by commas, and "them" where the row has a name. Now it is full
 * sentences with the name the row already resolves.
 *
 * AND THE BLOCKER IS NOT IN QUOTATION MARKS, because it is not their words. It is the phrase the
 * dependency reader wrote for it ("a clear definition of the role's objectives and expected
 * output"), and on the run of 26 September 16 of the 22 put in quotes here were in nobody's record.
 * A quote is only ever a person's own words from the record (see a-quote-is-what-they-said).
 *
 * AND NOT TWICE. Where the row's `says` already tells the lead how long it has sat and what was
 * tried (the row is there because of it), the ask carries only the ask. Pass `alreadySaid` then.
 */
export function whatToAskFor(row: PersonRow, alreadySaid: boolean | 'the wait' = false): string | null {
  const start = subjectFor(row, true);
  /* "Ask a colleague to check in" would mean anybody; the row is about one person, so "this colleague". */
  const them = subjectFor(row, false).replace(/^(?:a|an|one|another)\s+(?:[a-z]+\s+)?colleague$/, 'this colleague');
  /* Somebody an admin did not let in cannot be asked to do anything (screens request 85). */
  if (row.notLetIn) return null;
  if (!row.answeredThisRound) return `Ask ${them} to check in.`;
  const worst = [...row.inTheWay]
    .filter((b) => b.tried !== 'escalated' && b.tried !== 'went-around')
    .sort((a, b) => b.days - a.days)[0];
  /* Nothing checkable, and nothing in the way: what to ask next is the thing that would make it
     checkable. The prototype's rows carry one, such as "Name each customer" or "Ask for a buying date". */
  const askForSomethingCheckable = row.noProof
    ? `Ask ${them} for a photo, a message or a document that shows what moved.`
    : `Ask ${them} for a number or a date for what moved this round.`;
  if (!worst && !row.saidAnythingCheckable) return askForSomethingCheckable;
  if (!worst) return null;
  /*
   * AND "NOTHING CHECKABLE" ALWAYS COMES WITH WHAT TO ASK NEXT (request 116 b, decision 76). A row
   * that was nothing checkable and also had something in the way, under a fortnight old and already
   * chased, came out with no ask at all: the prototype's "Nothing checkable" with nothing beside it.
   * Where the thing in the way gives no ask of its own, the ask is the one that would make it checkable.
   */
  const noAskFromWhatIsInTheWay = !worst.onTheReader && worst.days < A_FORTNIGHT && worst.tried !== 'nothing';
  if (noAskFromWhatIsInTheWay && !row.saidAnythingCheckable) return askForSomethingCheckable;
  /*
   * AND WHAT THEY WAIT ON IS WITH YOU (screens request 65). Rukia read "Ask Amani Wekesa to speak to
   * Rukia Otieno rather than write to them." on her own board: an ask about her own reply, about her
   * in the third person. Where the thing is with the reader, the reader is the way through.
   */
  if (worst.onTheReader) {
    const waiting = worst.days === 0 ? 'is waiting' : `has been waiting ${worst.days} ${worst.days === 1 ? 'day' : 'days'}`;
    const theAsk = `Give ${them} an answer, or say when you will.`;
    if (alreadySaid) return theAsk;
    return worst.since
      ? `${start} has been waiting on you for ${worst.what} since ${worst.since}. ${theAsk}`
      : `${start} ${waiting} on you for ${worst.what}. ${theAsk}`;
  }
  if (worst.days < A_FORTNIGHT && worst.tried !== 'nothing') return null;
  /* What they said they are waiting on is often a thing, not somebody: "the handover from the current
     finance manager", "credit review". Read live on run-14, 28 Sep 2026: "Ask Jide Sanusi to speak to
     the handover from the current finance manager rather than write to them". A thing is nobody to
     speak to, so the ask is to find out who owns it. */
  const owner = aPersonCalled(worst.owner) ? worst.owner : null;
  const first = waysThrough({ what: worst.what, owner, days: worst.days, tried: worst.tried, chaseBy: null })[0];
  /*
   * FINDING THE OWNER IS THE LEAD'S TO DO (request 134 item 5; Hafsah, 5 October 2026). The row read
   * "Ask Amani Wekesa to find out who owns this by name." Amani is the one waiting, and the lead is
   * the one who can find out. So the lead is asked, and the person waiting is the reason: "Find out
   * who owns this, so that Amani Wekesa is not left waiting." Every other way through is still the
   * person's to take, so it is still asked of them.
   */
  const theLeadFindsTheOwner = /^Find out who owns\b/.test(first);
  const theAsk = theLeadFindsTheOwner
    ? `${first.split(/(?<=\.)\s/)[0].replace(/\.$/, '').replace(/\s+by name$/, '')}, so that ${them} is not left waiting.`
    : `Ask ${them} to ${first.charAt(0).toLowerCase()}${first.slice(1)}`;
  if (alreadySaid === 'the wait') {
    /* The row's own sentence already says the wait and since when; the ask adds only what was tried, and the ask (request 117, part 7). */
    const tried = WHAT_THEY_TRIED_SAID_IN_FULL[worst.tried];
    return `${tried.charAt(0).toUpperCase()}${tried.slice(1)}. ${theAsk}`;
  }
  if (alreadySaid) return theAsk;
  /* "has been waiting 0 days" was read live on run-14. Something that came up today says so. */
  if (worst.since) return `${start} has been waiting on ${worst.what} since ${worst.since}, and ${WHAT_THEY_TRIED_SAID_IN_FULL[worst.tried]}. ${theAsk}`;
  const since = worst.days === 0 ? 'is waiting' : `has been waiting ${worst.days} ${worst.days === 1 ? 'day' : 'days'}`;
  return `${start} ${since} on ${worst.what}, and ${WHAT_THEY_TRIED_SAID_IN_FULL[worst.tried]}. ${theAsk}`;
}

/** Whether what they said they are waiting on names somebody: a name, or a role that is a person. */
const A_ROLE = /^(?:the |our |their |my |a |an )?(?:head|manager|director|officer|lead|chair|chief|ceo|cfo|coo|cto|md|boss|supervisor|client|customer|buyer|supplier|partner|contractor|accountant|lawyer|auditor|committee|board|team)\b/i;
function aPersonCalled(owner: string | null | undefined): boolean {
  const o = (owner ?? '').trim();
  if (!o) return false;
  if (A_ROLE.test(o)) return true;
  /* One to three capitalised words and nothing else: a name, such as "Mr Eze" or "Grace Oyelaran". */
  return /^(?:(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+)?[A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2}$/.test(o);
}

export function whereEachPersonIs(rows: PersonRow[], roundsPlanned: number | null): Ranked[] {
  return rows
    .map((r) => {
      const reason = whyThisRow(r, roundsPlanned);
      /*
       * EACH FACT ONCE PER ROW (request 117, part 7). The stuck row's `says` already names how long and what was
       * tried, so the ask does not repeat it. And where `says` already names the wait and the day it began (a wait
       * on the reader, or on somebody else), the ask does not say the wait again: Rukia read "Amani Wekesa has
       * checked in, and is waiting on you for the price list." and then "Amani Wekesa has been waiting 4 days on
       * you for the price list. Give Amani Wekesa an answer ..." on one row.
       */
      const sorted = [...r.inTheWay].sort((a, b) => b.days - a.days);
      const theWaitSaid = reason === 'waiting on someone'
        ? sorted[0]
        : reason === 'nothing to do' ? r.inTheWay.find((b) => b.onTheReader) : undefined;
      const theWaitAsked = sorted.filter((b) => b.tried !== 'escalated' && b.tried !== 'went-around')[0];
      const saidAlready = reason === 'something in the way two weeks'
        ? true
        : theWaitSaid?.since && theWaitAsked && theWaitSaid === theWaitAsked ? (theWaitSaid.onTheReader ? true : 'the wait' as const) : false;
      const ask = whatToAskFor(r, saidAlready);
      return {
        participantId: r.participantId,
        who: r.who,
        nameIsTheirRole: r.nameIsTheirRole === true,
        target: r.target,
        count: r.count,
        reason,
        says: reason === 'nothing to do' && ask && !r.inTheWay.some((b) => b.onTheReader)
          /* Not "nothing here needs you" over a row that then asks for something (read live, run-14). */
          ? `${subjectFor(r, true)} has checked in.`
          : whatHappened(r, reason, roundsPlanned),
        ask,
        notLetIn: !!r.notLetIn,
        notLetInBy: r.notLetIn?.by ?? null,
        notLetInAt: r.notLetIn?.at ?? null,
      };
    })
    .sort((a, b) => {
      const byReason = ORDER.indexOf(a.reason) - ORDER.indexOf(b.reason);
      if (byReason !== 0) return byReason;
      /*
       * AND SOMEBODY WE CANNOT NAME GOES LAST WITHIN THEIR REASON.
       *
       * Read on a live board, 23 September 2026: "A teammate - no name given - has not answered -
       * Ask them to check in." at the very top, above the one person who had answered and whose
       * account is the only content on the page.
       *
       * "Has not answered" is rightly the first reason - it is the one thing a lead can act on. But
       * the action is "ask them", and you cannot ask somebody whose name the product does not hold.
       * An unnamed row is the least actionable row in its own category, so it sorts to the bottom of
       * it rather than to the top of the page on an alphabetical accident.
       */
      if (a.nameIsTheirRole !== b.nameIsTheirRole) return a.nameIsTheirRole ? 1 : -1;
      /* Within that, by name, so the order does not shuffle between reads and read as movement. */
      return a.who.localeCompare(b.who);
    });
}

/**
 * A ROW SAYS "NOTHING HERE NEEDS YOU" ONLY WHERE NOTHING ON THE SAME PAGE IS ABOUT THAT PERSON
 * (review of 1 October 2026).
 *
 * The row is worked out from the person's own number and blockers; the page around it also lists
 * the differences between people and what keeps coming up. On the sales run Femi Okonkwo's row
 * said "nothing here needs you this week" while what keeps coming up said he had had the same
 * thing in the way for 3 check-ins. Where the page names the person, by id or by the name this
 * reader sees, the row keeps "has checked in." and leaves the rest to what the page says.
 */
const NOTHING_NEEDS_YOU = /, and nothing here needs you this week\.$/;
export function notNothingWhereThePageSaysSomething<T extends { participantId: string; who?: string | null; says?: string }>(
  rows: T[],
  aboutSomebody: { participantId: string | null; who: string | null }[],
): T[] {
  const ids = new Set(aboutSomebody.map((a) => a.participantId).filter(Boolean) as string[]);
  const names = new Set(aboutSomebody.map((a) => (a.who ?? '').trim().toLowerCase()).filter((w) => w && w !== 'you' && w !== 'a colleague'));
  return rows.map((row) => {
    if (typeof row.says !== 'string' || !NOTHING_NEEDS_YOU.test(row.says)) return row;
    const named = ids.has(row.participantId) || names.has(String(row.who ?? '').trim().toLowerCase());
    return named ? { ...row, says: row.says.replace(NOTHING_NEEDS_YOU, '.') } : row;
  });
}

/**
 * THE ROW'S FINDING DOES NOT SAY THE WAIT A THIRD TIME (request 117, part 7). "The team today" read, on Amani's
 * row, "Amani Wekesa has checked in, and is waiting on you for the price list." in `says`, the same wait again in
 * `ask`, and "Amani is waiting for you to send a price list." in `finding`, the report's sentence about her. Where
 * the row already says a wait, a sentence of the finding that is about waiting for the same thing is left out.
 * The rest of the finding stays as the report wrote it. Null where nothing is left.
 */
const SMALL_WORDS = new Set(['the', 'a', 'an', 'for', 'to', 'of', 'on', 'and', 'from', 'with', 'about', 'their', 'your', 'this', 'that', 'send', 'sent', 'get', 'give']);
const wordsIn = (t: string) => (t.toLowerCase().match(/[a-z][a-z'-]+/g) ?? []).filter((w) => w.length >= 3 && !SMALL_WORDS.has(w));
export function aFindingThatDoesNotSayTheWaitAgain(finding: string, waitsTheRowSays: readonly string[]): string | null {
  const text = (finding ?? '').trim();
  if (!text || !waitsTheRowSays.length) return text || null;
  const kept = text.split(/(?<=[.!?])\s+/).filter((sentence) => {
    if (!/\bwait(?:s|ing|ed)?\b/i.test(sentence)) return true;
    const here = new Set(wordsIn(sentence));
    return !waitsTheRowSays.some((w) => {
      const theirs = wordsIn(w);
      return theirs.length > 0 && theirs.every((x) => here.has(x));
    });
  });
  const out = kept.join(' ').trim();
  return out || null;
}
