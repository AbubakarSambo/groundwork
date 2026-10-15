/**
 * A PROMPT CHANGE PROPOSED FROM A RUN, STORED AS A DRAFT, NEVER SWITCHED ON (decision 57, point 9, the part the counts did not cover).
 *
 * WHAT ALREADY LEARNS. `learning.service.ts` counts three signals for every pattern, coaching step and probe,
 * and suggests a weight for each. Those weights are stored and read by nothing (a-suggested-weight.ts). That is
 * learning about WHICH THINGS WORK. It does not learn about the WORDS THE ENGINE IS GIVEN, and the words are
 * where most of the faults found in the runs were: a pronoun for a person, a number put on the wrong thing, a
 * cause never named. Those were found by a person reading a run and fixed by a person writing a rule.
 *
 * WHAT THIS ADDS, AND NO MORE. After a run, somebody (a person, or a nightly job once Hafsah says so) hands this
 * the faults that were found in what people read, as sentences. It asks the model to propose RULES TO ADD to one
 * prompt. The proposal is stored as a DRAFT version (`isDraft`, never active) whose summary carries the evidence.
 * Then the same numbers that judge every other change judge it: it is put on in a copy of the database only,
 * the scenarios are run, and `theNumbersDecide` keeps or discards it. A kept proposal is still only a draft.
 * A person activates it, by hand, through /prompts, or does not.
 *
 * WHAT IT CANNOT DO, BY CONSTRUCTION AND NOT BY ASKING.
 *   - It can only ADD. The model returns new rule blocks, and the code places them in the old text. The old text
 *     is therefore always inside the new text, byte for byte, so nothing the prompt did well can be taken out.
 *   - It can only reach the prompts in THE_PROMPTS_IT_MAY_PROPOSE_FOR: the two judgement prompts and the report
 *     writer. Never the conversation's prompt, never anything that holds the privacy rules.
 *   - A proposed rule that speaks of patterns, privacy, who may read what, or quoting people is refused
 *     (`aRuleThatTouchesWhatIsProtected`). People's own words are never changed by a prompt: they are stored
 *     and quoted by code, and a rule here could only make the engine write about them differently.
 *   - It cannot activate anything. Nothing in this file writes `isActive`.
 *
 * THE SWITCH. `PROPOSE_PROMPT_CHANGES` is false, in this one place. `theProposalToMake` is the only door a
 * caller may use: with the switch off it returns "off" and does not call the model, so not even a read happens.
 * A test reads every source file to keep it that way, as it does for the weights.
 *
 * TO SWITCH IT ON: (1) Hafsah says so; (2) change the constant in the same commit that says so; (3) decide who
 * calls it (a person from the back office, or a job after each scenario run). Nothing calls it today.
 */
export const PROPOSE_PROMPT_CHANGES = false;

/** The only prompts a proposal may be for. */
export const THE_PROMPTS_IT_MAY_PROPOSE_FOR = ['the_judgement_room', 'the_judgement_population', 'report_synthesis'] as const;

/** Too many rules at once and nobody can tell which one did what. */
export const MOST_RULES_IN_ONE_PROPOSAL = 3;

export interface AFault {
  /** The sentence a person read, as it was served. */
  quote: string;
  /** What is wrong with it, in a plain sentence. */
  whatIsWrong: string;
  /** Which scenario it was found in. */
  scenario?: string;
}

export interface AProposedRule {
  /** The rule, written the way the prompt's other rules are: a heading in capitals, then what to do. */
  text: string;
  /** Which of the faults it is meant to stop, as numbers from the list it was given (from 1). */
  stops: number[];
}

export interface AProposal {
  key: string;
  rules: AProposedRule[];
  newContent: string;
  /** Goes in the draft's summary, so the evidence is kept with the words. */
  summary: string;
}

/** Words a proposed rule may not be about. A person reads these proposals before anything is switched on. */
const WHAT_IS_PROTECTED = /\b(privacy|private|confidential|patterns?|who (may|can|is allowed to) (read|see)|visible to|hidden from|word for word|verbatim|quote[sd]? (the|their|what)|rewrite (the|their) words|change (the|their) words)\b/i;

