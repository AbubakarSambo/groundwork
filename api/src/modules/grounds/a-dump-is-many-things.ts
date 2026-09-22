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
  /** How this team has said it works: the rules, in the paste's own words. */
  waysOfWorking?: string[] | null;
  /** What the paste says somebody still has to decide. */
  openDecisions?: string[] | null;
  /** What the paste itself is unsure about, argues with itself about, or says not to treat as settled. */
  notSettled?: string[] | null;
  /** What the lead says about one named person that is not a number or a job: an observation, theirs. */
  aboutPeople?: { personName: string; observation: string }[] | null;
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

WHAT DOING WELL LOOKS LIKE. Their own sentence about what would make this period a good one. Take the sentence that says what they want out of it, in their words, not a summary of the whole paste. A rule, an instruction or a slogan off a list is not it: "celebrate revenue not meetings" and "no proposal before qualification" are ways of working, not a picture of a good quarter. If no sentence in the paste says what a good period looks like, leave this out.

NUMBERS THE WHOLE TEAM IS HELD TO. A total to reach, a ceiling not to pass. "N180m for Q4" is a target of 180000000. "Credit under 35%" is 35, not to exceed. Take the number they have settled on, not one they are arguing with: "the board wants 200 but I have agreed 180" is 180.

NAME EVERY MEASURE IN WORDS, as a person would read it on a board: "Q4 sales", "credit as a share of sales", "arrears", "new dealers signed". Never put the figure, a currency symbol or a currency letter in the name - "N for Q4" and "N180m" are not names of anything. The number goes in the number field and nowhere else.

WHAT THEY EXPECT OF EACH NAMED PERSON. One entry per person, in the lead's own words, with EVERY number they gave for that person. "I want Dayo at N45m with credit under 35% of his own book" is Dayo, that sentence, and two numbers: Q4 sales 45000000, and credit as a share of his sales 35. "N35m and at least 4 new dealers signed" is two numbers, not one. Their last quarter's figure is not a target: it is what happened.

DATES. What is due and when, in the paste's own words: "quarter ends 31 December", "board meeting 15 January".

HOW THIS TEAM WORKS. The rules and practices the paste lists as how things are done here: "no proposal before qualification", "follow up 48 hours after a demo", "escalate after a week". Their wording. Take them whether the paste says they are agreed, half-agreed or ignored - it is the lead's own hedge and it is kept with the line.

WHAT IS STILL TO DECIDE. Anything the paste says needs deciding and has not been: "whether the target stays at 12m", "whether the 30-day rule is official". One line each, as a decision, not as a task.

WHAT IS NOT SETTLED. Anything the paste contradicts itself about, is unsure of, or says explicitly not to treat as fact or as a target: two numbers for the same thing, a figure somebody mentioned but nobody approved, a task nobody knows is finished. Say the competing versions where the paste gives both.

WHAT THEY SAY ABOUT EACH PERSON THAT IS NOT A NUMBER OR A JOB. The lead's read of somebody: how they work, what they are good at, what they keep doing. One entry per person, their words. This is an observation, never a fact about the person, and it is kept where only the lead can read it.

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
      waysOfWorking: { type: 'array', description: "How this team works, in the paste's own words.", items: { type: 'string' } },
      openDecisions: { type: 'array', description: 'What still has to be decided, one line each.', items: { type: 'string' } },
      notSettled: { type: 'array', description: 'What the paste contradicts itself about or says not to treat as fact. Give both versions where it gives both.', items: { type: 'string' } },
      aboutPeople: {
        type: 'array',
        description: "The lead's read of one person, where it is not a number or a job for them.",
        items: { type: 'object', properties: { personName: { type: 'string' }, observation: { type: 'string' } }, required: ['personName', 'observation'] },
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
  /** The three lists that are words rather than numbers. Kept as the lead's own note, never as fact. */
  waysOfWorking: string[];
  openDecisions: string[];
  notSettled: string[];
  /** The lead's read of one person, kept where only the lead reads it. */
  aboutPeople: { who: string; participantId: string; observation: string }[];
}

