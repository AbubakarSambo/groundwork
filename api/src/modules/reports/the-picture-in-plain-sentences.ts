/**
 * ONE MODEL CALL TURNS THE FACTS INTO SENTENCES A PERSON CAN READ.
 *
 * What this replaces: `thePictureTheProductWrites`, which joined slot names to raw answers. Across
 * the twenty-four-scenario run of 25 September 2026 that produced 734 lines of the shape
 * "Femi Okonkwo said this was for: I'll know when they tell me they have the statements ready",
 * and, at the top of every one of them, a fixed sentence that said the accounts did not contradict
 * each other immediately before listing the contradictions.
 *
 * THE FACTS DO NOT CHANGE. The same rows go in - see the-facts-about-a-person, whose extraction is
 * untouched. What changes is that something that can read writes the prose, so an answer filed under
 * "what this was for" that is plainly an answer to a different question is written as what it
 * actually says.
 *
 * ONE CALL FOR THE WHOLE PICTURE, not one per person. The opening has to describe what is true
 * across everybody ("All four people have checked in. They disagree on two things"), which cannot
 * be written by anybody who has only seen one person - and four calls would let four paragraphs
 * disagree about how many people answered.
 *
 * IT MAY NEVER FAIL THE REPORT. A report that will not load because a wording call timed out is
 * strictly worse than one that reads plainly but flatly. So there is a deterministic fallback, and
 * the one thing that fallback is not allowed to do is glue slot names - see `plainlyWithoutAModel`.
 */
import type { PersonFacts } from './the-facts-about-a-person';
import { PLAIN_WORDS_WITH_EXAMPLES } from '../conversation/plain-words';

export interface ThePicture {
  /** What is true across everybody, in one or two sentences. Never a fixed sentence. */
  opening: string;
  /** One paragraph per person, in the same order they were given. */
  perPerson: { participantId: string; text: string; headline: string | null }[];
}

/**
 * WHAT THE MODEL IS ASKED FOR.
 *
 * `differences` is passed as a count and as the topics, because the opening has to be able to say
 * "They disagree on two things: where the work is stuck, and how many applications are open" -
 * which needs the topics, and which the old fixed sentence could not say at any price.
 */
export function thePictureInstruction(a: {
  peopleAnswered: number;
  peopleExpected: number;
  differenceTopics: string[];
  aboutOnePerson: boolean;
}): string {
  const single = a.aboutOnePerson
    ? `

THIS CHECK-IN IS ABOUT ONE PERSON. Write the opening and every paragraph as facts about what has
happened and what each person has said. Do not write anybody's reading of the person this is about,
do not say what should be decided, and do not repeat a number as though it were settled when the
facts say it was never written down. The person this is about will read this.`
    : '';

  return `${PLAIN_WORDS_WITH_EXAMPLES}

WHAT YOU ARE WRITING

You are given the facts this product holds about each person on a check-in. Every one of them is
either a quotation from what that person said or arithmetic over the record. Nothing has been
interpreted yet.

Write two things.

THE OPENING. One or two sentences saying what is actually true across everybody. How many have
checked in, and what they disagree about if they disagree. ${a.peopleAnswered} of ${a.peopleExpected} have
answered. ${a.differenceTopics.length
    ? `They disagree on ${a.differenceTopics.length}: ${a.differenceTopics.join('; ')}.`
    : 'Nothing in the record yet shows one account disagreeing with another, so say that plainly.'}

Never write a sentence claiming the accounts do not contradict each other. Say what the accounts
actually do.

ONE PARAGRAPH PER PERSON. Two or three sentences. What they have done, with their own numbers. What
they are waiting on. Where the record shows two numbers for one thing, or a number set for them they
have never mentioned, say so as a plain fact about what was and was not said - never as a criticism
of them.

Use the name you are given for each person. Never write "the initiator", never write a person's job
description in place of their name.

AND A HEADLINE PER PERSON, only where the record shows something the lead should look at. One plain
sentence, not a label. Null where there is nothing.${single}`;
}

export const THE_PICTURE_SCHEMA = {
  name: 'write_the_picture',
  description: 'The opening, and one plain paragraph per person, from the facts given.',
  input_schema: {
    type: 'object',
    properties: {
      opening: {
        type: 'string',
        description: 'One or two plain, full sentences saying what is true across everybody. Never a fixed sentence, never a claim that accounts do not contradict each other.',
      },
      perPerson: {
        type: 'array',
        description: 'One entry per person given, in the same order.',
        items: {
          type: 'object',
          properties: {
            participantId: { type: 'string', description: 'Exactly the id given for this person.' },
            text: { type: 'string', description: 'Two or three plain, full sentences about what this person has done and is waiting on. Uses their name.' },
            headline: { type: ['string', 'null'], description: 'One plain full sentence where the record shows something the lead should look at. Null otherwise. Never a label.' },
          },
          required: ['participantId', 'text'],
        },
      },
    },
    required: ['opening', 'perPerson'],
  },
} as const;

