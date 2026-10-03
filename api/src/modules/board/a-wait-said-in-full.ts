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
const PLAIN_WORDS = /^(?:(?:a|an|one|another|the same)\s+(?:[a-z]+\s+)?colleague|(?:your|the)\s+lead)$/i;

const midSentence = (who: string) => (PLAIN_WORDS.test(who) ? who.toLowerCase() : who);
const atTheStart = (who: string) => (who ? `${who[0].toUpperCase()}${who.slice(1)}` : who);

/*
 * A WAIT THAT HAS BEEN CLEARED IS SAID IN THE PAST (item 21, the founder's board). Ada read "You are waiting on their
 * lawyer." on a row whose status was CLEARED. It now reads "You were waiting on your lawyer, and that has been cleared."
 */
export function aWaitSaidInFull(
  wait: { from: string | null; fromParticipantId: string | null; on: string | null; onParticipantId: string | null; status?: string | null },
  readerParticipantId: string | null,
): string {
  const readerWaits = !!readerParticipantId && wait.fromParticipantId === readerParticipantId;
  const readerIsWaitedOn = !!readerParticipantId && wait.onParticipantId === readerParticipantId;
  const on = readerIsWaitedOn ? 'you' : (wait.on ?? '').trim() ? midSentence((wait.on ?? '').trim()) : 'somebody outside this check-in';
  const cleared = String(wait.status ?? '').toUpperCase() === 'CLEARED';
  if (readerWaits) return cleared ? `You were waiting on ${on}, and that has been cleared.` : `You are waiting on ${on}.`;
  const from = (wait.from ?? '').trim() ? atTheStart((wait.from ?? '').trim()) : 'Somebody on this check-in';
  return cleared ? `${from} was waiting on ${on}, and that has been cleared.` : `${from} is waiting on ${on}.`;
}
