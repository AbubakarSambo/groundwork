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

export function aJudgementThatReadsRight<T>(judgement: T): T {
  const j: any = judgement;
  if (!j || typeof j !== 'object' || !Array.isArray(j.whatThisCannotTellYou)) return judgement;
  return {
    ...j,
    whatThisCannotTellYou: j.whatThisCannotTellYou.map((x: any) => {
      if (!x || typeof x.toKnow !== 'string' || x.toKnow.trim() !== THE_LEADS_OWN) return x;
      const m = String(x.about ?? '').trim().match(WHO_SOMEBODY_ELSE_IS);
      return m ? { ...x, toKnow: `That ${m[1].toLowerCase().split(' ')[0]}'s own account is not in this check-in.` } : x;
    }),
  } as T;
}
