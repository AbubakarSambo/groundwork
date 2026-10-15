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

import { ContextItemKind } from '@prisma/client';
import { whatTheWordsSuggest, theListsWordsFor, A_LIMIT_NOT_TO_GO_OVER, THE_FIVE_KINDS_SAID, type TargetDirection } from '../board/an-aim-or-a-limit';
import { ABOUT_SOMEBODY } from './what-this-check-in-knows';
import { NONE_IS_ASKED_UNTIL_YOU_CONFIRM_IT,THIS_ONE_IS_NOT_ASKED_UNTIL_YOU_CONFIRM_IT, plainQuestionFrom, whatGroundworkWillAsk } from './a-question-asked-word-for-word';

export interface ADumpRead {
  /** What doing well looks like, in the lead's own words. */
  success?: string | null;
  /** The numbers the whole check-in is held to. */
  teamTargets?: { name: string; target?: number | null; notToExceed?: boolean | null }[] | null;
  /** What the lead expects of one named person, and the number that goes with it where there is one. */
  forPeople?: { personName: string; expectation: string; targets?: { name: string; number: number }[] | null }[] | null;
  /** Dates the paste sets, in its own words. Never parsed into a date here. */
  dates?: { what: string; when: string }[] | null;
  /** How this team wins work and what it leads with. */
  strategy?: string[] | null;
  /** How this team has said it works: the rules. */
  waysOfWorking?: string[] | null;
  /** Anything else worth keeping that is not a rule, a decision or an uncertainty. */
  notes?: string[] | null;
  /** What the paste says somebody still has to decide. */
  openDecisions?: string[] | null;
  /** What the paste itself is unsure about, argues with itself about, or says not to treat as settled. */
  notSettled?: string[] | null;
  /** What the lead says about one named person that is not a number or a job: an observation, theirs. */
  aboutPeople?: { personName: string; observation: string }[] | null;
  /** Something somebody is to do. `personName` absent where the paste names no owner. */
  commitments?: { personName?: string | null; action: string; outcome?: string | null; when?: string | null; theySaidIt?: boolean | null }[] | null;
  /** Something the lead wants asked of one person in their own check-in. */
  questionsForPeople?: { personName: string; question: string }[] | null;
  /** Something between two named people, which belongs to neither of them alone. */
  betweenPeople?: { people: string[]; issue: string }[] | null;
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

/** What the lead reads for a question they wrote to themselves. */
export const A_QUESTION_YOU_PUT_TO_YOURSELF = (question: string): string =>
  `You put this question to yourself, so it stays open for you and nobody else is asked it: "${question}"`;

export const A_DUMP_PROMPT = `Somebody running a team check-in has pasted everything they have about it. Read it once and take out only what a check-in keeps.

WHAT DOING WELL LOOKS LIKE. Their own sentence about what would make this period a good one. Take the sentence that says what they want out of it, in their words, not a summary of the whole paste. A rule, an instruction or a slogan off a list is not it: "celebrate revenue not meetings" and "no proposal before qualification" are ways of working, not a picture of a good quarter. Nor is a remark about check-ins, accountability or this product itself - a paste often contains notes addressed to whoever set the check-in up, and none of those say what the work should look like. If no sentence in the paste says what a good period looks like, leave this out.

NUMBERS THE WHOLE TEAM IS HELD TO. A total to reach, a ceiling not to pass. "N180m for Q4" is a target of 180000000. "Credit under 35%" is 35, not to exceed. Take the number they have settled on, not one they are arguing with: "the board wants 200 but I have agreed 180" is 180. A figure the paste says is not approved, not agreed, only a request, a maybe or a guess ("budget N1.2m, not approved yet", "maybe N20m, not sure") is not a number for anybody: leave it out of the numbers and put it under what is not settled. Last quarter's figure, a current figure, an amount somebody owes and a reserve, allowance or contingency in a budget are never targets.

NAME EVERY MEASURE IN WORDS, as a person would read it on a board: "Q4 sales", "credit as a share of sales", "arrears", "new dealers signed". Never put the figure, a currency symbol or a currency letter in the name - "N for Q4" and "N180m" are not names of anything. The number goes in the number field and nowhere else.

WHAT THEY EXPECT OF EACH NAMED PERSON. One entry per person, in the lead's own words, with EVERY number they gave for that person. Some plans give each priority or workstream an owner ("Priority 2. Keep customers. Owner: Tobi Lawal. Complaints under 3 per 100 orders."). The numbers in that priority belong to that owner. Put them on that person and never also in the numbers for the whole team. The expectation is what the priority is ("Keep customers"), never the label that names the owner ("Owner: Tobi Lawal"). Sometimes the paste does not otherwise describe the owner. Still give their name and numbers exactly as written. That way they can be told apart from the team. "I want Dayo at N45m with credit under 35% of his own book" is Dayo, that sentence, and two numbers: Q4 sales 45000000, and credit as a share of his sales 35. "N35m and at least 4 new dealers signed" is two numbers, not one. Their last quarter's figure is not a target: it is what happened. A number inside the description of a job ("tell the top 30 customers", "count 4,200 items", "book two trucks") belongs to that job and is not a number the person is to reach, so do not give it as one.

DATES. What is due and when, in the paste's own words: "quarter ends 31 December", "board meeting 15 January".

HOW THIS TEAM WORKS. The rules and practices the paste lists as how things are done here: "no proposal before qualification", "follow up 48 hours after a demo", "escalate after a week". Take them whether the paste says they are agreed, half-agreed or ignored.

THE STRATEGY. How this team wins work and what it leads with: which customers, which sectors, what to sell on, what to stop doing. "Existing customers and expansion rather than new logos." "Government is slow but sticky." "Lead on fewer surprises, not on the technology."

NOTES. Anything else worth keeping that is not a rule, a decision, an uncertainty or a job for somebody: how the team is feeling, what somebody suggested, an idea for next quarter. Leave out anything that is only about one person - that goes in the section below.

EVERY LINE IN THOSE FOUR LISTS IS ONE SHORT PLAIN SENTENCE, twelve words or fewer, in the words the team would use. The paste is somebody thinking out loud: "dont sell AI lol sell knowing whats happening / fewer surprises / better decisions" is read back as "Sell fewer surprises and better decisions, not the technology". Keep the meaning and every specific - a name, a place, a number - and drop the aside, the swearing and the thinking-out-loud. Never invent a specific that is not there.

WHAT IS STILL TO DECIDE. Anything the paste says needs deciding and has not been: "whether the target stays at 12m", "whether the 30-day rule is official". One plain, full sentence each, written as a decision, not as a task.

WHAT IS NOT SETTLED. Anything the paste contradicts itself about, is unsure of, or says explicitly not to treat as fact or as a target: two numbers for the same thing, a figure somebody mentioned but nobody approved, a task nobody knows is finished. Say the competing versions where the paste gives both.

WHAT IS TO BE DONE. Every action the paste names: a proposal to send, a call somebody has to make, a list to clean, a thing to finish. One entry each, in the paste's words. A task listed under a person's name or under a workstream that person owns ("Ibrahim: racking installed by 24 October, power backup tested by 31 October") is one entry for each task, with that person as the owner and its own date. An action for somebody who is clearly not part of this team, such as a customer paying a bill or a supplier delivering, is not an action for this team: leave it out of this list and put it under notes. Give the person ONLY where the paste says whose it is - most of a list of outstanding things has no owner, and leaving the owner out is the correct answer, never the nearest name. Give the timing only where the paste gives one, in its own words ("this week", "friday", "before Thursday"). Say whether the person said it themselves ("she said she would do it this week") or the lead is the one saying it needs doing.

QUESTIONS THE LEAD WANTS ASKED. Where the paste writes a question for a named person - "Amina - which accounts actually have a buying process?" - take the person and the question as written. A sentence that ends in a question mark and is addressed to a named person, even when the same person is also talked about earlier in the paste, is such a question. A question the person running the check-in puts to themselves ("I need to decide whether the Kisumu contract is worth keeping", "Do I move Brian onto retail?") is also taken, with personName "the lead", in the writer's own words as a question; it is theirs to think about and nobody else is asked.

WHAT IS BETWEEN TWO PEOPLE. Where the paste describes something that involves two named people and belongs to neither alone - one promised what the other cannot build, one commits dates the other has to keep - name both people and say the thing in the paste's words.

WHAT THEY SAY ABOUT EACH PERSON THAT IS NOT A NUMBER OR A JOB. The lead's read of somebody: how they work, what they are good at, what they keep doing. One entry per person, their words. This is an observation, never a fact about the person, and it is kept where only the lead can read it.

Never write "I", "me" or "my" in a line you write: the team reads these lines, so say the person's name, or "the lead" where the paste does not give it. Give names and wording exactly as the paste writes them. Do not correct them, expand them, or match them to anybody. Leave out anything that is an opinion about a person rather than a number or a job for them - that belongs somewhere else and not here. An empty field is a correct answer.`;

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
      waysOfWorking: { type: 'array', description: 'How this team works. One short plain sentence each.', items: { type: 'string' } },
      strategy: { type: 'array', description: 'How this team wins work and what it leads with. One short plain sentence each.', items: { type: 'string' } },
      notes: { type: 'array', description: 'Anything else worth keeping that is not a rule, a decision, an uncertainty or a job. One short plain sentence each.', items: { type: 'string' } },
      openDecisions: { type: 'array', description: 'What still has to be decided, one plain, full sentence each.', items: { type: 'string' } },
      notSettled: { type: 'array', description: 'What the paste contradicts itself about or says not to treat as fact. Give both versions where it gives both.', items: { type: 'string' } },
      aboutPeople: {
        type: 'array',
        description: "The lead's read of one person, where it is not a number or a job for them.",
        items: { type: 'object', properties: { personName: { type: 'string' }, observation: { type: 'string' } }, required: ['personName', 'observation'] },
      },
      commitments: {
        type: 'array',
        description: 'Every action the paste names. Person only where the paste says whose it is.',
        items: {
          type: 'object',
          properties: {
            personName: { type: ['string', 'null'], description: 'Whose it is, exactly as the paste writes the name. Null where the paste does not say.' },
            action: { type: 'string' },
            outcome: { type: ['string', 'null'], description: 'What it is for, where the paste says.' },
            when: { type: ['string', 'null'], description: "The timing in the paste's own words." },
            theySaidIt: { type: ['boolean', 'null'], description: 'True where the person said they would; false where the lead says it needs doing.' },
          },
          required: ['action'],
        },
      },
      questionsForPeople: {
        type: 'array',
        description: 'A question the paste writes for one named person, or one the writer puts to themselves (personName "the lead").',
        items: { type: 'object', properties: { personName: { type: 'string' }, question: { type: 'string' } }, required: ['personName', 'question'] },
      },
      betweenPeople: {
        type: 'array',
        description: 'Something involving two named people that belongs to neither alone.',
        items: { type: 'object', properties: { people: { type: 'array', items: { type: 'string' } }, issue: { type: 'string' } }, required: ['people', 'issue'] },
      },
    },
    required: [],
  },
} as const;