/** The facts for one person, as the model sees them. Plain lines, no slot names, no prose. */
export function factsAsLines(f: PersonFacts, nameFor: (label: string) => string): string {
  const who = nameFor(f.label);
  const lines: string[] = [`PERSON id=${f.participantId} name=${who}${f.isLead ? ' (runs this check-in)' : ''}`];
  if (f.whatTheySaidItWasFor) lines.push(`  they said this was for, in their words: "${f.whatTheySaidItWasFor}"`);
  if (f.whereTheySayTheyAre) lines.push(`  the latest thing they reported, in their words: "${f.whereTheySayTheyAre}"`);
  if (f.whatTheySayIsInTheWay) lines.push(`  what they named as being in the way, in their words: "${f.whatTheySayIsInTheWay}"`);
  for (const n of f.numbers) {
    lines.push(`  a number: ${n.what} - target ${n.target}${n.soFar != null ? `, record has ${n.soFar}` : ''}, set by ${n.setBy}`);
  }
  if (f.twoNumbersForOneTarget) {
    lines.push(`  TWO NUMBERS FOR ONE THING: ${f.twoNumbersForOneTarget.what} - the lead says ${f.twoNumbersForOneTarget.theLeads}, they say ${f.twoNumbersForOneTarget.theirs}`);
  }
  if (f.aNumberSetForThemTheyHaveNeverSaid) {
    lines.push(`  A NUMBER SET FOR THEM THEY HAVE NEVER MENTIONED: ${f.aNumberSetForThemTheyHaveNeverSaid.what} - ${f.aNumberSetForThemTheyHaveNeverSaid.target}. They have not said this figure once.`);
  }
  for (const d of f.whatDoesNotAddUp) lines.push(`  the record does not add up: ${d}`);
  return lines.join('\n');
}

/**
 * THE FALLBACK, WHICH IS ALLOWED TO BE FLAT AND IS NOT ALLOWED TO GLUE.
 *
 * Every sentence here is whole, starts with a capital and names the person. It reads like a form
 * because it is one; what it never does is print "Where they say they stand now:" in front of
 * somebody's answer to a different question.
 */
export function plainlyWithoutAModel(facts: PersonFacts[], nameFor: (label: string) => string): ThePicture {
  const capital = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const perPerson = facts.map((f) => {
    const who = nameFor(f.label);
    const out: string[] = [];
    if (f.whereTheySayTheyAre) out.push(`${who} reported this: ${capital(f.whereTheySayTheyAre)}.`);
    else if (f.whatTheySaidItWasFor) out.push(`${who} said this was about ${f.whatTheySaidItWasFor}.`);
    if (f.whatTheySayIsInTheWay) out.push(`${who} named this as being in the way: ${capital(f.whatTheySayIsInTheWay)}.`);
    if (f.twoNumbersForOneTarget) {
      const t = f.twoNumbersForOneTarget;
      out.push(`There are two numbers for ${t.what}. The lead has ${t.theLeads} and ${who} has ${t.theirs}.`);
    }
    if (f.aNumberSetForThemTheyHaveNeverSaid) {
      const n = f.aNumberSetForThemTheyHaveNeverSaid;
      out.push(`The lead set ${n.target} for ${n.what}, and ${who} has not mentioned that figure.`);
    }
    for (const d of f.whatDoesNotAddUp) out.push(`${capital(d)}.`);
    return {
      participantId: f.participantId,
      text: out.join(' ').replace(/\.\.+/g, '.').trim(),
      headline: f.hasGap && out.length ? out[out.length - 1] : null,
    };
  }).filter((p) => p.text);

  return { opening: '', perPerson };
}

/**
 * HOW MANY PEOPLE, IN WORDS, AND NEVER "1 people".
 *
 * Forty-two lines across seven scenarios read "1 people answered this check-in" or "1 of 1 people
 * have given an account". Both halves are wrong: the plural, and counting a total that is true by
 * construction.
 */
const INWORDS = ['nobody', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export function howManyAnsweredInWords(answered: number, expected: number): string {
  const n = INWORDS[answered] ?? String(answered);
  if (answered === 0) return 'Nobody has answered yet.';
  if (expected > 0 && answered >= expected) {
    return answered === 1 ? 'One person has answered.' : `All ${INWORDS[answered]?.toLowerCase() ?? answered} people have checked in.`;
  }
  return answered === 1
    ? `One person has answered so far, of ${expected}.`
    : `${n} of the ${expected} people have answered so far.`;
}
