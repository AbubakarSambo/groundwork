/**
 * OUR INSTRUCTIONS TO THE MODEL NEVER REACH THE PERSON (re-e, 1 October 2026).
 *
 * Tobi, in his third session, read the product's note to the model as if it were said to him:
 *
 *   "Understood. Your last three turns all ended by asking them something. This one should not. Say the
 *    single thing you noticed in what they just told you, and stop there. They will keep going, and what
 *    comes next is usually the part they were not going to volunteer."
 *
 * That is the rhythm block (four-questions-in-a-row), copied out. re-c has the same block once ("Your last
 * three turns all ended by asking you something."). Asking the model not to do it is what the prompt
 * already does, so this is the structural answer: every reply is saved through one step, and that step
 * cuts any sentence that copies our instructions.
 *
 * WHAT COUNTS AS COPYING. A sentence of the reply that shares a run of six or more words with an
 * instruction sentence in the prompt this turn was given. An instruction sentence is any sentence of the
 * assembled prompt, every block of it, that is not a question and not inside quotation marks: what the
 * prompt puts in quotation marks, and the questions it writes out, are given to the model to say.
 *
 * AND THE COPIED RUN IS ABOUT THE CONVERSATION RATHER THAN SAID TO THE PERSON. Measured on run-21, re-c, re-d
 * and re-e against the conversation's own source text: 40 statements the model wrote share six words with
 * an instruction sentence, and 36 of them are lines the prompt teaches it to say in its own voice ("This is
 * a one-off read.", "That is a real answer and it goes down as it is."); cutting those would cut the
 * openers. The 4 that are leaks (re-c once, Tobi's three in re-e) are the only ones whose copied run
 * speaks of the person in the third person or of the model's own turns ("asking them something", "what
 * they just told you", "your last three turns"), which no line said to a person does. So a sentence is cut
 * where the run it copied reads that way. A short piece of the same instruction left beside a cut sentence
 * ("This one should not.") goes with it.
 *
 * Never left empty: where nothing is left, the plain question this check-in has not asked yet.
 */
import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked, WHAT_ELSE } from './nobody-is-left-looking-at-a-paragraph';

export const A_COPIED_RUN = 6;

const wordsOf = (s: string): string[] => (s ?? '').toLowerCase().replace(/[’‘]/g, "'").match(/[a-z0-9']+/g) ?? [];

/* What the prompt gives the model to say: anything in quotation marks. */
const withoutQuotations = (s: string) => (s ?? '').replace(/"[^"\n]*"|“[^”]*”/g, ' | ');

/** The instruction sentences of a prompt: every sentence not in quotation marks and not a question. */
export function theInstructionSentences(prompt: string): string[] {
  const out: string[] = [];
  for (const part of withoutQuotations(prompt).split('|')) {
    for (const s of part.split(/(?<=[.!:;])\s+|\n+/)) {
      const t = s.trim();
      if (!t || /\?\s*$/.test(t)) continue;
      if (wordsOf(t).length >= 3) out.push(t);
    }
  }
  return out;
}

function runsOf(words: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(' '));
  return out;
}

/*
 * SAID ABOUT THE CONVERSATION, NOT TO THE PERSON: the person in the third person, or the model's own turns,
 * read inside the copied run itself. "they" and "them" in a sentence said to somebody are about other
 * people, which is why it is only read on a run copied from an instruction.
 */
const ABOUT_THE_CONVERSATION =
  /\b(?:they|them|their)\b|\byour (?:last|next|previous) (?:\w+ )?(?:turns?|repl(?:y|ies)|questions?|message)\b|\bthis turn\b|\bthe model\b/i;

export type InstructionCut = { text: string; cut: string[] };

/*
 * AND A NOTE ABOUT THIS REPLY, WHICH IS NEVER A LINE TO SAY. Wairimu, the lead, read in her first session
 * (final evaluation, profile 1, week 1): "Still thinking about Brian, no decision yet. Let it go and ask about
 * something else that matters here. Do not rephrase it and do not explain why you wanted it. If it genuinely
 * matters and nobody has answered it, it belongs in the report as still open, not in a fourth question."
 * That is ASKED_IT_TWICE_ALREADY, the note a reply is asked for again with, copied out. None of its copied
 * runs says "they" or "your last turns", so the voice test above let it by. A retry's note is written to the
 * model about the reply it is fixing; unlike the base prompt it teaches no line to say in the model's own
 * voice. So any sentence that copies a run from a note is cut, whatever voice the run is in.
 */
export function withoutOurInstructions(
  reply: string,
  prompt: string,
  sayable: string[] = [],
  alreadyAsked: string[] = [],
  notes: string[] = [],
): InstructionCut {
  if (!reply || (!prompt && !notes.length)) return { text: reply, cut: [] };
  const noteInstructions = notes.flatMap((n) => theInstructionSentences(n));
  const instructions = [...theInstructionSentences(prompt ?? ''), ...noteInstructions];
  const runs = new Set(instructions.flatMap((s) => runsOf(wordsOf(s), A_COPIED_RUN)));
  const noteRuns = new Set(noteInstructions.flatMap((s) => runsOf(wordsOf(s), A_COPIED_RUN)));
  if (!runs.size) return { text: reply, cut: [] };
  /* Their own words, and what the turn may say as fact, are never a copy of an instruction. */
  const theirs = new Set(sayable.flatMap((s) => runsOf(wordsOf(s), A_COPIED_RUN)));
  const wholeInstructions = instructions.map((s) => ` ${wordsOf(s).join(' ')} `);

  const sentences = intoSentences(reply);
  const copied = sentences.map((s) => {
    if (/\?\s*$/.test(s.trim())) return false;
    const r = runsOf(wordsOf(s), A_COPIED_RUN);
    return r.some((x) => runs.has(x) && !theirs.has(x) && (noteRuns.has(x) || ABOUT_THE_CONVERSATION.test(x)));
  });
  if (!copied.some(Boolean)) return { text: reply, cut: [] };
  /* A short piece of the same instruction beside a cut sentence ("This one should not.") goes with it. */
  const alsoCut = sentences.map((s, i) => {
    if (copied[i] || /\?\s*$/.test(s.trim())) return false;
    const w = wordsOf(s);
    if (w.length < 3 || w.length >= A_COPIED_RUN) return false;
    const beside = copied[i - 1] || copied[i + 1];
    return beside && wholeInstructions.some((ins) => ins.includes(` ${w.join(' ')} `));
  });
  const cut: string[] = [];
  const kept: string[] = [];
  sentences.forEach((s, i) => ((copied[i] || alsoCut[i]) ? cut.push(s.trim()) : kept.push(s)));
  const text = kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: text || (aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE), cut };
}

