import { whatTheWordsSuggest, theQuestionAboutWhichWay, type TargetDirection } from '../board/an-aim-or-a-limit';
import { plainQuestionFrom, whatGroundworkWillAsk, THIS_ONE_IS_NOT_ASKED_UNTIL_YOU_CONFIRM_IT } from './a-question-asked-word-for-word';
import { aDateSaid } from './a-dump-is-many-things';
/**
 * A PLAN IS MANY PROPOSALS, EACH CONFIRMED ON ITS OWN (week 13, screens request 6a).
 *
 * The Context page's "From a plan" promises "Groundwork will propose the goals, roles and
 * commitments in it for you to check one by one", and "Nothing is added until you confirm it".
 * The paste path (a-dump-is-many-things) reads a paste into ONE proposal with one yes. This reads a
 * plan into separate proposals - one goal, one role, one commitment, one rule each - and writes
 * nothing. Decision 12: a request is said back and confirmed before anything happens.
 *
 * THE MODEL READS; THE CODE CHECKS. Every proposal carries the exact words it came from, and the
 * code throws away any proposal whose words are not really in the plan, or whose number or date is
 * not in those words. A dropped proposal costs the lead one line typed by hand; an invented one
 * costs them a target nobody set. Dates are kept exactly as the plan wrote them, never parsed.
 *
 * A name nobody on the check-in has is kept, and said out loud, never guessed onto somebody else.
 */

export type PlanProposalKind = 'goal' | 'role' | 'commitment' | 'rule' | 'question' | 'decision' | 'date';

/** What the model returns for one thing in the plan, before any of it is believed. */
export interface PlanRead {
  kind?: string | null;
  says?: string | null;
  fromThePlan?: string | null;
  personName?: string | null;
  what?: string | null;
  number?: number | null;
  date?: string | null;
}

export interface PlanProposalFields {
  /** The person it is about, as the plan names them. Absent for the whole team, or a rule. */
  personName?: string;
  /** The participant it is about, when the name is somebody on this check-in. Never guessed. */
  participantId?: string;
  /** Their name as this check-in knows them, when they are on it. */
  personOnTheCheckIn?: string;
  /** The measure (goal), what they own (role), what is to be done (commitment), or the rule. */
  what: string;
  /** The number, only where the plan's own words hold it. */
  number?: number;
  /** The date, exactly as the plan wrote it. */
  date?: string;
}

export interface PlanProposal {
  /** A stable id for this proposal in this plan, so the page can confirm or put off one of them. */
  id: string;
  kind: PlanProposalKind;
  /** One plain full sentence the lead reads, and the line that is kept once it is confirmed. */
  says: string;
  fields: PlanProposalFields;
  /** The exact words in the plan this came from. */
  fromThePlan: string;
  /** The card's first sentence, in the prototype's form. */
  heading: string;
  /** A plain place name for where it would go. */
  landsIn: string;
  /** Where it came from: the file's name, or "the plan you pasted". */
  from: string;
  /** Said when a name in it is not on this check-in. */
  note?: string;
  /* The shape agreed in request 6: `line` is the line to keep, `saidAs` the lead's own words. */
  line: string;
  saidAs: string;
  /**
   * A GOAL WITH A NUMBER: AN AIM TO REACH, OR A LIMIT NOT TO GO OVER (decision 69). `whichWay` is the
   * question the card asks the lead, `directionSuggested` what the plan's words suggest. Nothing is
   * stored from either: the confirm sends the lead's answer as `direction`, and without it the target
   * is saved with no direction set. Absent on everything else.
   */
  whichWay?: string;
  directionSuggested?: TargetDirection;
}

export interface SomebodyNamed {
  id: string;
  name: string;
}

const KINDS: PlanProposalKind[] = ['goal', 'role', 'commitment', 'rule', 'question', 'decision', 'date'];

const LANDS_IN: Record<PlanProposalKind, string> = {
  goal: 'Targets',
  role: 'People and roles',
  commitment: 'Commitments',
  rule: 'How we work',
  question: 'Questions you want asked',
  decision: 'Still to decide',
  date: 'Notes',
};

