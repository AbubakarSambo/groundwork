/**
 * THE LEAD'S SETUP BRIEF IS NEVER QUOTED INTO A PARTICIPANT'S CHECK-IN (decision 75, item 13).
 *
 * Hafsah, 2 October 2026: "The lead's setup brief is never quoted into a participant's check-in. It may guide
 * the conversation as context, like the organisation's rules." The review found the brief quoted into three
 * scenarios' participant turns: the lead's sentences to the product, said to the person as if they were facts
 * the person had agreed, or as the lead's view of them.
 *
 * The model is still given the brief, so it knows the situation and what to ask about. It is told it may not
 * quote it or say who wrote it (the instruction in the prompt). And, because an instruction is not a wall,
 * every turn said to a participant is checked here, the same way our-instructions-never-reach-them.ts checks
 * for our own instructions: a sentence that shares a run of six or more words with the brief is cut. Runs the
 * person said themselves, and runs of what this check-in tells the participant it is for (the lead confirmed
 * that text, and the participant already reads it), are never a quote of the brief.
 *
 * Never left empty: where nothing is left, the plain question this check-in has not asked yet.
 *
 * The lead's own check-in is not checked: the brief is theirs.
 */
import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked, WHAT_ELSE } from './nobody-is-left-looking-at-a-paragraph';
import { A_COPIED_RUN } from './our-instructions-never-reach-them';

const wordsOf = (s: string): string[] => (s ?? '').toLowerCase().replace(/[’‘]/g, "'").match(/[a-z0-9']+/g) ?? [];

function runsOf(words: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(' '));
  return out;
}

/** What the prompt tells the model about the brief, said once, wherever the brief is given. */
export const THE_BRIEF_IS_CONTEXT_ONLY =
  'The lead\'s brief is context for you only, like the organisation\'s rules. Never quote it, never repeat its sentences, and never say that the lead wrote or said something in it. Ask about the situation in your own words.';

/*
 * AND THE BRIEF SAID TO BE THE BRIEF, OR THE LEAD'S WISH, EVEN IN OTHER WORDS. The review of 1 October read "The
 * brief for this check-in, from Julia, highlights that ..." and "Caroline also wants to know whether expectations
 * were actually set." in participants' turns. Saying where it came from is attributing it, whatever the wording.
 */
const NAMES_THE_BRIEF = /\b(?:the|this|your|their|her|his)\s+(?:check-in'?s?\s+|lead'?s\s+|manager'?s\s+|setup\s+)?brief\b|\bwhen (?:she|he|they) set (?:this|it) up\b|\bin (?:the|her|his|their) setup\b/i;
const THE_LEADS_WISH = (lead: string) =>
  new RegExp(`\\b${lead.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(?:\\s+\\w+)?\\s+(?:wants|would like|wanted|is hoping|hopes|expects|is keen|has asked|asked me|needs) to (?:know|understand|see|hear|find out|check|make sure|learn)\\b`, 'i');

/**
 * A test for one sentence: does it copy six or more words in a row from the brief, other than words the person
 * said or the check-in already tells them, or say it is the brief or the lead's wish? Built once per turn, so the
 * stream can ask it of each sentence.
 */
export function aSentenceThatQuotesTheBrief(brief: string | null | undefined, sayable: string[] = [], leadFirstName?: string | null): (sentence: string) => boolean {
  const runs = new Set(runsOf(wordsOf(brief ?? ''), A_COPIED_RUN));
  if (!runs.size) return () => false;
  const theirs = new Set(sayable.flatMap((s) => runsOf(wordsOf(s), A_COPIED_RUN)));
  const wish = leadFirstName?.trim() ? THE_LEADS_WISH(leadFirstName.trim()) : null;
  /* Somebody whose own work has a brief in it (a client's brief, a design brief) may be asked about it. */
  const theySayBrief = sayable.some((t) => /\bbrief\b/i.test(t ?? ''));
  return (sentence: string) =>
    (!theySayBrief && NAMES_THE_BRIEF.test(sentence))
    || (!!wish && wish.test(sentence))
    || runsOf(wordsOf(sentence), A_COPIED_RUN).some((r) => runs.has(r) && !theirs.has(r));
}

export type BriefCut = { text: string; cut: string[] };

/** The reply without any sentence that quotes the brief. */
export function withoutTheLeadsBrief(
  reply: string,
  brief: string | null | undefined,
  sayable: string[] = [],
  alreadyAsked: string[] = [],
  leadFirstName?: string | null,
): BriefCut {
  if (!reply || !(brief ?? '').trim()) return { text: reply, cut: [] };
  const quotes = aSentenceThatQuotesTheBrief(brief, sayable, leadFirstName);
  const sentences = intoSentences(reply);
  const cut: string[] = [];
  const kept: string[] = [];
  for (const s of sentences) (quotes(s) ? cut : kept).push(quotes(s) ? s.trim() : s);
  if (!cut.length) return { text: reply, cut: [] };
  const text = kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { text: text || (aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE), cut };
}

/**
 * EVERYTHING THE LEAD WROTE AS SETUP THAT A PARTICIPANT'S MODEL IS GIVEN (release, 5 October 2026). The brief, and the
 * lead's note to everyone in the check-in, which reaches every person's model as the situation (`sharedNote`) and was
 * held only by an instruction. Both are the lead's words to the product: neither is ever quoted to a person. One text,
 * a paragraph each, so the same six-word net covers both; what the check-in tells them it is for stays sayable.
 */
export function theLeadsSetupWords(ground: { brief?: string | null; leadContextNotes?: { text?: string | null; audience?: string | null; participantId?: string | null }[] | null } | null | undefined): string | null {
  const note = (ground?.leadContextNotes ?? []).filter((n) => n?.audience === 'EVERYONE' && !n?.participantId).map((n) => (n.text ?? '').trim()).filter(Boolean);
  const all = [(ground?.brief ?? '').trim(), ...note].filter(Boolean);
  return all.length ? all.join('\n\n') : null;
}
