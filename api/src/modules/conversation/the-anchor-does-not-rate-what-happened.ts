/**
 * THE ANCHOR'S WEEKLY WORDS SAY WHAT HAPPENED AND WHAT IT AFFECTED, AND NEVER HOW GOOD IT WAS (anchor walk, 8 October).
 *
 * The weekly words say it outright: never say that what they did or what happened was good, great, smart, useful, practical, progress or a good
 * sign. On WhatsApp the model wrote "You finished the route plan, which is progress." The words are an instruction and the model sometimes
 * does not follow it, so the one shape that kept coming back is also taken off the reply in code: a clause or a sentence that calls what the
 * person did progress, a good sign or good news. The question is never touched. Narrow, read-side, and only for somebody on the lead's team.
 */
const A_CLAUSE = /,?\s+which\s+(?:is|was|sounds like|looks like|shows|means)\s+(?:some |real |good |great |solid |clear |a lot of )?(?:progress|a good sign|good news|a step forward)(?=\s*[.!?,])/gi;
const A_SENTENCE = /(?:^|(?<=[.!?]\s))(?:That(?:'|’)s|That is|This is|It(?:'|’)s|It is)\s+(?:really |very |some |real )?(?:good |great |solid |clear )?(?:progress|a good sign|good news|a step forward)\s*[.!]\s*/g;
const GLAD = /(?:^|(?<=[.!?]\s))I(?:'|’)m\s+(?:really\s+)?(?:glad|pleased|happy)\s+(?:to hear|that)\b[^.!?]*[.!?]\s*/gi;

export function withoutARatingOfWhatHappened(reply: string): { text: string; cut: string[] } {
  const cut: string[] = [];
  const note = (re: RegExp) => (m: string) => { cut.push(m.trim()); return ''; };
  let text = String(reply ?? '');
  text = text.replace(A_SENTENCE, note(A_SENTENCE)).replace(GLAD, note(GLAD)).replace(A_CLAUSE, note(A_CLAUSE));
  text = text.replace(/[ \t]{2,}/g, ' ').replace(/\s+([.!?])/g, '$1').trim();
  /* Never leave nothing: a reply that was only the rating is kept as it was. */
  return cut.length && text ? { text, cut } : { text: String(reply ?? ''), cut: [] };
}
