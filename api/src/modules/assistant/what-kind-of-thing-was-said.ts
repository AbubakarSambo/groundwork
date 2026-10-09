import { traceableToWhatTheySaid } from '../grounds/nothing-proposed-that-nobody-said';
import { route } from './the-router-is-deterministic';

/**
 * WHAT KIND OF THING THE LEAD SAID, IN ASK GROUNDWORK'S SET-UP CONVERSATION (B-083, B-084).
 *
 * The old context chat took every message as the answer to whichever set-up question was open, and a
 * free fact such as "The Westlands depot is closed from 20 to 27 October, so everyone should know" was
 * offered back as what doing well looks like, or dropped. A person who is setting up a check-in says
 * many kinds of thing in no order: a fact for everyone, a way of working, a decision, a private note
 * about somebody, a question for one person, a goal, an answer, or that they want to add a document.
 *
 * The model reads which kind it was. Code decides everything else: which door each kind goes
 * through (the same writers the typed-in lines, the lead's notes and the questions for people use),
 * that the words kept are the lead's own, and that nothing is written until the lead says yes.
 * Nothing here writes anything.
 */

/** The kinds that become a line on the check-in, with the kind of line each one is kept as. */
export const LINE_KINDS = {
  fact: 'NOTE',
  way_of_working: 'WAY_OF_WORKING',
  decision: 'DECISION',
  strategy: 'STRATEGY',
  unsettled: 'UNSETTLED',
} as const;

export type KindOfLine = keyof typeof LINE_KINDS;

export type WhatWasSaid =
  | { kind: KindOfLine; text: string }
  | { kind: 'private_note'; text: string; about: string | null }
  | { kind: 'question_for_person'; about: string; question: string }
  /** A goal, a measure, what doing well looks like, how long, how often, or an answer to the open question: the set-up conversation's own reading. */
  | { kind: 'answer' };

/**
 * THE LEAD WANTS TO ADD A DOCUMENT, OR SAYS THEY HAVE JUST DONE IT. By rules, and before any model,
 * because the words "add a document" were once read as a measure ("document added, an aim of 1").
 */
const JUST_ADDED = /\bi(?:'ve| have)?\s+(?:just\s+)?(?:added|uploaded|attached|put\s+(?:up|in))\b/i;
const WANTS_TO_ADD =
  /\b(?:i\s+(?:want|would\s+like|need|wish)\s+to|i'd\s+like\s+to|let\s+me|can\s+i|could\s+i|how\s+do\s+i|please)\s+(?:add|upload|attach|share|give\s+you|send\s+you)\s+(?:a|an|the|my|our|this|some)?\s*(?:new\s+)?(?:file|document|doc|pdf|spreadsheet|sheet|deck|handbook|policy|contract|plan|brief)s?\b/i;

export function asksToAddADocument(message: string): 'wants' | 'did' | null {
  const said = (message ?? '').trim();
  if (!said || said.length > 300) return null;
  if (JUST_ADDED.test(said) && /\b(?:file|document|doc|pdf|spreadsheet|sheet|deck|it|that)\b/i.test(said)) return 'did';
  if (route(said).lane === 'add_a_document' || WANTS_TO_ADD.test(said)) return 'wants';
  return null;
}

/** A message with so little in it that there is nothing to tell the kind of. */
function tooLittleToTell(message: string): boolean {
  const words = (message ?? '').trim().split(/\s+/).filter(Boolean);
  return words.length < 5;
}

const TOOL = {
  name: 'say_what_kind_of_thing_this_was',
  description: 'Say which one kind of thing the person said. Quote their own words for the text. Never rewrite or improve them.',
  input_schema: {
    type: 'object',
    properties: {
      kind: {
        type: 'string',
        enum: ['fact', 'way_of_working', 'decision', 'strategy', 'unsettled', 'private_note', 'question_for_person', 'answer'],
        description:
          'fact: something true about the work that everybody in the check-in should know (a closure, a date, a change, a constraint). '
          + 'way_of_working: a rule or habit for how the team works. '
          + 'decision: something already decided. '
          + 'strategy: the plan or direction. '
          + 'unsettled: something not yet decided. '
          + 'private_note: something the lead wants to keep to themselves, usually about one person. '
          + 'question_for_person: the lead wants one named person to be asked something. '
          + 'answer: anything else, including a goal, a target or measure for the team or for a person, what doing well looks like, how long it runs, how often people check in, or a direct answer to the question that was asked.',
      },
      text: { type: 'string', description: 'For every kind except answer and question_for_person: the lead\'s own words that hold the thing, copied exactly, without any lead-in such as "I want to add a fact".' },
      about: { type: 'string', description: 'For private_note and question_for_person: the name of the one person, as the lead said it. Omit for a note about the whole check-in.' },
      question: { type: 'string', description: 'For question_for_person only: what the lead wants that person asked, in the lead\'s own words.' },
    },
    required: ['kind'],
  },
};

const SYSTEM =
  'A lead is setting up a check-in by talking. Read what they just said and say which one kind of thing it was. '
  + 'Be careful: a statement of fact about the work, such as a closure, a date or a constraint, is a fact for everybody, and is NOT an answer to a set-up question and NOT a goal. '
  + 'A goal or target is something people are expected to reach, with a number or a clear result. '
  + 'Use "answer" when it is a goal, a measure, what doing well looks like, how long it runs, how often people check in, or a direct reply to the question that was asked. '
  + 'Quote the lead\'s own words and never add to them.';

export interface Reader {
  extract<T>(system: string, history: { role: 'user' | 'assistant'; content: string }[], tool: any, options?: any): Promise<T | null>;
}

/**
 * Which kind of thing this was. A model that cannot be reached, says nothing, or quotes words the lead
 * never typed, gives `answer`, which is the set-up conversation's own reading as before.
 */
export async function whatKindOfThingWasSaid(engine: Reader, message: string, openQuestion: string | null): Promise<WhatWasSaid> {
  const said = (message ?? '').trim();
  if (tooLittleToTell(said)) return { kind: 'answer' };
  let heard: { kind?: string; text?: string; about?: string; question?: string } | null = null;
  try {
    heard = await engine.extract(
      SYSTEM,
      [{ role: 'user', content: `${openQuestion ? `The question that was open: ${openQuestion}\n\n` : ''}What the lead said: ${said}` }],
      TOOL,
      { fast: true, temperature: 0 },
    );
  } catch {
    return { kind: 'answer' };
  }
  if (!heard?.kind) return { kind: 'answer' };
  const own = (t: string | undefined) => (t && t.trim() && traceableToWhatTheySaid(t, said) ? t.trim() : said);
  if (heard.kind in LINE_KINDS) return { kind: heard.kind as KindOfLine, text: own(heard.text) };
  if (heard.kind === 'private_note') return { kind: 'private_note', text: own(heard.text), about: heard.about?.trim() || null };
  if (heard.kind === 'question_for_person' && heard.about?.trim()) {
    return { kind: 'question_for_person', about: heard.about.trim(), question: (heard.question ?? '').trim() || said };
  }
  return { kind: 'answer' };
}