/*
 * AND NO TALK ABOUT THE CONVERSATION ITSELF, WHATEVER WORDS IT IS IN (messages test, 19 October, finding 6). Kevin read, on WhatsApp on
 * Wednesday 14 October, "You've asked about proof for Savannah Cafe for three turns now and you're getting a commitment to a future action,
 * not an existing one. Let's shift focus.": the loop guard's note (ASKED_IT_TWICE_ALREADY) told back in the model's own words, sharing no
 * six-word run with it, so the copy check above let it by. A minute later he read "You named a problem without being asked: ...", the
 * prompt's line for a person who volunteers a problem, when his last words were "She confirmed yesterday, she's taking the 6 units!".
 *
 * So, on every reply as it is saved: a sentence about the conversation's own turns, about shifting its focus, or about the kind of answer
 * being given ("a commitment to a future action") is cut, since nothing said to a person is about those; and "You named a problem without
 * being asked" is cut where their last words name no problem. Never left empty: where nothing is left, the plain question this check-in
 * has not asked yet.
 */
const TALK_ABOUT_THE_CONVERSATION: RegExp[] = [
  /\b(?:for|in|over|across) (?:the )?(?:last |past )?(?:two|three|four|five|six|several|\d+) turns\b/i,
  /\b(?:two|three|four|five|six|\d+) turns (?:now|running|in a row)\b/i,
  /^\W*let(?:'|\u2019)?s (?:shift|change|move) (?:the |our )?focus\b/i,
  /\bshift(?:ing)? (?:the |our )?focus\b/i,
  /\ba commitment to a future action\b/i,
];
const NAMED_A_PROBLEM_UNASKED = /\bnamed (?:a|the|your) (?:problem|blocker|gap|failure)\b[^.?!]*\bwithout (?:being asked|being probed|me asking)\b/i;
/** Words that name a problem: something late, stuck, missing, wrong, or owned up to. */
const A_PROBLEM_NAMED = /\b(?:problem|problems|issue|issues|stuck|block(?:ed|er|ing)?|late|behind|delay(?:ed|s)?|miss(?:ed|ing)|lost|los(?:e|ing)|fail(?:ed|ing|ure)?|wrong|mistake|forgot|struggl\w*|hard|difficult|worr\w*|concern\w*|risk\w*|can't|cannot|couldn't|didn't|haven't|hasn't|won't|not yet|no one|nobody|waiting|slow|short|down)\b/i;

export function withoutTalkAboutTheConversation(reply: string, theirLastWords: string | null | undefined, alreadyAsked: string[] = []): InstructionCut {
  if (!reply) return { text: reply, cut: [] };
  const theyNamedOne = A_PROBLEM_NAMED.test(String(theirLastWords ?? '').replace(/[\u2019]/g, "'"));
  const sentences = intoSentences(reply);
  const cutHere = sentences.map((s) => {
    const t = s.replace(/"[^"\n]*"|\u201c[^\u201d]*\u201d/g, ' ').trim();
    if (TALK_ABOUT_THE_CONVERSATION.some((re) => re.test(t))) return true;
    return NAMED_A_PROBLEM_UNASKED.test(t) && !theyNamedOne;
  });
  if (!cutHere.some(Boolean)) return { text: reply, cut: [] };
  const cut: string[] = [];
  const kept: string[] = [];
  sentences.forEach((s, i) => (cutHere[i] ? cut.push(s.trim()) : kept.push(s)));
  const text = kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: text || (aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE), cut };
}