const A_KIND: Record<PlanProposalKind, string> = {
  goal: 'A goal',
  role: 'A role',
  commitment: 'A commitment',
  rule: 'A rule',
  question: 'A question',
  decision: 'A decision',
  date: 'A date',
};

/** Lower case, one space, straight quotes and dashes, so a quote copied with curly quotes still matches. */
export function flatten(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100,
};

/**
 * Every number the words hold: "45,000", "N45m" (45 and 45000000), "3.5k", "twenty-five".
 * Read generously on purpose - this decides whether a number was said, and missing one only drops
 * a proposal, never invents one.
 */
export function numbersIn(text: string): Set<number> {
  const out = new Set<number>();
  const t = flatten(text);
  for (const m of t.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(k|m|bn|b|million|billion|thousand)?\b/g)) {
    const n = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    out.add(n);
    const unit = m[2];
    if (unit === 'k' || unit === 'thousand') out.add(Math.round(n * 1_000));
    if (unit === 'm' || unit === 'million') out.add(Math.round(n * 1_000_000));
    if (unit === 'b' || unit === 'bn' || unit === 'billion') out.add(Math.round(n * 1_000_000_000));
  }
  for (const m of t.matchAll(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[- ](one|two|three|four|five|six|seven|eight|nine)\b/g)) {
    out.add(WORD_NUMBERS[m[1]] + WORD_NUMBERS[m[2]]);
  }
  for (const [w, n] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) out.add(n);
  }
  return out;
}

/** The numbers written as figures in a sentence, which is what the lead would read as a claim. */
function figuresIn(text: string): number[] {
  return [...flatten(text).matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, ''))).filter(Number.isFinite);
}

export const NOT_ON_THIS_CHECK_IN = (name: string, kind: PlanProposalKind) =>
  kind === 'goal'
    ? `One name in it, ${name}, is not on this check-in. Add them, and their numbers will go on too.`
    : `One name in it, ${name}, is not on this check-in. Add them, and this will go on too.`;

/** The sentence the code writes when the model's own sentence cannot be trusted. */
export function sentenceFor(kind: PlanProposalKind, f: PlanProposalFields): string {
  const what = f.what.replace(/[.\s]+$/, '');
  const by = f.date ? ` by ${f.date.replace(/^by\s+/i, '')}` : '';
  switch (kind) {
    case 'goal': {
      const n = f.number !== undefined ? ` is ${f.number.toLocaleString('en-GB')}` : ' is set';
      return f.personName ? `${f.personName}'s goal for ${what}${n}${by}.` : `The goal for ${what}${n}${by}.`;
    }
    case 'role':
      return f.personName ? `${f.personName} is responsible for ${what}.` : `Somebody is responsible for ${what}.`;
    case 'commitment':
      return `${f.personName ?? 'Somebody'} will ${what}${by}.`;
    case 'question':
      return whatGroundworkWillAsk(f.personName ?? 'them', f.what);
    case 'decision': {
      return /^whether\b/i.test(what) ? `It is not decided yet ${what}.` : `${what.charAt(0).toUpperCase()}${what.slice(1)} is not decided yet.`;
    }
    case 'date':
      return aDateSaid(what, (f.date ?? '').replace(/^by\s+/i, 'by '));
    case 'rule':
    default: {
      const s = what.charAt(0).toUpperCase() + what.slice(1);
      return `${s}.`;
    }
  }
}

/**
 * THE CHECK. Pure: the plan, what the model read, and who is on the check-in, in; the proposals that
 * hold, out. Nothing is fetched and nothing is written.
 */
