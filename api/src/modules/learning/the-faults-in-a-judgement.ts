import type { AFault } from './a-prompt-proposal';

/**
 * THE FAULTS A MACHINE CAN FIND IN A SERVED JUDGEMENT, FOR A PROPOSAL'S EVIDENCE (6 October).
 *
 * Only one kind, because it is the one a plain test can find without guessing what the check-in was about: a pronoun
 * for a person. A judgement is written with labels and read with names, or "you", swapped in; a "they" or "she" left
 * behind then points at somebody else, or at nobody ("Your own record says they have not given Tobi the dates").
 * A sentence is flagged when it has a pronoun for a person AND either "you" or "your", or a person's name of two
 * capitalised words. The sentence is shown to the model that proposes a rule, not mended, and a flagged sentence may
 * be a false alarm (a company is also "they"), which the proposal's own wording step is told.
 *
 * Other faults (a number put on the wrong thing, a cause never named) need a person to read the run. They are given to the
 * proposal by hand, as `AFault` rows.
 */
const PRONOUN = /\b(he|she|they|them|their|theirs|themselves|him|his|her|hers)\b/i;
const YOU = /\b(you|your|yours)\b/i;
const A_NAME = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/;

export function sentencesOf(text: string): string[] {
  return (text ?? '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

export function aPronounForAPerson(sentence: string): boolean {
  if (!PRONOUN.test(sentence)) return false;
  return YOU.test(sentence) || A_NAME.test(sentence);
}

/** Every string a lead reads in a served judgement. */
export function theTextOfAJudgement(j: any): string[] {
  if (!j || typeof j !== 'object') return [];
  const out: string[] = [];
  if (typeof j.theGap === 'string') out.push(j.theGap);
  for (const r of j.whatTheNumbersSay ?? []) { out.push(r?.says ?? '', r?.soWhat ?? ''); }
  for (const m of j.whatToDo ?? []) { out.push(m?.move ?? '', m?.because ?? ''); }
  for (const c of j.whatThisCannotTellYou ?? []) { out.push(c?.about ?? '', c?.why ?? '', c?.toKnow ?? ''); }
  for (const w of j.whatWeFailedToAsk ?? []) out.push(w?.about ?? '');
  return out.filter(Boolean);
}

export function theFaultsInAJudgement(j: any, scenario?: string): AFault[] {
  const faults: AFault[] = [];
  for (const t of theTextOfAJudgement(j)) {
    for (const s of sentencesOf(t)) {
      if (aPronounForAPerson(s)) faults.push({ quote: s, whatIsWrong: 'A pronoun is used for a person. When the label is turned into a name or "you", the pronoun points at somebody else or at nobody.', scenario });
    }
  }
  return faults;
}