/**
 * THE PRODUCT'S OWN LIST OF WHAT IT TOOK, ENDING IN A YES OR NO.
 *
 * `asking` is the chat's version. A page states what is on record; a chat is asking for a yes, and
 * the difference is one line. Every number is shown as it will be written, so the lead is checking
 * the thing itself rather than a description of it.
 */
export function whatWeTookFromThat(got: WhatAPasteGives, opts: { asking?: boolean } = {}): string | null {
  const anything = got.success || got.teamTargets.length || got.forPeople.length || got.dates.length || got.unmatched.length
    || got.waysOfWorking?.length || got.openDecisions?.length || got.notSettled?.length || got.aboutPeople?.length;
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
  if (got.waysOfWorking?.length) {
    lines.push('', 'How this team works, as you wrote it. Kept as your note on the check-in, never quoted as a rule anybody agreed:');
    for (const w of got.waysOfWorking) lines.push(`- ${w}`);
  }
  if (got.openDecisions?.length) {
    lines.push('', 'Still to decide, kept for you:');
    for (const d of got.openDecisions) lines.push(`- ${d}`);
  }
  if (got.notSettled?.length) {
    lines.push('', 'Not settled, so nothing here is treated as a fact or a target:');
    for (const n of got.notSettled) lines.push(`- ${n}`);
  }
  if (got.aboutPeople?.length) {
    lines.push('', 'What you said about each person that is not a number. Kept where only you read it, and never quoted to them or in a report:');
    for (const a of got.aboutPeople) lines.push(`- ${a.who}: "${a.observation}"`);
  }
  if (got.unmatched.length) {
    lines.push('', `${got.unmatched.length === 1 ? 'One name is' : `${got.unmatched.length} names are`} not on this check-in: ${got.unmatched.join(', ')}. Add them and I will put their part on too.`);
  }
  lines.push('', opts.asking ? 'Record all of this?' : 'Nothing else from it is kept.');
  return lines.join('\n');
}

/*
 * AND THE YES COMES A TURN LATER, WHICH IS THE WHOLE POINT OF ASKING.
 *
 * Driven on a 8,400-character quarter dump, 22 September 2026. The chat read it whole and offered the
 * list - the team's six numbers, five people's expectations, the dates - and asked "Record all of
 * this?". The lead said "yes, record all of that", and the confirmation read THAT sentence for a
 * paste, found a four-word answer instead, fell back to one-gap-at-a-time, and wrote one person's
 * expectation. Said yes eight times in a row and got the same person's expectation eight times: nine
 * rows for one of six people, no team numbers, no success statement.
 *
 * The paste is in the conversation, one turn up. So the confirmation looks for it there, and only
 * where the thing being said yes to is the list this product printed: the assistant's last turn
 * opens with THE_LIST_OPENS_WITH, which only whatWeTookFromThat writes.
 */
export const THE_LIST_OPENS_WITH = 'Here is what I took from that.';

/** Their answer to "Record all of this?", with nothing else in it. Anything longer is a new instruction. */
const A_PLAIN_YES = /^(yes|yep|yeah|yup|ok|okay|sure|go ahead|do it|please do|confirm(ed)?|record (it|that|all of (it|that|this))|save (it|that)|take (it|that|the rest)|all of it|that is right|correct)\b[\s\S]{0,60}$/i;

/**
 * The paste a yes is answering, or null. `history` is oldest first, as the chat sends it.
 */
export function thePasteThisYesIsFor(
  said: string | null | undefined,
  history: { role: 'user' | 'assistant'; content: string }[] | null | undefined,
): string | null {
  const answer = (said ?? '').trim();
  if (!answer || !A_PLAIN_YES.test(answer)) return null;
  const turns = history ?? [];
  const lastAssistant = [...turns].reverse().find((t) => t.role === 'assistant');
  if (!lastAssistant?.content?.trim().startsWith(THE_LIST_OPENS_WITH)) return null;
  const paste = [...turns].reverse().find((t) => t.role === 'user' && looksLikeADump(t.content ?? ''));
  return paste?.content?.trim() || null;
}

