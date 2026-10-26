import { aDaySaidInFull } from '../board/a-day-said-in-full';
/**
 * A CORRECTION SAID IN ASK IS CHECKED AGAINST THE RECORD, NOT SHRUGGED AT (polish round 1, 26 October 2026; the first principle).
 *
 * Wanjiru read on her morning summary 'You said "Njeri will know today when I set up the check-in"', wrote in Ask "I did not say that.
 * I do not normally mention Njeri in the check-in.", and read "I cannot answer that one yet." A correction is a claim: Groundwork checks
 * the record, without accusing anybody. Where her own words are on record, it shows her where and when she said them and asks what is
 * true now. Where nothing she said matches, it says so plainly and takes the line off: what she typed into a check-in is the record.
 */
const A_CORRECTION = /\b(?:i\s+(?:did\s+not|didn['’]t|never|have\s+not|haven['’]t)\s+(?:say|said|write|wrote|tell|told)\b|that(?:['’]s|\s+is)\s+(?:not\s+(?:right|true|correct|what\s+i\s+said)|wrong|incorrect|untrue)|not\s+what\s+i\s+said|this\s+is\s+wrong)/i;

export function isACorrection(message: string): boolean {
  return A_CORRECTION.test(String(message ?? ''));
}

const STOP = new Set(['that', 'this', 'with', 'from', 'have', 'said', 'what', 'when', 'will', 'would', 'they', 'there', 'their', 'normally', 'never', 'didn', 'mention', 'which', 'about', 'check', 'checkin', 'right', 'true', 'wrong']);
const words = (t: string) => String(t ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').split(/[\s-]+/).filter((w) => w.length >= 4 && !STOP.has(w));
const sentences = (t: string) => String(t ?? '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

export interface ATurnOfTheirs { text: string; at: Date; label: string | null; checkInId?: string; participantId?: string }

/** The sentence of theirs the correction is about: a quotation in it, else the one sharing the most words with it (two at least). */
export function whatTheyMean(message: string, theirTurns: ATurnOfTheirs[], leastShared = 1): { sentence: string; at: Date; label: string | null; checkInId?: string; participantId?: string } | null {
  const quoted = /["“]([^"”]{6,})["”]/.exec(message)?.[1]?.trim() ?? null;
  const said = theirTurns.flatMap((t) => sentences(t.text).map((s) => ({ sentence: s, at: t.at, label: t.label, checkInId: t.checkInId, participantId: t.participantId })));
  if (quoted) {
    const q = quoted.toLowerCase().replace(/[.!?]+$/, '');
    return said.find((s) => s.sentence.toLowerCase().includes(q)) ?? null;
  }
  const mine = new Set(words(message));
  if (!mine.size) return null;
  let best: { sentence: string; at: Date; label: string | null; checkInId?: string; participantId?: string; n: number } | null = null;
  for (const s of said) {
    const n = new Set(words(s.sentence).filter((w) => mine.has(w))).size;
    if (n >= leastShared && (!best || n > best.n || (n === best.n && s.at > best.at))) best = { ...s, n };
  }
  return best ? { sentence: best.sentence, at: best.at, label: best.label, checkInId: best.checkInId, participantId: best.participantId } : null;
}

const onTheDay = (d: Date) => aDaySaidInFull(new Date(d));

/** What Ask says back. `quotedButNotFound`: they quoted words nothing of theirs holds, so the line is taken off. */
export function theCorrectionAnswered(found: { sentence: string; at: Date; label: string | null } | null, quotedButNotFound: boolean): string {
  if (found) {
    return `I checked. On ${onTheDay(found.at)}${found.label ? `, in “${found.label}”,` : ','} you wrote: “${found.sentence.replace(/[“”"]/g, '')}” If that is no longer true, tell me what is true now and I will put it on record.`;
  }
  if (quotedButNotFound) return 'I checked, and nothing you wrote says that. It is taken off, and Groundwork will not say it again.';
  return 'Which line is wrong? Copy it here, or say it in your own words, and I will check it against what you wrote.';
}

/**
 * A CHANGE SAID IN ASK IS SHOWN BESIDE WHAT IT CHANGES, AND NEVER WRITTEN TO THE RECORD FROM ASK (polish rounds 1 and 3, 26 October 2026). Aisha wrote in Ask "I actually
 * don't need to reach out to Jamii Clinics for this", about a step she had given in her check-in, and read "I cannot answer that
 * one yet." A statement, not a question, about something they wrote, is their update: it is kept with their own words, beside the
 * line it changes, and they are told plainly where it went.
 */
export function aChangeOfTheirs(message: string): boolean {
  const m = String(message ?? '').trim();
  return !!m && !/\?\s*$/.test(m) && m.split(/\s+/).length >= 4;
}

/** A sale, a payment or a signing said done: it is their word until something shows it (Joseph's "Mama Pima is a done deal"). */
const SAID_DONE = /\b(?:done\s+deal|sold|paid|signed|closed|came\s+through|delivered)\b/i;

export function theChangePutOnRecord(found: { sentence: string; at: Date; label: string | null }, message: string): string {
  const said = `I checked. On ${onTheDay(found.at)}${found.label ? `, in “${found.label}”,` : ','} you wrote: “${found.sentence.replace(/[“”"]/g, '')}”`;
  const proof = SAID_DONE.test(message) ? ' It counts as done once something shows it, such as the payment message or the signed order.' : '';
  return `${said} What you have just told me is not on your record yet.${proof} To put it there, press Add something on your check-in, or say it in your next check-in.`;
}

/**
 * A STATEMENT ABOUT A REQUEST THAT IS STILL WAITING FOR THEM IS ANSWERED WITH WHERE IT STANDS (polish round 1). Grace read that
 * Mercy's leave was waiting for her, wrote in Ask "Mercy's leave is already approved.", and was shrugged at. It was not approved
 * yet: the record says so, plainly, and tells her how to decide it.
 */
export function aWaitingRequestNamed<T extends { firstName: string; kind: string; thing: string }>(message: string, waiting: T[]): T | null {
  const said = String(message ?? '').toLowerCase();
  if (!/\b(?:approved|declined|decided|sorted|done|paid|already)\b/.test(said)) return null;
  const kinds: Record<string, RegExp> = { leave: /\b(?:leave|time off|days? off)\b/, hours: /\b(?:hours?|time ?sheets?)\b/, spend: /\b(?:spend|spending|money|request|expense|fee)\b/ };
  const named = waiting.filter((r) => r.firstName && new RegExp(`\\b${r.firstName.toLowerCase()}\\b`).test(said) && (kinds[r.kind]?.test(said) ?? false));
  return named.length === 1 ? named[0] : null;
}

export function stillWaitingSaid(r: { thing: string }): string {
  return `I checked, and ${r.thing} is still waiting for you. Nothing has been decided on it yet. Reply "approve" or "decline" to decide it now.`;
}