export function proposalsFromAPlan(
  planText: string,
  read: PlanRead[] | null | undefined,
  people: SomebodyNamed[],
  /* `nameMustBeInThePlan: false` is for a proposal already read and stored, checked again against its
     own quote alone: "He should be finding new people" names Samuel only in the plan around it. */
  opts: { from?: string; whoIs?: (name: string) => SomebodyNamed | null; nameMustBeInThePlan?: boolean } = {},
): PlanProposal[] {
  const plan = flatten(planText);
  const from = (opts.from ?? '').trim() || 'the plan you pasted';
  const whoIs = opts.whoIs ?? ((name: string) => {
    const n = flatten(name);
    const hits = people.filter((p) => flatten(p.name) === n || flatten(p.name).split(' ')[0] === n);
    return hits.length === 1 ? hits[0] : null;
  });
  const out: PlanProposal[] = [];
  const seen = new Set<string>();
  for (const r of read ?? []) {
    let kind = String(r?.kind ?? '').toLowerCase() as PlanProposalKind;
    if (!KINDS.includes(kind)) continue;
    const quote = (r?.fromThePlan ?? '').trim().replace(/^["'“‘]+|["'”’]+$/g, '').trim();
    /* 1. The words must really be in the plan. */
    if (quote.length < 3 || !plan.includes(flatten(quote))) continue;
    const what = (r?.what ?? '').trim().replace(/\s+/g, ' ').slice(0, 300);
    if (!what) continue;
    const fields: PlanProposalFields = { what };
    /* 2. A number only where the quote holds it. A number the quote does not hold drops the whole proposal. */
    if (r?.number !== null && r?.number !== undefined) {
      const n = Number(r.number);
      /* The number is read from the quote WITHOUT its date: "racking installed by 24 October" holds the
         day 24 and no number to reach. Found on a project plan (4 October 2026), where the day of the
         month was kept as a target of 24 on the person who owns the racking. */
      const withoutTheDate = (r?.date ?? '').trim() ? flatten(quote).split(flatten(r.date as string)).join(' ') : quote;
      if (!Number.isFinite(n) || !numbersIn(quote).has(n)) continue;
      if (numbersIn(withoutTheDate).has(n)) fields.number = n;
      /* Only the day of the date: a job to be done by that date, so a commitment, with no number. */
      else if (kind === 'goal' && (r?.date ?? '').trim()) kind = 'commitment';
      else continue;
    }
    /* 3. A date only exactly as the quote wrote it. */
    const date = (r?.date ?? '').trim();
    if (date) {
      if (!flatten(quote).includes(flatten(date))) continue;
      fields.date = date;
    }
    /* 4. A name must be in the plan; somebody on the check-in only where exactly one person answers to it. */
    let note: string | undefined;
    const name = (r?.personName ?? '').trim();
    if (name) {
      if (opts.nameMustBeInThePlan !== false && !plan.includes(flatten(name))) continue;
      const who = whoIs(name);
      fields.personName = name;
      if (who) { fields.participantId = who.id; fields.personOnTheCheckIn = who.name; }
      else note = NOT_ON_THIS_CHECK_IN(name, kind);
    }
    if (kind === 'role' && !name) continue;
    /* 4b. A QUESTION is for one named person, is a question, and is the lead's own words: the sentence
       Groundwork would ask has to be in the quote, with only a capital letter and a question mark added. */
    if (kind === 'question') {
      if (!name || !/\?/.test(quote)) continue;
      const exact = plainQuestionFrom(what, name);
      if (!exact || !flatten(quote).includes(flatten(exact.replace(/\?+$/, '')))) continue;
      fields.what = exact;
    }
    /* 4c. A DATE on its own is a date the plan names with nothing else to hang it on: it needs the date, as written. */
    if (kind === 'date' && (!fields.date || name)) continue;
    /* 5. The sentence the lead reads may not carry a figure the quote does not. */
    let says = (r?.says ?? '').trim().replace(/\s+/g, ' ');
    const held = numbersIn(quote);
    /* A question and a date are said by the code, in the words the setup chat uses for them. */
    if (kind === 'question' || kind === 'date') says = sentenceFor(kind, fields);
    else if (!says || !/[.!?]$/.test(says) || figuresIn(says).some((n) => !held.has(n)) || says.includes(':')) {
      says = sentenceFor(kind, fields);
    }
    const key = `${kind}::${flatten(quote)}::${flatten(says)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `${kind}-${out.length + 1}`,
      kind,
      says,
      fields,
      fromThePlan: quote,
      heading: `${A_KIND[kind]}, from ${from}. It would go in ${LANDS_IN[kind].toLowerCase()}.`,
      landsIn: LANDS_IN[kind],
      from,
      ...(note || kind === 'question' ? { note: note ?? THIS_ONE_IS_NOT_ASKED_UNTIL_YOU_CONFIRM_IT } : {}),
      line: says,
      saidAs: quote,
      ...(kind === 'goal' && fields.number !== undefined
        ? { whichWay: theQuestionAboutWhichWay(fields.number) as string, directionSuggested: whatTheWordsSuggest(`${what} ${quote}`, fields.number) }
        : {}),
    });
  }
  return out;
}

export const A_PLAN_PROMPT = `Somebody who runs a team check-in has given you their plan. Take out each separate thing in it that is one of these seven kinds, and nothing else.

GOAL. A result the team or one person is to reach, with its number and date if the plan gives them. "25 freezer sales this quarter" is a goal: what is "freezer sales", number 25, date "this quarter". A number the whole team is held to ("N180m for the quarter", "credit under 35%", "arrears under 8%") is a goal with no personName; take the number the plan has settled on, never one it is arguing with. A job that is to be done by a date, with no number to reach ("racking installed by 24 October", "go live on 15 November"), is a commitment and not a goal. The day of a date is never the number.
ROLE. Who owns or is responsible for what. "Aisha looks after the Lagos supermarkets" is a role: personName Aisha, what "the Lagos supermarkets".
COMMITMENT. Something one person will do, by a date if one is given. "Dayo will send the price list to Client B by 3 October" is a commitment: personName Dayo, what "send the price list to Client B", date "3 October".
RULE. How the team works. "If they haven't replied after three calls, drop it" is a rule: what "drop a lead after three calls with no reply".

For each one:
- fromThePlan: the exact words from the plan it came from, copied character for character. Never reword, shorten inside, or join two places.
- says: one plain, full sentence the person who wrote the plan will read, using people's names, such as "Samuel is to find 10 new leads a week." No colons, no dashes, no abbreviations.
- number: only a number written in fromThePlan. Never work one out.
- date: only a date or period written in fromThePlan, copied exactly as written ("31 December", "end of Q4", "Friday"). Never turn it into another form.
- personName: the person's name exactly as the plan writes it, if it is about one person.
QUESTION. A question the plan writes for one named person: "Amina - which accounts actually have a buying process?" is a question: personName Amina, what "Which accounts actually have a buying process?". Take the person and the question exactly as written. A question the plan asks of nobody in particular is not a question item.
DECISION. Something the plan says is still to be decided: "whether the target stays at 12m", "we still have to decide who covers Kano". what is that, as the plan words it. Something the plan says IS decided is not a decision item.
DATE. A date or period the plan names that belongs to nobody and to no measure: "the quarter ends 31 December", "board meeting on 14 November", "launch is 15 November". what is what happens on that date, date is the date exactly as written. A date that goes with a goal or a job somebody is to do is part of that goal or commitment and is not its own item.

A plan often names the owner of a priority, a workstream or a task on its own line ("Owner: Amina Yusuf", "Ibrahim Danjuma:", "owner of the move: Tolu"). That person is the personName of every goal and commitment in that priority, workstream or task, even when the line the goal is written on does not repeat the name. Leave personName empty only when the plan gives the item no owner anywhere ("Someone has to own this").

Anything the plan itself says is not agreed, not decided, not sure or not a target ("nothing agreed yet", "maybe N20m, not sure") is not an item. Never write "I", "me" or "my" in says: use the person's name, or "the lead" where the plan does not give it.

Each goal, role, commitment, rule, question, decision and date is its own item: a line with two people's numbers is two goals. Leave out background, history, opinions about people and anything you are not sure is one of the seven.`;

export const A_PLAN_SCHEMA = {
  name: 'emit_the_proposals_in_a_plan',
  description: 'Emit each goal, role, commitment, rule, question, decision and date in the plan, one item each.',
  input_schema: {
    type: 'object',
    properties: {
      proposals: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: KINDS },
            says: { type: 'string' },
            fromThePlan: { type: 'string' },
            personName: { type: ['string', 'null'] },
            what: { type: 'string' },
            number: { type: ['number', 'null'] },
            date: { type: ['string', 'null'] },
          },
          required: ['kind', 'says', 'fromThePlan', 'what'],
        },
      },
    },
    required: ['proposals'],
  },
};