const fmt = (n: number): string =>
  Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m` : Math.abs(n) >= 1e3 ? n.toLocaleString('en-GB') : String(n);

export interface WhatAPasteGives {
  success: string | null;
  /**
   * `direction` is what the lead said yes to (decision 69), read back off the list they answered by
   * `theDirectionsInTheList`. Absent or null until then: the list only suggests one.
   */
  teamTargets: { name: string; target: number | null; notToExceed: boolean; direction?: TargetDirection | null }[];
  forPeople: { who: string; participantId: string; expectation: string; targets: { name: string; number: number }[] }[];
  dates: { what: string; when: string }[];
  unmatched: string[];
  /** What the paste said for each name that is not on this check-in, keyed by that name. Said, never kept. */
  unmatchedParts?: Record<string, string[]>;
  /** The lists that are words rather than numbers, each one a bucket on the Context page. */
  waysOfWorking: string[];
  strategy: string[];
  notes: string[];
  openDecisions: string[];
  notSettled: string[];
  /** The lead's read of one person, kept where only the lead reads it. */
  aboutPeople: { who: string; participantId: string; observation: string }[];
  /** Actions. `participantId` is null where the paste named no owner, which is left as it is. */
  commitments: { who: string | null; participantId: string | null; action: string; outcome: string | null; when: string | null; theySaidIt: boolean }[];
  /**
   * A question the lead wants put to one person, in their own check-in. `question` is the lead's own
   * shorthand; `exactQuestion` is the sentence Groundwork will ask, word for word, once the lead has
   * confirmed it. See a-question-asked-word-for-word.
   */
  questionsForPeople: { who: string; participantId: string; question: string; exactQuestion?: string | null }[];
  /** Something between two of them, which is neither person's alone. */
  betweenPeople: { who: string[]; participantIds: string[]; issue: string }[];
  /**
   * The sentence participants will be told this check-in is for. Offered in the say-back, and carried
   * back from that list by the yes: if the list did not show it, it is absent and nothing is written.
   */
  toldToParticipants?: string | null;
}

/**
 * THE PRODUCT'S OWN LIST OF WHAT IT TOOK, ENDING IN A YES OR NO.
 *
 * `asking` is the chat's version. A page states what is on record; a chat is asking for a yes, and
 * the difference is one line. Every number is shown as it will be written, so the lead is checking
 * the thing itself rather than a description of it.
 */
/**
 * WHO WILL READ A LINE, SAID IN ONE SENTENCE, FROM THE SAME RULE THAT SAVES IT.
 *
 * The writer (`writeWhatThePasteGave`) saves a line as lead-only when its kind is about somebody
 * (`ABOUT_SOMEBODY`) and as everyone's otherwise. The say-back and the confirmation read the same
 * rule here, so a sentence can never say "kept for you" over a line that everyone will read
 * (screens request 92, point 1).
 */
export function whoWillReadThese(kind: ContextItemKind): string {
  return ABOUT_SOMEBODY.has(kind) ? 'Only you will see these.' : 'Everyone on this check-in will see these.';
}

/** The two lines that say what the people taking part will be told this check-in is for. */
export const WHAT_PEOPLE_ARE_TOLD_OPENS = 'When you say yes, people taking part will be told this about the check-in.';
export const WHAT_PEOPLE_WERE_TOLD_OPENS = 'People taking part have now been told this about the check-in.';

/** The sentence a say-back offered for what participants are told, or null where it offered none. */
export function theTellingInTheList(history: { role: 'user' | 'assistant'; content: string }[] | null | undefined): string | null {
  const lastAssistant = [...(history ?? [])].reverse().find((t) => t.role === 'assistant')?.content ?? '';
  if (!lastAssistant.trim().startsWith(THE_LIST_OPENS_WITH)) return null;
  const at = lastAssistant.indexOf(WHAT_PEOPLE_ARE_TOLD_OPENS);
  if (at < 0) return null;
  const next = lastAssistant.slice(at + WHAT_PEOPLE_ARE_TOLD_OPENS.length).replace(/^\s*\n/, '').split('\n')[0] ?? '';
  const told = next.trim().replace(/^[“"]\s*/, '').replace(/\s*[”"]$/, '').trim();
  return told || null;
}

/**
 * A DATE THE PASTE NAMED, AS ONE PLAIN SENTENCE, FOR THE RECORD.
 *
 * Dates used to be said back and then dropped ("they stay in this conversation and are not put on the
 * record"), so a quarter's end, a board meeting or a start date was lost the moment the lead said yes.
 * They are kept as notes the whole check-in can read. The date is written exactly as the paste wrote
 * it, never turned into another form.
 *
 * A date that only repeats the timing of a job somebody is down as doing is not kept twice: the job
 * already carries it.
 */
const A_DAY = /^(?:\d|mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|the \d)/i;
const A_WORD_FOR_WHEN = /^(?:by|on|before|until|till|from|at|in|after|during|every|within|for|since|between|this|next|end|start|mid|early|late)\b/i;
/*
 * A MONTH, A QUARTER AND A VAGUE TIME ARE NOT A DAY. "Tunde Afolabi is joining on November." read as if
 * November were a day. A day (a date, a weekday) takes "on"; a month, a year or a quarter takes "in"
 * ("in November", "in Q4"); "mid-November" and "early November" take "in"; "the end of the month" takes
 * "at". "Next week", "tomorrow" and "this Friday" stand on their own. Nothing is rewritten: the words
 * the plan used are the words that stay.
 */
const A_MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const JUST_A_MONTH = new RegExp(`^(?:(?:early|mid|late|the (?:start|middle|end) of)[\\s-]+)?${A_MONTH}(?:\\s+\\d{4})?$`, 'i');
const A_QUARTER = /^(?:q[1-4]|(?:the )?(?:first|second|third|fourth|last) quarter)(?:\s+(?:of\s+)?\d{4})?$/i;
const A_YEAR = /^\d{4}$/;
const STANDS_ALONE = /^(?:tomorrow|today|tonight|yesterday|next|this)\b/i;
function joinedToWhat(w: string, t: string): string {
  if (STANDS_ALONE.test(t)) return `${w} ${t}`;
  if (/^(?:the )?end of\b/i.test(t) || /^end of\b/i.test(t)) return `${w} at ${/^the /i.test(t) ? '' : 'the '}${t}`;
  if (JUST_A_MONTH.test(t) || A_QUARTER.test(t) || A_YEAR.test(t)) return `${w} in ${t}`;
  if (/^(?:early|mid|late)[\s-]/i.test(t)) return `${w} in ${t}`;
  if (A_WORD_FOR_WHEN.test(t)) return `${w} ${t}`;
  return A_DAY.test(t) ? `${w} on ${t}` : `${w}, ${t}`;
}
export function aDateSaid(what: string, when: string): string {
  const w = what.trim().replace(/[.:;,\s]+$/, '');
  const t = when.trim().replace(/[.:;,\s]+$/, '');
  if (!w) return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
  const joined = joinedToWhat(w, t);
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}
export function theDatesToKeep(got: Pick<WhatAPasteGives, 'dates' | 'commitments'>): string[] {
  const out: string[] = [];
  for (const d of got.dates ?? []) {
    const covered = (got.commitments ?? []).some((c) => c.when && theSameMeasure(c.when, d.when) && (theSameMeasure(c.action, d.what) || wordsOf(d.what).some((w) => wordsOf(c.action).includes(w) && w.length > 4)));
    if (covered) continue;
    const line = aDateSaid(d.what, d.when);
    if (!out.some((o) => theSameMeasure(o, line))) out.push(line);
  }
  return out;
}

export function whatWeTookFromThat(
  got: WhatAPasteGives,
  opts: { asking?: boolean; told?: string | null; /** Who is reading it: a line about them says "you". */ reader?: { participantId?: string | null } | null } = {},
): string | null {
  /* The reader is "you" in a sentence the product writes, never their own name. */
  const called = (who: string | null, participantId?: string | null): string | null =>
    opts.reader?.participantId && participantId && participantId === opts.reader.participantId ? 'You' : who;
  const anything = got.success || got.teamTargets.length || got.forPeople.length || got.dates.length || got.unmatched.length
    || got.waysOfWorking?.length || got.openDecisions?.length || got.notSettled?.length || got.aboutPeople?.length
    || got.commitments?.length || got.questionsForPeople?.length || got.betweenPeople?.length
    || got.strategy?.length || got.notes?.length;
  if (!anything) return null;
  const lines: string[] = ['Here is what I took from that.'];
  if (got.success) lines.push('', `What doing well looks like is "${got.success}".`);
  if (got.teamTargets.length) {
    lines.push('', 'These are for the whole check-in.');
    for (const t of got.teamTargets) {
      /* Decision 69: asking, each number says which way it goes, so the yes confirms it. Once recorded,
         only a direction the lead said yes to is said. */
      const way = theWayThisNumberGoes(t, !!opts.asking);
      lines.push(`- ${t.name}${t.target != null ? `: ${fmt(t.target)}${way ? `, ${theListsWordsFor(way)}` : ''}` : ', tracked rather than counted'}`);
    }
    /* Asking, the five kinds are offered in plain words, so a yes is a yes to each kind (decision 75, item 17). */
    if (opts.asking && got.teamTargets.some((t) => t.target != null)) lines.push(`${THE_FIVE_KINDS_SAID} You can change the kind of any number on the board.`);
  }
  if (got.forPeople.length) {
    lines.push('', 'This is what you expect of each person, in your words. It is marked as yours, and they have not seen it yet.');
    /* One line per person, carrying every number of theirs: two numbers read as the same sentence twice. */
    for (const p of got.forPeople) {
      const numbers = p.targets.map((t) => `${t.name}: ${fmt(t.number)}`);
      lines.push(`- ${called(p.who, p.participantId)}: "${p.expectation}"${numbers.length ? ` (${numbers.join('; ')})` : ''}`);
    }
  }
  const dates = theDatesToKeep(got);
  if (dates.length) {
    lines.push('', `These are the dates you named. ${whoWillReadThese(ContextItemKind.NOTE)}`);
    for (const d of dates) lines.push(`- ${d}`);
  }
  if (got.strategy?.length) {
    lines.push('', `The strategy, as I read it. ${whoWillReadThese(ContextItemKind.STRATEGY)}`);
    for (const w of got.strategy) lines.push(`- ${w}`);
  }
  if (got.waysOfWorking?.length) {
    lines.push('', `How this team works, said as yours rather than as anything agreed. ${whoWillReadThese(ContextItemKind.WAY_OF_WORKING)}`);
    for (const w of got.waysOfWorking) lines.push(`- ${w}`);
  }
  if (got.notes?.length) {
    lines.push('', `Notes, kept as they are. ${whoWillReadThese(ContextItemKind.NOTE)}`);
    for (const w of got.notes) lines.push(`- ${w}`);
  }
  if (got.openDecisions?.length) {
    lines.push('', `Still to decide. ${whoWillReadThese(ContextItemKind.DECISION)}`);
    for (const d of got.openDecisions) lines.push(`- ${d}`);
  }
  if (got.notSettled?.length) {
    lines.push('', `Not settled, so nothing here is treated as a fact or a target. ${whoWillReadThese(ContextItemKind.UNSETTLED)}`);
    for (const n of got.notSettled) lines.push(`- ${n}`);
  }
  if (got.aboutPeople?.length) {
    lines.push('', `What you said about each person that is not a number. ${whoWillReadThese(ContextItemKind.ABOUT_A_PERSON)} They are never quoted to the person or in a report.`);
    for (const a of got.aboutPeople) lines.push(`- ${called(a.who, a.participantId)}: "${a.observation}"`);
  }
  if (got.commitments?.length) {
    const owned = got.commitments.filter((c) => c.participantId);
    const nobodys = got.commitments.filter((c) => !c.participantId);
    if (owned.length) {
      lines.push('', 'This is what people are down as doing. Nobody is marked as having done or not done any of it until they say.');
      for (const c of owned) lines.push(`- ${called(c.who, c.participantId)}: ${c.action}${c.when ? ` (${c.when})` : ''}${c.theySaidIt ? '' : ' - your words, not theirs'}`);
    }
    if (nobodys.length) {
      lines.push('', `${nobodys.length === 1 ? 'One thing has no owner. It is kept as it is' : `${nobodys.length} things have no owner. They are kept as they are`}, and not put on the nearest person.`);
      for (const c of nobodys) lines.push(`- ${c.action}${c.when ? ` (${c.when})` : ''}`);
    }
  }
  /*
   * EACH QUESTION AS IT WILL BE ASKED, WORD FOR WORD, AND CONFIRMED ON ITS OWN. Decision 34: this list
   * used to say "asked in their own words", and nobody had read what the person would actually be
   * asked. The yes to this list keeps them; it does not send them.
   */
  if (got.questionsForPeople?.length) {
    const one = got.questionsForPeople.length === 1;
    lines.push('', one ? 'A question you want asked, exactly as Groundwork will ask it.' : 'Questions you want asked, each one exactly as Groundwork will ask it.');
    for (const q of got.questionsForPeople) {
      const thatQuestion = q.exactQuestion?.trim() || plainQuestionFrom(q.question, q.who);
      /* A question the lead put to themselves is said as theirs, and nobody else is asked it. */
      lines.push(opts.reader?.participantId && q.participantId === opts.reader.participantId
        ? `- ${A_QUESTION_YOU_PUT_TO_YOURSELF(thatQuestion)}`
        : `- ${whatGroundworkWillAsk(q.who, thatQuestion)}`);
    }
    lines.push(one ? THIS_ONE_IS_NOT_ASKED_UNTIL_YOU_CONFIRM_IT : NONE_IS_ASKED_UNTIL_YOU_CONFIRM_IT);
  }
  if (got.betweenPeople?.length) {
    lines.push('', `Between two people, so it sits with neither of them alone. ${whoWillReadThese(ContextItemKind.BETWEEN_PEOPLE)} It is never quoted to either of them.`);
    for (const b of got.betweenPeople) lines.push(`- ${b.who.join(' and ')}: ${b.issue}`);
  }
  if (got.unmatched.length) {
    lines.push('', got.unmatched.length === 1
      ? 'One name is not on this check-in, so nothing is saved for them yet. If you add them and send this again, I will put their part on too.'
      : `${got.unmatched.length} names are not on this check-in, so nothing is saved for them yet. If you add them and send this again, I will put their part on too.`);
    for (const name of got.unmatched) {
      const parts = got.unmatchedParts?.[name] ?? [];
      lines.push(parts.length ? `- ${name} (${parts.join('; ')})` : `- ${name}`);
    }
  }
  /*
   * AND WHAT THE PASTE DID NOT SETTLE, SAID OUT LOUD.
   *
   * Her list, 22 September 2026: "say what the paste left open - items with no owner, people with no
   * number, no success sentence". The product knew all three and said none of them, so a lead read a
   * long confident list and could not see what was still missing from it.
   */
  if (opts.told) {
    lines.push('', opts.asking ? WHAT_PEOPLE_ARE_TOLD_OPENS : WHAT_PEOPLE_WERE_TOLD_OPENS, `“${opts.told}”`);
  }
  const open: string[] = [];
  if (!got.success) open.push('Nothing in it says what doing well looks like, so nothing is set as the yardstick.');
  const noOwner = (got.commitments ?? []).filter((c) => !c.participantId).length;
  if (noOwner) open.push(noOwner === 1 ? "One thing to do has nobody's name on it." : `${noOwner} things to do have nobody's name on them.`);
  const withoutANumber = (got.forPeople ?? []).filter((p) => !p.targets.length).map((p) => p.who);
  if (withoutANumber.length) open.push(`${withoutANumber.join(', ')} ${withoutANumber.length === 1 ? 'has' : 'have'} something expected of them and no number to measure it by.`);
  if (open.length) {
    lines.push('', `Some things are still not settled. ${open.join(' ')}`);
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

/**
 * WHICH WAY ONE OF THE TEAM'S NUMBERS GOES, AS THE LIST SAYS IT (decision 69).
 *
 * Asking: what the lead said yes to before, or else the suggestion, a limit where the paste said "not
 * to exceed" or the name's words say so, and an aim otherwise. Recorded: only what was said yes to.
 */
export function theWayThisNumberGoes(t: { name: string; target: number | null; notToExceed?: boolean; direction?: TargetDirection | null }, asking: boolean): TargetDirection | null {
  if (t.target == null) return null;
  if (t.direction) return t.direction;
  if (!asking) return null;
  return t.notToExceed ? 'LIMIT' : whatTheWordsSuggest(t.name, t.target);
}

/**
 * THE DIRECTIONS THE LEAD SAID YES TO, READ OFF THE LIST THEY ANSWERED (decision 69).
 *
 * A yes re-reads the paste, and a second reading can come back with a different "not to exceed" from
 * the first. What the lead agreed to is what the list in front of them said, so it is read from there,
 * the same way `theTellingInTheList` reads what participants are told. Keyed on the name, flattened.
 */
export function theDirectionsInTheList(history: { role: 'user' | 'assistant'; content: string }[] | null | undefined): Map<string, TargetDirection> {
  const out = new Map<string, TargetDirection>();
  const lastAssistant = [...(history ?? [])].reverse().find((t) => t.role === 'assistant')?.content ?? '';
  if (!lastAssistant.trim().startsWith(THE_LIST_OPENS_WITH)) return out;
  for (const line of lastAssistant.split('\n')) {
    const m = line.match(/^-\s+(.+):\s+[^:]+,\s+(an aim to reach|a limit not to go over)\s*$/);
    if (!m) continue;
    out.set(aNameKey(m[1]), m[2] === A_LIMIT_NOT_TO_GO_OVER ? 'LIMIT' : 'AIM');
  }
  return out;
}

/** A target's name as the list and the yes compare it: lower case, one space, no end stop. */
export function aNameKey(name: string): string {
  return (name ?? '').toLowerCase().replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
}

/** Their answer to "Record all of this?", with nothing else in it. Anything longer is a new instruction. */
const A_PLAIN_YES = /^(yes|yep|yeah|yup|ok|okay|sure|go ahead|do it|please do|confirm(ed)?|record (it|that|all of (it|that|this))|save (it|that)|take (it|that|the rest)|all of it|that is right|correct)\b[\s\S]{0,60}$/i;

/*
 * A YES WITH ONE THING TAKEN OUT OF IT.
 *
 * Her list, 22 September 2026: "yes, but 12m is not agreed" should take the rest and leave that.
 * Today the yes is all or nothing, so a lead with one objection either re-pastes the whole thing or
 * accepts a number they have just said is not agreed.
 *
 * The exception has to be matched to something in the list, and where it cannot be, nothing is
 * written and the chat asks which one they mean. Guessing which line "not the pipeline one" refers
 * to would be the product deciding what the lead agreed to.
 */
const A_YES_WITH_AN_EXCEPTION =
  /^(?:yes|yep|yeah|ok|okay|sure|record (?:it|that|all of (?:it|that|this))|save (?:it|that)|take (?:it|that))\b[\s,.]*(?:but|except|apart from|other than|just not|not the|minus|without)\s+([\s\S]{2,120})$/i;

export interface AYesWithAnException {
  /** What they said to leave out, in their words. */
  notThis: string;
}

/** The exception in a "yes, but not X", or null where the yes is plain. */
export function whatTheYesLeavesOut(said: string | null | undefined): AYesWithAnException | null {
  const t = (said ?? '').trim().replace(/\s+/g, ' ');
  const m = A_YES_WITH_AN_EXCEPTION.exec(t);
  if (!m) return null;
  /* "yes, but not the 12m" - the words that only mean "leave it out" are not part of what to leave out. */
  const notThis = (m[1] ?? '').trim()
    .replace(/^(?:not|just|only|also|for)\s+/i, '')
    .replace(/^the\s+/i, '')
    .replace(/[.?!]+$/, '')
    .trim();
  return notThis ? { notThis } : null;
}

/**
 * What the exception matches in the list, so a lead is told what will be left out before it is.
 *
 * Matched on words and on numbers as they are written - "12m" against a target of 12000000 - because
 * a lead objects in the words of the paste, not in the words of the record.
 */
export function whatThatLeavesOut(got: WhatAPasteGives, notThis: string): { teamTargets: string[]; people: string[]; commitments: string[] } {
  const said = notThis.toLowerCase();
  const asWritten = (n: number | null | undefined): string[] => {
    if (n == null) return [];
    const out = [String(n)];
    if (n >= 1e6) out.push(`${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m`);
    if (n >= 1e3) out.push(`${+(n / 1e3).toFixed(n % 1e3 ? 1 : 0)}k`, n.toLocaleString('en-GB'));
    return out;
  };
  const hits = (text: string, numbers: (number | null | undefined)[]): boolean => {
    const words = text.toLowerCase();
    if (said.length > 3 && words.includes(said)) return true;
    const saidWords = said.split(/[^a-z0-9.]+/).filter((w) => w.length > 3);
    if (saidWords.length && saidWords.every((w) => words.includes(w))) return true;
    return numbers.some((n) => asWritten(n).some((form) => said.includes(form.toLowerCase())));
  };
  return {
    teamTargets: got.teamTargets.filter((t) => hits(t.name, [t.target])).map((t) => t.name),
    people: got.forPeople.filter((p) => hits(`${p.who} ${p.expectation}`, p.targets.map((t) => t.number))).map((p) => p.who),
    commitments: (got.commitments ?? []).filter((c) => hits(`${c.who ?? ''} ${c.action}`, [])).map((c) => c.action),
  };
}

/** The same paste with what the lead objected to taken out of it. */
export function withoutWhatTheyLeftOut(got: WhatAPasteGives, leaves: { teamTargets: string[]; people: string[]; commitments: string[] }): WhatAPasteGives {
  return {
    ...got,
    teamTargets: got.teamTargets.filter((t) => !leaves.teamTargets.includes(t.name)),
    forPeople: got.forPeople.filter((p) => !leaves.people.includes(p.who)),
    commitments: (got.commitments ?? []).filter((c) => !leaves.commitments.includes(c.action)),
  };
}

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
/*
 * AND A REMARK ABOUT THIS PRODUCT IS NOT A PICTURE OF THE WORK EITHER.
 *
 * Third read of the same paste, 22 September 2026: "everyone says they want accountability but then
 * accountability becomes 'did you do your task' rather than 'did we achieve the thing'" was written
 * to the baseline as what doing well looks like. It is her sentence about what this product should
 * catch - a note to us, in a paste addressed to us - and it is not what a good quarter looks like
 * for a sales and delivery team.
 */
const ABOUT_THE_PRODUCT_OR_THE_TALKING =
  /\b(groundwork|check-?ins?|the product|the tool|accountability|everyone says|people say|people keep saying|we keep saying|this exercise|need .{0,20}to catch)\b/i;

const A_RULE_RATHER_THAN_A_PICTURE =
  /^(?:no |never |always |dont |don't |do not |stop |start |keep |celebrate |avoid |need |needs |escalate |follow up|one owner|monday|friday|sell |ask |call |send |get |make |build |measure |track |use |aim |push |move |focus |package )/i;

/*
 * A SLASH LIST IS A NOTE TO SELF, NOT A SENTENCE.
 *
 * Fourth read of the same paste: "sell knowing whats happening / fewer surprises / better decisions"
 * went to the baseline. It is how she talks about positioning, jotted with slashes, and no team's
 * quarter is measured against it.
 */
const A_LIST_WITH_SLASHES = (t: string): boolean => (t.match(/\s\/\s/g) ?? []).length >= 2;

/** What doing well looks like, or null where the paste only had rules and slogans. */
/**
 * AND THE SAME BAR FOR A DEFINITION THE EXTRACTOR PRODUCED, MINUS ONE TEST.
 *
 * `aSuccessStatementHolds` was written for a lead PASTING a statement about their team, so it
 * refuses anything mentioning the product - meaning ours. Applied to what a person says in their
 * own check-in that test is wrong: "I know the product well enough to demo it alone" is a real
 * definition of success and the product in it is theirs.
 *
 * What is left is the part that was actually needed. Read on a live board, 23 September 2026:
 * "horticulture", "sales records", "Yield too" printed as nine people's definitions of success.
 * Those are answer fragments. A definition is at least a phrase, is not an instruction, and is not
 * a slash list.
 *
 * Remarks about the product are handled properly now and structurally, at the read - see
 * a-remark-about-the-tool-is-not-the-work - so this does not need to guess at them.
 */
export function aDefinitionOfSuccessHolds(text: string | null | undefined): string | null {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return null;
  /*
   * LENGTH OR A COUNTABLE, NOT LENGTH ALONE.
   *
   * "Fifteen meetings a month" is four words and one of the best definitions of success anybody
   * gives. A six-word floor threw it away, which would have been a worse bug than the one this is
   * fixing: a real standard silently missing from a report. A number in it is enough on its own -
   * it is what makes a definition checkable - and none of the fragments this exists to stop have
   * one: "horticulture", "sales records", "Yield too".
   */
  const carriesACountable = /\d/.test(t) || /\b(fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|half|double|triple|ten|eleven|twelve)\b/i.test(t);
  /*
   * AND A SHORT DEFINITION THAT DESCRIBES A STATE OF AFFAIRS IS STILL A DEFINITION.
   *
   * "Getting to quota." is three words with no number in it and it is somebody's own account of
   * what good looks like. What it has that a fragment does not is a verb - it describes a state
   * rather than naming a thing. That is the actual difference between it and "horticulture",
   * "sales records" and "Yield too", which is what this exists to stop.
   */
  const describesAState = /\b\w+ing\b/i.test(t)
    || /\b(is|are|was|were|be|been|being|have|has|had|get|got|gets|keep|keeps|kept|reach|reaches|reached|hit|hits|close|closed|closes|know|knows|able|not|no longer|without)\b/i.test(t);
  if (!carriesACountable && !describesAState && t.split(' ').length < FEW_ENOUGH_WORDS_TO_BE_A_SLOGAN) return null;
  if (A_RULE_RATHER_THAN_A_PICTURE.test(t)) return null;
  if (A_LIST_WITH_SLASHES(t)) return null;
  return t;
}

export function aSuccessStatementHolds(text: string | null | undefined): string | null {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return null;
  if (t.split(' ').length < FEW_ENOUGH_WORDS_TO_BE_A_SLOGAN) return null;
  if (A_RULE_RATHER_THAN_A_PICTURE.test(t)) return null;
  if (ABOUT_THE_PRODUCT_OR_THE_TALKING.test(t)) return null;
  if (A_LIST_WITH_SLASHES(t)) return null;
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

/**
 * A NUMBER THE MODEL GAVE, AS THE PASTE WROTE IT.
 *
 * Found on the quarterly plan (4 October 2026): "late deliveries under 5%" came back as 0.05, was
 * rounded to a whole number, and was stored as a limit of 0. A fraction under one is a percentage the
 * model wrote as a fraction only where the paste really says that percentage ("5%"); otherwise it
 * cannot be known what was meant, and no number is kept (the line is then tracked rather than counted,
 * as it says). Whole numbers are rounded as they always were.
 */
export function theNumberAsWritten(n: number | null | undefined, pasted: string): number | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  if (n >= 1) return Math.round(n);
  const pct = Math.round(n * 100);
  if (pct < 1) return null;
  return new RegExp(`(?:^|[^\\d.])${pct}(?:\\.0+)?\\s?(?:%|percent|per cent)`, 'i').test(pasted ?? '') ? pct : null;
}

/** Whether these two names are made of the same words, whatever the order. Stricter than theSameMeasure, which lets one name sit inside another. */
export function theSameWords(a: string, b: string): boolean {
  const x = [...new Set(wordsOf(a))].sort();
  const y = [...new Set(wordsOf(b))].sort();
  return x.length > 0 && x.length === y.length && x.every((w, i) => w === y[i]);
}

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

export const ASK_THEM_THIS_OPENS = 'Ask them this:';
export const BETWEEN_THEM_OPENS = 'Between';