export function aRuleThatTouchesWhatIsProtected(rule: string): boolean {
  return WHAT_IS_PROTECTED.test(rule);
}

/** Where a new rule goes: before the closing wording rules if the prompt has them, else at the end. */
const THE_WORDING_RULES_START = 'HOW TO WRITE ANYTHING A PERSON WILL READ';

/**
 * The old text with the new rules put in. The old text is never edited: the new text is the old text with
 * blocks inserted between its own blocks, so `newContent` contains `current` split in two, and nothing else.
 */
export function withTheRulesAdded(current: string, rules: string[]): string {
  if (!rules.length) return current;
  const block = rules.map((r) => r.trim()).join('\n\n');
  const at = current.indexOf(THE_WORDING_RULES_START);
  if (at < 0) return `${current.replace(/\s+$/, '')}\n\n${block}`;
  return `${current.slice(0, at)}${block}\n\n${current.slice(at)}`;
}

/** True when nothing in `current` was lost: removing the added blocks gives `current` back, byte for byte. */
export function nothingWasTakenOut(current: string, proposed: string, rules: string[]): boolean {
  let back = proposed;
  for (const r of rules) back = back.replace(`${r.trim()}\n\n`, '').replace(`\n\n${r.trim()}`, '');
  return back === current;
}

export const THE_PROPOSAL_TOOL = {
  name: 'rules_to_add',
  description: 'Rules to add to a prompt, so the faults listed are not written again. Only rules; nothing is taken out.',
  input_schema: {
    type: 'object',
    properties: {
      rules: {
        type: 'array',
        description: `At most ${MOST_RULES_IN_ONE_PROPOSAL}. Each is one block in the prompt's own style: a heading in capitals, a full stop, then what to do and what not to do, with an example taken from the faults.`,
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            stops: { type: 'array', items: { type: 'number' }, description: 'Numbers of the faults this rule is meant to stop.' },
          },
          required: ['text', 'stops'],
        },
      },
    },
    required: ['rules'],
  },
} as const;

export function theProposalInstruction(key: string, current: string, faults: AFault[]): string {
  return [
    `You are improving one of the instructions a product gives its writing model. This one is called "${key}". It is shown in full below.`,
    '',
    'People found the faults listed below in what the product wrote. Propose at most three NEW RULES to add to the instruction so these faults are not written again. Rules only: you cannot change or remove anything that is already there, and you must not repeat a rule that is already there.',
    '',
    'Each rule is one block in the instruction\'s own style: a heading in capitals and a full stop, then what to do and what not to do, with one example. Write it for a writer who has not seen these faults. Never name a person or an organisation from the faults in a rule; say the shape of the fault.',
    '',
    'Do not write rules about privacy, patterns, who may read what, or how people\'s own words are quoted. Another part of the product owns those and a rule here is refused.',
    '',
    'Some of the listed sentences may not be faults at all. If a sentence is fine as it stands, leave it out of your thinking.',
    '',
    'THE FAULTS',
    ...faults.map((f, i) => `${i + 1}. "${f.quote}"\n   What is wrong: ${f.whatIsWrong}`),
    '',
    'THE INSTRUCTION AS IT IS NOW',
    current,
  ].join('\n');
}

export interface AProposalDeps {
  /** One model call that returns the rules. */
  askForRules: (instruction: string) => Promise<{ rules?: { text?: string; stops?: number[] }[] } | null>;
}

export type TheProposalOutcome =
  | { made: false; why: 'off' | 'not-a-prompt-it-may-change' | 'no-faults' | 'the-model-proposed-nothing-it-may' }
  | { made: true; proposal: AProposal; refused: { text: string; why: string }[] };

/**
 * THE ONLY DOOR. With the switch off it hands back "off" and does not call `askForRules`.
 * `switchedOn` is a parameter only so a spec can prove both sides; callers pass `PROPOSE_PROMPT_CHANGES`.
 */
