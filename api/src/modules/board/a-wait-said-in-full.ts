/**
 * A WAIT, SAID IN FULL, FOR THE PERSON READING IT (request 115 h).
 *
 * The board's "Waiting on" cards read "Waiting on: Chandarana Westlands", "Waiting on: the warehouse" and
 * "Waiting on: Rukia Otieno": two pieces joined by a colon, with nobody saying who is waiting. Each handoff
 * now carries `waitingSays`, one sentence that says who waits on whom, with "you" for the reader on either
 * side:
 *   "Baraka Mwangi is waiting on Chandarana Westlands."
 *   "You are waiting on the warehouse."
 *   "Amani Wekesa is waiting on you."
 *   "Baraka Mwangi is waiting on somebody outside this check-in."
 * The names are the ones this reader is already served on the same row (`from`, `on`), so nothing new is
 * said about anybody.
 */

/** "A colleague" and the other plain words for somebody with no name, which are not capitalised mid-sentence. */
export const PLAIN_WORDS = /^(?:(?:a|an|one|another|the same)\s+(?:[a-z]+\s+)?colleague|(?:your|the)\s+lead)$/i;

const midSentence = (who: string) => (PLAIN_WORDS.test(who) ? who.toLowerCase() : who);
const atTheStart = (who: string) => (who ? `${who[0].toUpperCase()}${who.slice(1)}` : who);

/*
 * A WAIT THAT HAS BEEN CLEARED IS SAID IN THE PAST (item 21, the founder's board). Ada read "You are waiting on their
 * lawyer." on a row whose status was CLEARED. It now reads "You were waiting on your lawyer, and that has been cleared."
 */
export function aWaitSaidInFull(
  wait: { from: string | null; fromParticipantId: string | null; on: string | null; onParticipantId: string | null; status?: string | null; what?: string | null },
  readerParticipantId: string | null,
): string {
  /* A holder that is only the thing waited for ("the tax view") is not a holder (request 134). */
  if (!wait.onParticipantId && aHolderThatIsOnlyTheThing(wait.on, wait.what)) {
    const thing = (wait.what ?? '').trim().replace(/^["\u201c](.*)["\u201d]$/, '$1');
    const mine = !!readerParticipantId && wait.fromParticipantId === readerParticipantId;
    const cleared = String(wait.status ?? '').toUpperCase() === 'CLEARED';
    const who = mine ? 'You' : (wait.from ?? '').trim() ? atTheStart((wait.from ?? '').trim()) : 'Somebody on this check-in';
    const verb = mine ? (cleared ? 'were' : 'are') : (cleared ? 'was' : 'is');
    return `${who} ${verb} waiting for ${thing}${cleared ? ', and that has been cleared' : ', and nobody has been named to provide it'}.`;
  }
  const readerWaits = !!readerParticipantId && wait.fromParticipantId === readerParticipantId;
  const readerIsWaitedOn = !!readerParticipantId && wait.onParticipantId === readerParticipantId;
  const on = readerIsWaitedOn ? 'you' : (wait.on ?? '').trim() ? midSentence((wait.on ?? '').trim()) : 'somebody outside this check-in';
  const cleared = String(wait.status ?? '').toUpperCase() === 'CLEARED';
  if (readerWaits) return cleared ? `You were waiting on ${on}, and that has been cleared.` : `You are waiting on ${on}.`;
  const from = (wait.from ?? '').trim() ? atTheStart((wait.from ?? '').trim()) : 'Somebody on this check-in';
  return cleared ? `${from} was waiting on ${on}, and that has been cleared.` : `${from} is waiting on ${on}.`;
}

/*
 * A WAIT IS NEVER SAID WITH ITS HOLDER AND ITS THING AS ONE (requests 127 and 134). The holder and the thing were joined
 * with "for" whatever they held, and three faults came out:
 *   "Amani Wekesa is waiting on the tax view for "the tax view"."      The holder is the thing.
 *   "Aisha Wanjiku is waiting on the pipeline for a fix for the pipeline."   The thing holds the holder.
 *   "You are waiting on a decision on who owns them for owners with dates."  The holder is itself a decision.
 * Where the holder is only the thing, the sentence says what is waited for and that nobody has been named to provide it.
 * Where the holder is a decision, both are waited for.
 */
const THE_WORDS = (t: string): string => t.toLowerCase().replace(/["“”'.,;:!?]/g, ' ').replace(/\b(?:the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
const A_DECISION_LABEL = /^(?:a|an|the)\s+(?:decision|approval|answer|response|reply|sign-?off|go-ahead|fix|review)\b/i;

/** Whether a holder that is a thing ("the tax view") is only the thing waited for. */
export function aHolderThatIsOnlyTheThing(holder: string | null | undefined, what: string | null | undefined): boolean {
  const h = THE_WORDS((holder ?? '').trim());
  const t = THE_WORDS((what ?? '').trim());
  return !!h && !!t && /^(?:the|a|an)\s/i.test((holder ?? '').trim()) && (h === t || t.endsWith(h) || t.startsWith(`${h} `) || h.endsWith(t) || h.startsWith(`${t} `));
}

export function theWaitSaid(
  who: string,
  isAre: string,
  on: string | null | undefined,
  what: string,
): string {
  const thing = (what ?? '').trim().replace(/^["“](.*)["”]$/, '$1');
  const holder = (on ?? '').trim();
  if (!holder) return `${who} ${isAre} waiting for ${thing}.`;
  if (aHolderThatIsOnlyTheThing(holder, thing)) {
    const fuller = THE_WORDS(thing).length >= THE_WORDS(holder).length ? thing : holder;
    return `${who} ${isAre} waiting for ${fuller}, and nobody has been named to provide it.`;
  }
  if (A_DECISION_LABEL.test(holder)) return `${who} ${isAre} waiting for ${holder}, and for ${thing}.`;
  return `${who} ${isAre} waiting on ${holder} for ${thing}.`;
}
