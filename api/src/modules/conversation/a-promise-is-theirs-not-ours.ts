/**
 * A PROMISE OF THEIRS IS IN THEIR OWN WORDS, NEVER IN GROUNDWORK'S (fix plan, pattern 5; quarter test, Aisha's goals, 11 December 2026).
 * One of Aisha's goals read "I can help you by reminding you of previous updates, discussing further steps on the Jamii Clinics matter,
 * or any other aspect of your daily check-in that you'd like to address": Groundwork's own sentence, read off a transcript that holds both
 * sides. A promise, a to-do, a target or a goal is kept only where the person's own words carry it more than Groundwork's do.
 */
const wordsOf = (t: string) => new Set(String(t ?? '').toLowerCase().replace(/[‘’]/g, "'").split(/[^a-z0-9']+/).filter((w) => w.length >= 4));

export function itIsTheirs(promise: string, transcript: string): boolean {
  const p = String(promise ?? '').trim();
  if (!p) return false;
  /* Groundwork's own offers to help are never somebody's goal. */
  if (/^(?:i can help|i am here to|i'm here to|let me help|i will remind you|groundwork)\b/i.test(p)) return false;
  const lines = String(transcript ?? '').split('\n');
  const ours = lines.filter((l) => l.startsWith('GROUNDWORK:')).join(' ');
  const theirs = lines.filter((l) => !l.startsWith('GROUNDWORK:')).join(' ');
  const mine = [...wordsOf(p)];
  if (!mine.length) return true;
  const inTheirs = wordsOf(theirs);
  const inOurs = wordsOf(ours);
  const fromThem = mine.filter((w) => inTheirs.has(w)).length / mine.length;
  const fromUs = mine.filter((w) => inOurs.has(w) && !inTheirs.has(w)).length / mine.length;
  /* Words neither side said (a document they attached) are theirs: only words that are Groundwork's more than theirs are not. */
  return fromThem >= 0.5 || fromThem >= fromUs;
}

/** Words that make a number an aim rather than a report: what they want, plan or will do, or by when. A figure with none of them ("November collections KES 720,000") is what happened. */
export const AN_AIM_IN_WORDS = /\b(?:target|aim|aiming|goal|want|plan|planning|hope|need to|have to|will|going to|by|reach|hit|get|sell|close|collect|raise|bring in|grow|increase|make|win|send|finish|deliver|complete|sign|open|book|visit|do)\b/i;

/** A figure said of a period that has happened or is happening ("November collections", "so far", "to date"): a report, unless aim words make it an aim. */
export const A_PERIOD_REPORTED = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|so far|to date|last (?:week|month|quarter))\b/i;
