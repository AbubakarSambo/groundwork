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
 *  - "Your own account of this is not in this check-in." told to the lead about their OWN item, where the line above it
 *    is about them ("You have said that hiring is hard, but not what the difficulties are.", "The record does not say
 *    why your definition of the project does not include the automation"). Their account is partly there, so "is not in
 *    this check-in" is not true; what is true is that nobody else can give it. Run of 5 October, the snapshot and the
 *    project. Only where the line above says "you" or "your", and never where the thing is who somebody else is.
 */
const ONLY_YOU_CAN_ANSWER = 'Only you can answer this.';
/*
 * AND WHERE THE QUESTION ITSELF IS ABOUT THE READER (run oct5c, the project board): "This check-in cannot tell you whether
 * you ever saw or responded to Rita Adeleke's requirements from July." The line above it is about Rita, but the question
 * is the reader's own, so only the reader can answer it. Read after the heading's own opening ("This check-in cannot tell
 * you"), and only "whether you", "why you", "how you", "when you", "if you" or "what you": the reader as the subject. An
 * admin reads the lead's name there, so this never fires for them.
 */
const A_QUESTION_ABOUT_THE_READER = /\b(?:whether|why|how|when|if|what) you\b/i;
const withoutTheHeadingsOpening = (about: string) => about.replace(/^\s*This check-in cannot tell you (?:about )?/i, '');
/*
 * AND WHERE THE LINE ABOVE SAYS SOMEBODY IS NOT IN THE CHECK-IN (run oct5c, the crisis board): "Sarah is not in this check-in,
 * and the record does not state Sarah's source of information." under "how Sarah knew". The account missing is Sarah's,
 * never the reader's, so it says so with her name again: "Sarah's own account is not in this check-in."
 */
const SOMEBODY_IS_NOT_IN_IT = /^\s*(\p{Lu}[\p{L}'-]+(?: \p{Lu}[\p{L}'-]+)?) (?:is|was) not in this check-in\b/u;
/* "you", or "your" before a thing of theirs, never "your" before a person or a group: "Your team has not said what the
   difficulties are." is about the team, so the old sentence stays there (review of 10a8d3ae). */
const THE_LINE_IS_ABOUT_THE_READER = /\b(?:you|yours|yourself)\b|\byour\b(?!\s+(?:own\s+)?(?:team|teams|staff|people|colleague|colleagues|manager|managers|lead|leads|report|reports|direct reports)\b)/i;

/**
 * A STEP IS SOMETHING TO DO, AND A PROMISE IS SAID AS WHAT WAS PROMISED (request 134 item 4, narrowed after review).
 *
 *  - "The status of the open commitments to 'call the client' and 'file the bundle'." stood under "What to do": a piece,
 *    not a step. Only that shape is touched - a step opening "The status of", "The state of" or "The progress of" with
 *    no verb of its own - and it is made a step: "Check the status of ...". No step is ever dropped: "A short call with
 *    Ngozi this week settles who owns the lease." and "A written answer to Amani on the discount, before Friday." stay.
 *  - "Ask Amani Wekesa about the open commitment to 'I will file the bundle'." quoted a promise as a fragment in the
 *    first person. Only a quote that opens "I will", "I'll", "I am going to", "we will" or a lower-case verb is said as
 *    what was promised ("the open commitment to file the bundle"). "the commitment to 'Amina will send the sheets'" is
 *    somebody's words about somebody else, and stays in its marks.
 */
const A_STATUS_PIECE = /^the (status|state|progress) of\b/i;
export function aStepThatIsAStep(move: unknown): unknown {
  if (typeof move !== 'string') return move;
  const t = move.trim();
  if (!A_STATUS_PIECE.test(t)) return move;
  if (HAS_A_VERB_OF_ITS_OWN.test(t.replace(/(['"\u2018\u201c])[^'"\u2019\u201d]*(['"\u2019\u201d])/g, ''))) return move;
  return `Check ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}
const A_QUOTED_PROMISE = /(['\u2018"\u201c])([^'"\u2018\u2019\u201c\u201d]{2,140})(['\u2019"\u201d])/g;
const AFTER_A_COMMITMENT = /\bcommitments? to\s+((?:['\u2018"\u201c][^'"\u2018\u2019\u201c\u201d]{2,140}['\u2019"\u201d](?:,\s*|\s+and\s+|,\s+and\s+)?)+)/gi;
const SAID_AS_A_PROMISE = /^(?:I will|I['\u2019]ll|I am going to|I['\u2019]m going to|we will)\b|^[a-z]/;
export function aPromiseSaidAsWhatWasPromised(text: string): string {
  if (typeof text !== 'string') return text;
  return text.replace(AFTER_A_COMMITMENT, (whole: string, list: string) => {
    let ok = true;
    const said = list.replace(A_QUOTED_PROMISE, (_m: string, _o: string, words: string) => {
      const clause = SAID_AS_A_PROMISE.test(words.trim()) ? inOurVoice(words, 'them') : null;
      if (!clause) ok = false;
      return clause ?? words;
    });
    return ok ? whole.replace(list, said) : whole;
  });
}

/** Both, over the judgement as it is served. Nothing is ever left out. */
export function aJudgementWithNoPieces<T>(judgement: T): T {
  const j: any = judgement;
  if (!j || typeof j !== 'object') return judgement;
  const fix = (v: any): any => (typeof v === 'string' ? aPromiseSaidAsWhatWasPromised(v)
    : Array.isArray(v) ? v.map(fix)
      : v && typeof v === 'object' && Object.prototype.toString.call(v) === '[object Object]' && (!v.constructor || v.constructor.name === 'Object')
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fix(x)])) : v);
  const out = fix(j);
  if (Array.isArray(out.whatToDo)) out.whatToDo = out.whatToDo.map((m: any) => (m && typeof m === 'object' && typeof m.move === 'string' ? { ...m, move: aStepThatIsAStep(m.move) } : m));
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
      const outside = theLeadsOwn ? String(x.why ?? '').match(SOMEBODY_IS_NOT_IN_IT) : null;
      const toKnow = m
        ? `That ${m[1].toLowerCase().split(' ')[0]}'s own account is not in this check-in.`
        : outside ? `${outside[1]}'s own account is not in this check-in.`
        : theLeadsOwn && opts.theReaderIsTheOnlyPerson ? NOBODY_ELSE_ANSWERS
          : theLeadsOwn && (THE_LINE_IS_ABOUT_THE_READER.test(String(x.why ?? '')) || A_QUESTION_ABOUT_THE_READER.test(withoutTheHeadingsOpening(String(x.about ?? '')))) ? ONLY_YOU_CAN_ANSWER
            : x.toKnow;
      const about = typeof x.about === 'string' ? aHeadingThatIsASentence(x.about) : x.about;
      return { ...x, about, toKnow };
    }),
  } as T;
}
