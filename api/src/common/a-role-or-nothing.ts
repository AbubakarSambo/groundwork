/**
 * A ROLE IS A ROLE, OR NOTHING (staging test, 15 October 2026).
 *
 * The setup's report hands back `yourRole` as "the part they play, in their own words", and the lead's role was saved
 * from it. Hafsah, setting up two check-ins, answered "I own my own 10 deals and the weekly review." and "I sign it
 * off.", and those answers became her role: the board said "This is session 1 of 56 of your work as i own my own 10",
 * People and setup said "Your role: I own my own 10 deals and the weekly review.", and her note read "I sign it off.".
 *
 * A role is what somebody's job is called: "Head of sales", "the managing partner", "her manager", "a sales rep in
 * Kilimani". A sentence about what they do ("I sign it off", "owns the weekly review") is not one, and nothing is better
 * than a piece of a sentence. So a role is kept only when it reads as the name of a job: a few words, not about "I" or
 * "we", not a sentence, and not starting with what somebody does.
 */
const AT_MOST_WORDS = 8;
const ABOUT_THE_SPEAKER = /\b(?:i|i'm|im|i've|i'll|i'd|me|my|mine|myself|we|we're|we've|us|our|ours)\b/i;
const NOT_A_NAME_FOR_A_JOB = /^(?:you|your|he|she|they|them|it|this|that|these|those|there|here|yes|no|not|and|but|so|because|if|when|just|also|only|mostly|basically|well)\b/i;
/* What somebody does, said as a verb: "owns the review", "sign it off", "runs the floor". "lead" and "manager" are jobs, so they are not here. */
const STARTS_WITH_WHAT_THEY_DO = /^(?:own|owns|sign|signs|run|runs|manage|manages|handle|handles|do|does|work|works|review|reviews|make|makes|approve|approves|oversee|oversees|check|checks|sell|sells|decide|decides|am|is|are|was|were|be|been|have|has|had|will|would|can|could)\b/i;

export function aRoleOrNothing(said: string | null | undefined): string | null {
  const text = String(said ?? '').replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '').trim();
  if (!text) return null;
  if (/[.!?;:]/.test(text)) return null;
  if (text.split(' ').length > AT_MOST_WORDS) return null;
  if (ABOUT_THE_SPEAKER.test(text)) return null;
  if (NOT_A_NAME_FOR_A_JOB.test(text)) return null;
  if (STARTS_WITH_WHAT_THEY_DO.test(text)) return null;
  return text;
}

/** The role saved on the lead's own row when a check-in is set up: the setup report's, else what she typed, and only a role. */
export function theSettersRole(dto: { report?: unknown; roleAsDescribed?: string | null }): string | null {
  const fromTheReport = (dto.report as { yourRole?: string | null } | null | undefined)?.yourRole;
  return (aRoleOrNothing(fromTheReport) ?? aRoleOrNothing(dto.roleAsDescribed))?.slice(0, 300) ?? null;
}
