/**
 * A DUMP IS MANY THINGS AT ONCE, AND THE CHAT TOOK ONE OF THEM.
 *
 * Hafsah, 22 September 2026: "prove that I can do a dump on the context chat and it takes things and
 * synthesises it as context for the team." Driven with a real one - a quarter's brain dump, fifteen
 * hundred characters, carrying the team's number, the credit and arrears ceilings, three people's
 * numbers, what she actually wanted out of it, and three dates - the context chat proposed ONE thing,
 * offered the same one three times, wrote none of the targets, dropped two of the three people, and
 * finished by recording the lead's own "yes, take the rest" as what doing well looks like.
 *
 * That is not a bug in the wording. The conversation is built one gap at a time - the open gap picks
 * an extraction tool, the tool reads one thing, and the proposal offers it. That shape is right for a
 * conversation and wrong for a paste: somebody who has just written everything down is not answering
 * a question, they are handing over the context, and asking them eight more questions to get it back
 * out is the product refusing what it was given.
 *
 * SO A PASTE IS READ ONCE, FOR EVERYTHING IT HOLDS, AND OFFERED AS ONE THING TO SAY YES TO. What it
 * takes is what this product keeps: what doing well looks like, the numbers the whole check-in is
 * held to, what the lead expects of each named person and the number that goes with it, and the dates.
 *
 * THE RULES DO NOT CHANGE BECAUSE THE INPUT GOT BIGGER. Nothing is written until the lead says yes,
 * and the confirmation re-reads their own words rather than taking a value from the screen. A name
 * that matches nobody on the check-in is said out loud, never guessed onto the nearest person. An
 * expectation of somebody goes down as the lead's, marked unseen until that person reads it. And the
 * product writes the list, so a number can be checked before it is agreed to.
 */

export interface ADumpRead {
  /** What doing well looks like, in the lead's own words. */
  success?: string | null;
  /** The numbers the whole check-in is held to. */
  teamTargets?: { name: string; target?: number | null; notToExceed?: boolean | null }[] | null;
  /** What the lead expects of one named person, and the number that goes with it where there is one. */
  forPeople?: { personName: string; expectation: string; targets?: { name: string; number: number }[] | null }[] | null;
  /** Dates the paste sets, in its own words. Never parsed into a date here. */
  dates?: { what: string; when: string }[] | null;
}

/**
 * WHEN A MESSAGE IS A PASTE RATHER THAN AN ANSWER.
 *
 * Length alone, and deliberately nothing cleverer. A short answer to a question is a conversation and
 * keeps the one-thing-at-a-time shape that makes each proposal checkable; four hundred characters is
 * past the length anybody types as a reply and into the length people paste. Getting this wrong in
 * either direction costs one extra turn, which is the right price for not guessing at intent.
 */
export const A_PASTE_IS_THIS_LONG = 400;
export const looksLikeADump = (text: string): boolean => (text ?? '').trim().length >= A_PASTE_IS_THIS_LONG;

export const A_DUMP_PROMPT = `Somebody running a team check-in has pasted everything they have about it. Read it once and take out only what a check-in keeps.

WHAT DOING WELL LOOKS LIKE. Their own sentence about what would make this period a good one. Take the sentence that says what they want out of it, in their words, not a summary of the whole paste.

NUMBERS THE WHOLE TEAM IS HELD TO. A total to reach, a ceiling not to pass. "N180m for Q4" is a target of 180000000. "Credit under 35%" is 35, not to exceed. Take the number they have settled on, not one they are arguing with: "the board wants 200 but I have agreed 180" is 180.

NAME EVERY MEASURE IN WORDS, as a person would read it on a board: "Q4 sales", "credit as a share of sales", "arrears", "new dealers signed". Never put the figure, a currency symbol or a currency letter in the name - "N for Q4" and "N180m" are not names of anything. The number goes in the number field and nowhere else.

WHAT THEY EXPECT OF EACH NAMED PERSON. One entry per person, in the lead's own words, with EVERY number they gave for that person. "I want Dayo at N45m with credit under 35% of his own book" is Dayo, that sentence, and two numbers: Q4 sales 45000000, and credit as a share of his sales 35. "N35m and at least 4 new dealers signed" is two numbers, not one. Their last quarter's figure is not a target: it is what happened.

DATES. What is due and when, in the paste's own words: "quarter ends 31 December", "board meeting 15 January".

Give names and wording exactly as the paste writes them. Do not correct them, expand them, or match them to anybody. Leave out anything that is an opinion about a person rather than a number or a job for them - that belongs somewhere else and not here. An empty field is a correct answer.`;

