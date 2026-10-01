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

export function withoutOurInstructions(
  reply: string,
  prompt: string,
  sayable: string[] = [],
  alreadyAsked: string[] = [],
): InstructionCut {
  if (!reply || !prompt) return { text: reply, cut: [] };
  const instructions = theInstructionSentences(prompt);
  const runs = new Set(instructions.flatMap((s) => runsOf(wordsOf(s), A_COPIED_RUN)));
  if (!runs.size) return { text: reply, cut: [] };
  /* Their own words, and what the turn may say as fact, are never a copy of an instruction. */
  const theirs = new Set(sayable.flatMap((s) => runsOf(wordsOf(s), A_COPIED_RUN)));
  const wholeInstructions = instructions.map((s) => ` ${wordsOf(s).join(' ')} `);

  const sentences = intoSentences(reply);
  const copied = sentences.map((s) => {
    if (/\?\s*$/.test(s.trim())) return false;
    const r = runsOf(wordsOf(s), A_COPIED_RUN);
    return r.some((x) => runs.has(x) && !theirs.has(x) && ABOUT_THE_CONVERSATION.test(x));
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
  const text = kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { text: text || (aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE), cut };
}
