import { whatThisIsAbout } from '../reports/where-you-are-against-what-you-named';

/**
 * HANDING THE SESSION THE LINE, RATHER THAN HOPING IT FINDS IT.
 *
 * The session has the shared documents, knows who provided each one, and is told to name the source
 * when what somebody says does not match. Driven live, it half-works: told "the handover was
 * finished in August" against a plan saying 19 September, it replied "Which is right? The plan could
 * easily be out of date." It noticed. It would not say what it had noticed.
 *
 * WHY, AND IT IS NOT THE MODEL BEING LAZY. Two absolute rules in the engine's own prompt: "Never
 * state or assume a timeframe, date, deadline, or period the person has not given you", and "Never
 * invent a date they did not say". Both are right and both exist for good reasons. The discrepancy
 * worth surfacing is almost always a DATE, so those rules and the citation are in direct conflict,
 * and an absolute beats a paragraph five thousand words away. I wrote the exception into the
 * timeframe rule itself and it still lost - proven by driving it again, not by reading it.
 *
 * So this stops being an instruction. The overlap is computed here, the exact line is pulled out of
 * the document, and the session is handed one directive for one turn naming the sentence to put to
 * them. Same shape as `asked-twice-is-a-loop.ts`: where a prompt instruction has been shown not to
 * hold, the answer is code, not louder prose.
 *
 * WHAT IT WILL NOT DO. It only ever looks at documents already marked shared with everyone - a
 * private document is never quoted at anybody, and this never sees one. It never says who is right:
 * the directive puts the difference as a question, because a document can be out of date and the
 * person is usually the one who knows. And it fires on one line at a time; a turn that recites four
 * discrepancies is an interrogation, not a check-in.
 */

export interface SharedDocumentLine {
  /** The document's own name, so the directive can say which one. */
  fileName: string;
  /** Who provided it, already resolved for this reader. */
  who: string | null;
  /** Whether the person who provided it runs the check-in. */
  fromTheLead: boolean;
  /** Its text. Only ever a document shared with everyone - see above. */
  content: string;
}

/**
 * The date words themselves, which must not count towards the subject overlap.
 *
 * Without this the plan's own header - "Handover plan, agreed 5 September." - matched somebody
 * saying "the handover finishes 19 September": two shared words, "handover" and "september", and
 * two different dates. So the document was flagged as contradicting itself. Caught by a spec, and
 * the fix is that a shared MONTH is not a shared subject: two things being about September is what
 * makes them comparable, not what makes them disagree.
 */
const DATE_WORDS = new Set([
  'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september',
  'october', 'november', 'december', 'week', 'month', 'quarter', 'date', 'deadline',
]);

/** Two shared subject words, as everywhere else this matching is done, and none of them a date. */
function touches(a: string, b: string): boolean {
  const about = new Set([...whatThisIsAbout(a)].filter((w) => !DATE_WORDS.has(w)));
  if (about.size === 0) return false;
  let shared = 0;
  for (const w of whatThisIsAbout(b)) {
    if (!DATE_WORDS.has(w) && about.has(w) && ++shared >= 2) return true;
  }
  return false;
}

/** A date, in the forms people write them. What the two absolute rules are actually about. */
const LOOKS_LIKE_A_DATE =
  /\b(?:\d{1,2}\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\bq[1-4]\b|\bweek \d+\b/i;

/**
 * The dates in a piece of text, lowercased.
 *
 * NON-CAPTURING GROUPS ABOVE FOR A REASON, and it is not tidiness: with capturing groups,
 * `String.match` without /g returns [whole, group1, group2] and an unmatched optional group is
 * `undefined`, so mapping `toLowerCase` over the result threw on the first real sentence it saw.
 * Found by driving a live check-in, which 500'd. Matched globally here, so this is a list of
 * matches and never a list of groups.
 */
function datesIn(text: string): string[] {
  return (text.match(new RegExp(LOOKS_LIKE_A_DATE.source, 'gi')) ?? []).map((d) => d.toLowerCase());
}

/**
 * The one line in a shared document that speaks to what they just said, where the two disagree
 * enough to be worth putting to them.
 *
 * "Disagree enough" is deliberately shallow: both mention the same subject AND both carry a date,
 * and the dates are not the same string. Anything cleverer would be this module deciding who is
 * right, which is the one thing it must not do - it surfaces, the person settles it.
 */
export function theLineWorthPuttingToThem(
  said: string,
  docs: SharedDocumentLine[],
): { fileName: string; who: string | null; fromTheLead: boolean; line: string } | null {
  const theirs = said.trim();
  if (!theirs || !LOOKS_LIKE_A_DATE.test(theirs)) return null;
  const theirDates = datesIn(theirs);

  for (const doc of docs) {
    for (const raw of doc.content.split(/\n+|(?<=\.)\s+/)) {
      const line = raw.trim();
      if (line.length < 12 || line.length > 300) continue;
      if (!LOOKS_LIKE_A_DATE.test(line)) continue;
      if (!touches(theirs, line)) continue;
      /* The same date said twice is agreement, and agreement is not worth a turn. */
      const lineDates = datesIn(line);
      if (lineDates.some((d) => theirDates.some((t) => t.includes(d) || d.includes(t)))) continue;
      return { fileName: doc.fileName, who: doc.who, fromTheLead: doc.fromTheLead, line };
    }
  }
  return null;
}

/**
 * The directive, for this turn only. It carries the sentence, so the session has nothing to
 * remember, work out, or weigh against a rule about inventing dates - the words are in front of it.
 */
export function aDirectiveAboutWhatTheDocumentSays(
  said: string,
  docs: SharedDocumentLine[],
): string {
  const hit = theLineWorthPuttingToThem(said, docs);
  if (!hit) return '';
  const source = hit.fromTheLead
    ? hit.who ? `${hit.who}, who runs this check-in` : 'the person who runs this check-in'
    : hit.who || 'somebody else in this check-in';
  return `THIS TURN, PUT THIS DIFFERENCE TO THEM.

"${hit.fileName}", shared with everyone here by ${source}, says:
  "${hit.line}"

What they have just told you does not match it. Quote that line back to them, say which document it
is from and who shared it, and ask which is right. Do this in the turn you are writing now.

THE RULE ABOUT NEVER STATING A DATE THEY DID NOT GIVE YOU DOES NOT APPLY TO THIS LINE. You are not
inventing a period or anchoring anything to one - you are reading them a sentence out of a document
they can open themselves, which is the only way they can answer you. Saying "which is right?"
WITHOUT naming what the document says is the failure this exists to stop: it asks somebody to guess
what you are looking at.

Do not decide who is right. A document can be out of date and they are usually the one who knows.
Whatever they say is the record.`;
}