export const A_DUMP_SCHEMA = {
  name: 'emit_what_the_paste_holds',
  description: 'Emit everything a check-in keeps from one pasted brief.',
  input_schema: {
    type: 'object',
    properties: {
      success: { type: ['string', 'null'], description: "What doing well looks like, in their own words." },
      teamTargets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            target: { type: ['number', 'null'] },
            notToExceed: { type: ['boolean', 'null'], description: 'True for a ceiling: credit under 35%, arrears under 8%.' },
          },
          required: ['name'],
        },
      },
      forPeople: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            personName: { type: 'string', description: 'The name exactly as the paste writes it.' },
            expectation: { type: 'string', description: "What the lead expects of them, in the lead's own words." },
            targets: {
              type: 'array',
              description: 'Every number this person is to reach or stay under, named in words.',
              items: { type: 'object', properties: { name: { type: 'string' }, number: { type: 'number' } }, required: ['name', 'number'] },
            },
          },
          required: ['personName', 'expectation'],
        },
      },
      dates: {
        type: 'array',
        items: { type: 'object', properties: { what: { type: 'string' }, when: { type: 'string' } }, required: ['what', 'when'] },
      },
    },
    required: [],
  },
} as const;

const fmt = (n: number): string =>
  Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m` : Math.abs(n) >= 1e3 ? n.toLocaleString('en-GB') : String(n);

export interface WhatAPasteGives {
  success: string | null;
  teamTargets: { name: string; target: number | null; notToExceed: boolean }[];
  forPeople: { who: string; participantId: string; expectation: string; targets: { name: string; number: number }[] }[];
  dates: { what: string; when: string }[];
  unmatched: string[];
}

/**
 * THE PRODUCT'S OWN LIST OF WHAT IT TOOK, ENDING IN A YES OR NO.
 *
 * `asking` is the chat's version. A page states what is on record; a chat is asking for a yes, and
 * the difference is one line. Every number is shown as it will be written, so the lead is checking
 * the thing itself rather than a description of it.
 */
export function whatWeTookFromThat(got: WhatAPasteGives, opts: { asking?: boolean } = {}): string | null {
  const anything = got.success || got.teamTargets.length || got.forPeople.length || got.dates.length || got.unmatched.length;
  if (!anything) return null;
  const lines: string[] = ['Here is what I took from that.'];
  if (got.success) lines.push('', `What doing well looks like: "${got.success}"`);
  if (got.teamTargets.length) {
    lines.push('', 'For the whole check-in:');
    for (const t of got.teamTargets) {
      lines.push(`- ${t.name}${t.target != null ? `: ${fmt(t.target)}${t.notToExceed ? ', not to be passed' : ''}` : ', tracked rather than counted'}`);
    }
  }
  if (got.forPeople.length) {
    lines.push('', 'What you expect of each person, in your words, marked as yours and not yet seen by them:');
    /* One line per person, carrying every number of theirs: two numbers read as the same sentence twice. */
    for (const p of got.forPeople) {
      const numbers = p.targets.map((t) => `${t.name}: ${fmt(t.number)}`);
      lines.push(`- ${p.who}: "${p.expectation}"${numbers.length ? ` (${numbers.join('; ')})` : ''}`);
    }
  }
  if (got.dates.length) {
    lines.push('', 'Dates you named, which stay in this conversation rather than on the record:');
    for (const d of got.dates) lines.push(`- ${d.what}: ${d.when}`);
  }
  if (got.unmatched.length) {
    lines.push('', `${got.unmatched.length === 1 ? 'One name is' : `${got.unmatched.length} names are`} not on this check-in: ${got.unmatched.join(', ')}. Add them and I will put their part on too.`);
  }
  lines.push('', opts.asking ? 'Record all of this?' : 'Nothing else from it is kept.');
  return lines.join('\n');
}