export async function theProposalToMake(
  switchedOn: boolean,
  deps: AProposalDeps,
  input: { key: string; current: string; faults: AFault[]; evidenceFrom: string },
): Promise<TheProposalOutcome> {
  if (!switchedOn) return { made: false, why: 'off' };
  if (!(THE_PROMPTS_IT_MAY_PROPOSE_FOR as readonly string[]).includes(input.key)) return { made: false, why: 'not-a-prompt-it-may-change' };
  if (!input.faults.length) return { made: false, why: 'no-faults' };
  const asked = await deps.askForRules(theProposalInstruction(input.key, input.current, input.faults));
  const refused: { text: string; why: string }[] = [];
  const rules: AProposedRule[] = [];
  for (const r of (asked?.rules ?? []).slice(0, MOST_RULES_IN_ONE_PROPOSAL)) {
    const text = (r.text ?? '').trim();
    if (!text) continue;
    if (aRuleThatTouchesWhatIsProtected(text)) { refused.push({ text, why: 'It speaks of privacy, patterns, who may read what, or people\'s own words.' }); continue; }
    if (input.current.includes(text)) { refused.push({ text, why: 'It is already in the instruction.' }); continue; }
    rules.push({ text, stops: (r.stops ?? []).filter((n) => Number.isInteger(n) && n >= 1 && n <= input.faults.length) });
  }
  if (!rules.length) return { made: false, why: 'the-model-proposed-nothing-it-may' };
  const newContent = withTheRulesAdded(input.current, rules.map((r) => r.text));
  /* A last check that does not trust the placing above: if anything was lost, nothing is returned. */
  if (!nothingWasTakenOut(input.current, newContent, rules.map((r) => r.text))) return { made: false, why: 'the-model-proposed-nothing-it-may' };
  const evidence = input.faults.map((f, i) => `${i + 1}. "${f.quote}" (${f.whatIsWrong}${f.scenario ? `; in ${f.scenario}` : ''})`).join(' ');
  const summary = `PROPOSED FROM A RUN, NOT ACTIVE. Evidence from ${input.evidenceFrom}: ${evidence} Adds ${rules.length} rule${rules.length === 1 ? '' : 's'} and takes nothing out.`;
  return { made: true, proposal: { key: input.key, rules, newContent, summary }, refused };
}

/* ------------------------------------------------------------------------------------------------
 * KEPT OR DISCARDED BY THE NUMBERS
 * ---------------------------------------------------------------------------------------------- */

/** What a scored run holds that a proposal is judged on. Names are the scorer's own. */
export interface TheNumbers {
  /** The scorer's "problems", each must stay at zero or lower. */
  problems: Record<string, number>;
  /** The scorer's engine-value numbers, none may fall by more than a tenth. */
  value: Record<string, number>;
  /** The faults the proposal was meant to stop, counted by the same finder in both runs. */
  theFaultsItWasFor: number;
}

export interface TheVerdict {
  kept: boolean;
  reasons: string[];
}

/** The scorer's own margin: "If any number drops by more than a tenth against the baseline, the change is rejected." */
export const A_TENTH = 0.1;

/**
 * Kept only when (1) no engine-value number fell by more than a tenth against the run before, (2) no problem
 * rose, and (3) the faults it was for are fewer. Anything else is discarded. The same rule as for every
 * other change, with the one addition that it must have helped, because a rule that changes nothing is clutter.
 */
export function theNumbersDecide(before: TheNumbers, after: TheNumbers): TheVerdict {
  const reasons: string[] = [];
  for (const [k, was] of Object.entries(before.value)) {
    const now = after.value[k] ?? 0;
    if (was > 0 && now < was * (1 - A_TENTH)) reasons.push(`"${k}" fell from ${was} to ${now}, more than a tenth.`);
  }
  for (const [k, was] of Object.entries(before.problems)) {
    const now = after.problems[k] ?? 0;
    if (now > was) reasons.push(`The problem "${k}" rose from ${was} to ${now}.`);
  }
  if (after.theFaultsItWasFor >= before.theFaultsItWasFor) reasons.push(`The faults it was for did not fall: ${before.theFaultsItWasFor} before, ${after.theFaultsItWasFor} after.`);
  return reasons.length ? { kept: false, reasons } : { kept: true, reasons: [`No engine number fell by more than a tenth, no problem rose, and the faults it was for fell from ${before.theFaultsItWasFor} to ${after.theFaultsItWasFor}.`] };
}
