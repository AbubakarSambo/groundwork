import { inOurVoice } from './what-the-record-shows-over-time';
/**
 * THE JUDGEMENT READS RIGHT WHEN THE LEAD IS SERVED IT (requests 133 item 2, 134, 135, 136).
 *
 * The judgement is written once and stored. Two faults in the way a line reads are put right where it is served,
 * and nothing else about it is touched:
 *
 *  - "Your own account of this is not in this check-in." under "Who the other trader with the broken freezer is."
 *    The account that is missing is that trader's, not the lead's. Where the thing not known is who somebody else is,
 *    the line says whose account it is: "That trader's own account is not in this check-in."
 */
const WHO_SOMEBODY_ELSE_IS = /^Who (?:the|another|that|a|an) (?:other |another |different )?([a-z][a-z-]*(?: [a-z][a-z-]*)?)\b.*\bis\.?$/i;
const THE_LEADS_OWN = 'Your own account of this is not in this check-in.';

/**
 *  - A piece of a sentence as the heading of a line ("the work in Kisumu", "the printed workbooks", "what is blocking the work",
 *    request 131 item 5). A heading is a sentence: "This check-in cannot tell you about the work in Kisumu." A line that is already a
 *    sentence (it has a verb of its own), or a question put as a clause ("Who the other trader is."), is left as it is, and so is a
 *    heading that already opens "This check-in".
 */
const HAS_A_VERB_OF_ITS_OWN = /\b(?:is|are|was|were|has|have|had|does|do|did|can|cannot|could|will|would|should|must|may|might|nobody|no one|nothing|not)\b/i;
const A_QUESTION_WORD = /^(?:what|who|whether|how|when|where|why|which)\b/i;
/* Only an ordinary opening word is lowercased; a name keeps its capital (release round, 5 October 2026: "about tobi Adewale's
   ability", "about marcus."). */
const AN_ORDINARY_OPENING = /^(?:the|a|an|this|that|these|those|his|her|their|our|your|its|my|what|who|whether|how|when|where|why|which|any|each|every|some|no|one|two|three|how)\b/i;
const inASentence = (t: string): string => (AN_ORDINARY_OPENING.test(t) ? `${t.charAt(0).toLowerCase()}${t.slice(1)}` : t);
export function aHeadingThatIsASentence(about: string): string {
  const t = about.trim().replace(/[.!?]+$/, '');
  if (!t || /^this check-in\b/i.test(t) || t.split(/\s+/).length > 12) return about;
  if (A_QUESTION_WORD.test(t)) return `This check-in cannot tell you ${inASentence(t)}.`;
  if (HAS_A_VERB_OF_ITS_OWN.test(t)) return about;
  return `This check-in cannot tell you about ${inASentence(t)}.`;
}

/**
 *  - "Your own account of this is not in this check-in." told to the only person in it (request 136 item 7). The
 *    founder's own check-in has one person, and it was saying that about her own open commitments, which are the only
 *    thing in there. What is actually missing is anybody else, so that is what it says. PROVISIONAL wording: nothing in
 *    the prototype covers a check-in of one, so this is mine until Hafsah says otherwise.
 */
const NOBODY_ELSE_ANSWERS = 'Nobody else answers this check-in, so there is no other account to set this against.';

/**
 * A STEP IS SOMETHING TO DO, AND A PROMISE IS SAID AS WHAT WAS PROMISED (request 134 item 4).
 *
 *  - "The status of the open commitments to 'call the client' and 'file the bundle'." stood under "What to do". It is a
 *    piece, not a step: it opens on "the" or "a" and has no verb of its own. Such a step is left out; what it was about
 *    is still in the record and in the rest of the judgement.
 *  - "Ask Amani Wekesa about the open commitment to 'I will file the bundle'." quoted a promise as a fragment in the
 *    first person. The promise is said as what was promised, in our voice, the same way the work plan says it
 *    ("the open commitment to file the bundle"). A promise that cannot be said that way is left in its marks.
 */
const A_PIECE_NOT_A_STEP = /^(?:the|a|an|this|these|those)\s/i;
export function aStepThatIsAStep(move: unknown): boolean {
  if (typeof move !== 'string' || !move.trim()) return false;
  const t = move.trim();
  return !(A_PIECE_NOT_A_STEP.test(t) && !HAS_A_VERB_OF_ITS_OWN.test(t.replace(/(['"\u2018\u201c])[^'"\u2019\u201d]*(['"\u2019\u201d])/g, '')));
}
const A_QUOTED_PROMISE = /(['\u2018"\u201c])([^'"\u2018\u2019\u201c\u201d]{2,140})(['\u2019"\u201d])/g;
const AFTER_A_COMMITMENT = /\bcommitments? to\s+((?:['\u2018"\u201c][^'"\u2018\u2019\u201c\u201d]{2,140}['\u2019"\u201d](?:,\s*|\s+and\s+|,\s+and\s+)?)+)/gi;
export function aPromiseSaidAsWhatWasPromised(text: string): string {
  if (typeof text !== 'string') return text;
  return text.replace(AFTER_A_COMMITMENT, (whole: string, list: string) => {
    let ok = true;
    const said = list.replace(A_QUOTED_PROMISE, (_m: string, _o: string, words: string) => {
      const clause = inOurVoice(words, 'them');
      if (!clause) ok = false;
      return clause ?? words;
    });
    return ok ? whole.replace(list, said) : whole;
  });
}

/** Both, over the judgement as it is served. */
export function aJudgementWithNoPieces<T>(judgement: T): T {
  const j: any = judgement;
  if (!j || typeof j !== 'object') return judgement;
  const fix = (v: any): any => (typeof v === 'string' ? aPromiseSaidAsWhatWasPromised(v)
    : Array.isArray(v) ? v.map(fix)
      : v && typeof v === 'object' && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fix(x)])) : v);
  const out = fix(j);
  if (Array.isArray(out.whatToDo)) out.whatToDo = out.whatToDo.filter((m: any) => !m || typeof m !== 'object' || aStepThatIsAStep(m.move));
  /* Nothing to put right: the same object, so a caller that passes it through is not handed a copy. */
  return (JSON.stringify(out) === JSON.stringify(j) ? judgement : out) as T;
}

export function aJudgementThatReadsRight<T>(judgement: T, opts: { theReaderIsTheOnlyPerson?: boolean } = {}): T {
  const j: any = aJudgementWithNoPieces(judgement);
  if (!j || typeof j !== 'object' || !Array.isArray(j.whatThisCannotTellYou)) return j as T;
  return {
    ...j,
    whatThisCannotTellYou: j.whatThisCannotTellYou.map((x: any) => {
      if (!x || typeof x !== 'object') return x;
      const theLeadsOwn = typeof x.toKnow === 'string' && x.toKnow.trim() === THE_LEADS_OWN;
      const m = theLeadsOwn ? String(x.about ?? '').trim().match(WHO_SOMEBODY_ELSE_IS) : null;
      const toKnow = m
        ? `That ${m[1].toLowerCase().split(' ')[0]}'s own account is not in this check-in.`
        : theLeadsOwn && opts.theReaderIsTheOnlyPerson ? NOBODY_ELSE_ANSWERS : x.toKnow;
      const about = typeof x.about === 'string' ? aHeadingThatIsASentence(x.about) : x.about;
      return { ...x, about, toKnow };
    }),
  } as T;
}
