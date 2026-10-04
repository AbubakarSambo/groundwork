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
export function aHeadingThatIsASentence(about: string): string {
  const t = about.trim().replace(/[.!?]+$/, '');
  if (!t || /^this check-in\b/i.test(t) || t.split(/\s+/).length > 12) return about;
  if (A_QUESTION_WORD.test(t)) return `This check-in cannot tell you ${t.charAt(0).toLowerCase()}${t.slice(1)}.`;
  if (HAS_A_VERB_OF_ITS_OWN.test(t)) return about;
  return `This check-in cannot tell you about ${t.charAt(0).toLowerCase()}${t.slice(1)}.`;
}

export function aJudgementThatReadsRight<T>(judgement: T): T {
  const j: any = judgement;
  if (!j || typeof j !== 'object' || !Array.isArray(j.whatThisCannotTellYou)) return judgement;
  return {
    ...j,
    whatThisCannotTellYou: j.whatThisCannotTellYou.map((x: any) => {
      if (!x || typeof x !== 'object') return x;
      const m = typeof x.toKnow === 'string' && x.toKnow.trim() === THE_LEADS_OWN ? String(x.about ?? '').trim().match(WHO_SOMEBODY_ELSE_IS) : null;
      const toKnow = m ? `That ${m[1].toLowerCase().split(' ')[0]}'s own account is not in this check-in.` : x.toKnow;
      const about = typeof x.about === 'string' ? aHeadingThatIsASentence(x.about) : x.about;
      return { ...x, about, toKnow };
    }),
  } as T;
}