/*
 * A SLOGAN IS NOT WHAT DOING WELL LOOKS LIKE.
 *
 * Two reads of the same 8,400-character dump, minutes apart, 22 September 2026. One took "celebrate
 * revenue not meetings" as what doing well looks like; the other took the line about accountability
 * turning into "did you do your task". Both were lifted off a list of team rules, and the first one
 * was written to the baseline - the yardstick every report reads people against - as four words off
 * a bullet list.
 *
 * The dump genuinely did not contain a sentence saying what a good quarter looks like. An empty
 * answer is the right one there, and the chat then asks for it, which is the conversation this
 * product is for. So: a rule, an instruction or a slogan is not a success statement, and a statement
 * has to be long enough to say something.
 */
const FEW_ENOUGH_WORDS_TO_BE_A_SLOGAN = 6;
const A_RULE_RATHER_THAN_A_PICTURE =
  /^(?:no |never |always |dont |don't |do not |stop |start |keep |celebrate |avoid |need |needs |escalate |follow up|one owner|monday|friday)/i;

/** What doing well looks like, or null where the paste only had rules and slogans. */
export function aSuccessStatementHolds(text: string | null | undefined): string | null {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return null;
  if (t.split(' ').length < FEW_ENOUGH_WORDS_TO_BE_A_SLOGAN) return null;
  if (A_RULE_RATHER_THAN_A_PICTURE.test(t)) return null;
  return t;
}

/*
 * THE SAME PASTE, READ TWICE, IS NOT TWO SETS OF NUMBERS.
 *
 * Said yes to the list, then said yes again a minute later (22 September 2026): the second read of
 * the same paste called the team's first measure "signed sales" where the first had called it
 * "signed", and "collected revenue" where the first had "collected". Neither name matched the other
 * exactly, so both were written, and the board carried twelve rows for six numbers.
 *
 * Exact-name matching was never enough for text a model wrote. One name inside the other is the same
 * measure: "signed" and "signed sales", "expansions" and "expansions closed". Different words are
 * still different measures, so "qualified pipeline" and "warm referrals" both stand.
 */
const stem = (w: string): string =>
  w.endsWith('ing') && w.length > 5 ? w.slice(0, -3)
    : w.endsWith('ed') && w.length > 4 ? w.slice(0, -2)
      : w.endsWith('es') && w.length > 4 ? w.slice(0, -2)
        : w.endsWith('s') && !w.endsWith('ss') && w.length > 3 ? w.slice(0, -1)
          : w;

/* Stemmed, because the drift between two reads is usually a tense: "big demos to support" and "big
   demos supported" were written as two of David's measures by one paste read twice. */
const wordsOf = (name: string): string[] =>
  (name ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2).map(stem);

/** Whether these two names are the same thing said at different lengths. */
export function theSameMeasure(a: string, b: string): boolean {
  const x = wordsOf(a);
  const y = wordsOf(b);
  if (!x.length || !y.length) return false;
  const inB = x.every((w) => y.includes(w));
  const inA = y.every((w) => x.includes(w));
  return inB || inA;
}

/*
 * ONE NOTE PER KIND, REWRITTEN RATHER THAN STACKED.
 *
 * The first version matched an existing note by its exact text, and a second read of one paste writes
 * the same list in slightly different words: said yes twice and the Context page carried eighteen
 * notes for nine things, two of everything, worded differently. A lead reading that cannot tell which
 * one is current.
 *
 * So each of these has a fixed opening line. A later paste replaces the note that opens the same way
 * - and only one that opens exactly that way, so nothing a lead typed themselves is ever overwritten.
 */
export const HOW_THE_TEAM_WORKS_OPENS = 'How the team works, as I wrote it down (not confirmed with anybody):';
export const STILL_TO_DECIDE_OPENS = 'Still to decide:';
export const NOT_SETTLED_OPENS = 'Not settled - do not treat any of this as a fact or a target:';
export const MY_READ_OF_THEM_OPENS = 'What I think about how they are working (my read, not a fact):';
