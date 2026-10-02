/**
 * WHETHER WHAT A WAIT IS ON IS SOMEBODY, OR A THING (request 107 b).
 *
 * The extraction writes what a person is waiting on into `onLabel`, and it is not always a person or a
 * team. Served as one, it read "You cannot move on the data structure decision until it comes from the
 * data structure decision." and "waiting on a decision on who owns them for owners with dates for the
 * API format". A label is somebody when it names a body of people ("the credit committee", "the
 * police", "the Head of Credit"), and a thing when it is the same as what is waited for, starts "a" or
 * "an", or names a thing that gets made or decided ("the data structure decision", "the pipeline fix").
 * Anything else is taken as somebody, because that is what a name is.
 */
const A_BODY_OF_PEOPLE = /\b(?:committee|team|board|office|officers?|department|dept|manager|managers|head|director|directors|provider|providers|customers?|clients?|police|bank|partners?|suppliers?|vendors?|ministry|government|lead|leads|finance|legal|hr|ops|operations|compliance|council|panel|staff|engineers?|agents?|people|landlord|regulator|auditors?|lawyers?|counsel|ceo|cfo|cto|coo|founder|founders|owner|owners|buyer|buyers|officer)\b/i;
const A_THING = /\b(?:decision|decisions|approval|sign-off|signoff|fix|answer|reply|confirmation|agreement|budget|access|data|structure|format|document|documents|report|plan|list|numbers|figures|payment|funding|release|update|information|details|clarification|review|go-ahead|spec|specification|design|contract|quote|estimate|feedback|result|results|outcome|money|cash|stock|delivery|parts?)\b/i;
const sameWords = (a: string) => a.toLowerCase().replace(/^(?:the|a|an)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** Whether two phrases name the same thing: "the data structure decision" and "data structure decision". */
export function theSameThing(x: string | null | undefined, y: string | null | undefined): boolean {
  const a = sameWords(x ?? ''); const b = sameWords(y ?? '');
  /* The label holds the whole of what is waited for. Not the other way round: "the Head of Credit's
     reply" holds "the Head of Credit", who is somebody. */
  return !!a && !!b && ` ${a} `.includes(` ${b} `);
}

export function aPartyOutside(d: { onLabel?: string | null; what?: string | null }): boolean {
  const on = (d.onLabel ?? '').trim();
  if (!on) return false;
  if (theSameThing(on, d.what)) return false;
  /* What a thing is "on" or "about" is not who it is: "a decision on who owns them" is a decision. */
  const head = on.split(/\s+(?:on|about|of|for|from|to|with|over)\s+/i)[0];
  if (A_BODY_OF_PEOPLE.test(head)) return true;
  if (/^(?:a|an)\s/i.test(on)) return false;
  return !A_THING.test(head);
}

/**
 * A WAIT ON ONESELF IS NOT A WAIT (screens request 111 e). Read by Rukia, who runs the sales board: "You are
 * waiting on themselves to approve a discount for Baraka Mwangi." The extraction wrote what she still had to
 * do herself as a wait, with "themselves" where the person waited on goes. Nobody waits on themselves: it
 * is their own thing to do, and Baraka's wait on her for the discount is already its own wait. So it is
 * never written, and one already on record is not read as a wait.
 */
const ONESELF = /^(?:themselves|themself|himself|herself|myself|yourself|yourselves|ourselves|itself|oneself|self|me|myself alone)$/i;
export function aWaitOnOneself(d: { fromParticipantId?: string | null; onParticipantId?: string | null; onLabel?: string | null }): boolean {
  if (d.onParticipantId && d.fromParticipantId && d.onParticipantId === d.fromParticipantId) return true;
  return ONESELF.test((d.onLabel ?? '').trim().replace(/[.!?]+$/, ''));
}
