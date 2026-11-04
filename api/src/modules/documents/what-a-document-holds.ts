import { theTargetForEveryone, theirTarget } from './a-target-named-target';
import { aboutTheNoteBeforeTheYes } from './the-note-about-where-numbers-came-from';
/**
 * WHAT A DOCUMENT HOLDS, READ ONCE, AND SAID BACK IN THE PRODUCT'S OWN WORDS.
 *
 * Hafsah, 22 September 2026: "we need the best document reader ever, and once read, the conversation
 * should go into the chat as 'here is the context we have'. Also the context tab, as well as the
 * reports and board. It can pull the targets."
 *
 * Before this, a document was read into text on upload and then nothing read the text. The chat saw
 * its first thousand characters, to say its name. The extraction that writes targets read the
 * transcript. So a lead who put the quarter's numbers in a sheet had given us everything and been
 * told nothing, and the board sat empty beside a file that had the answer in it.
 *
 * WHAT IS READ. Four things, and only things this product already keeps:
 *
 *   A NUMBER FOR ONE PERSON. The name as the document writes it, what the number is of, the number.
 *   A NUMBER FOR THE WHOLE CHECK-IN. A total, a ceiling, a rate everybody is held to.
 *   A DATE SOMETHING IS DUE BY, where the document says one, in its own words.
 *   WHAT THE DOCUMENT IS, in one line, so a person reading the list knows which file is which.
 *
 * WHAT IS DELIBERATELY NOT READ. Anything about a person that is not a number or a job: a note in a
 * comments column saying somebody is struggling is a judgement, and this product has one place for
 * those and it is not a target table. Progress already made is not a target. A month column is not
 * four targets. And a name is never guessed onto the nearest person: an unmatched name is said out
 * loud so the lead can add them or fix the spelling.
 *
 * THE SENTENCES ARE WRITTEN HERE, NOT ASKED OF THE MODEL. A plausible wrong number, read back as
 * settled, is unrecoverable - so the product lists what it took, whose it is, and asks whether that
 * is right. Every surface says the same words: the chat, the Context tab, and the line under the
 * document in the list.
 */

export interface ANumberForOnePerson {
  /** The name exactly as the document writes it. Resolved against the roster by the caller. */
  personName: string;
  /** What the number is of, in the document's own words: "Q3 sales", "new dealers signed". */
  what: string;
  target: number;
  /** When it is due, in the document's own words. Never parsed into a date here. */
  by?: string | null;
}

export interface ANumberForEverybody {
  what: string;
  target: number;
  /** A ceiling is not a goal to climb to, and a reader needs to know which it is. */
  kind?: 'to reach' | 'not to exceed' | null;
  by?: string | null;
}

export interface WhatADocumentHolds {
  /** One line: what this document is. "A quarterly sales target sheet, by rep." */
  whatItIs: string;
  forOnePerson: ANumberForOnePerson[];
  forEverybody: ANumberForEverybody[];
  /** Dates the document sets, in its own words, where they belong to no single number. */
  dates: { what: string; when: string }[];
}

/** How much of a document is read for this. A sheet of targets is small; a strategy deck is not this. */
export const MOST_OF_A_DOCUMENT_WE_READ = 60_000;

export const WHAT_A_DOCUMENT_HOLDS_PROMPT = `You are reading one document somebody attached to a work check-in. Find only what the check-in can hold: numbers people are working to, numbers the whole group is held to, and dates.

A spreadsheet arrives as one block of comma-separated rows per sheet, with its sheet name above it.

NUMBERS FOR ONE PERSON. A row counts when three things are there: a person's name, what the number is of, and the number.
- "Dayo Adebayo, North, 45,000,000, 35%, 6" under headers "Rep, Territory, Q3 sales, Credit ceiling, New dealers" is two rows for Dayo: Q3 sales 45000000, and new dealers 6.
- Take every column that is a number that person is working to. Leave the columns that are the same for everybody to the group list below.
- A row whose name cell says TOTAL, SUM, TEAM or ALL is not a person. Leave it out.
- A column of progress so far, a percentage complete, or last year's actual is not a target. Leave it out.
- Where a plan gives each priority or workstream an owner, the numbers in it are that owner's: give them under that person, and never also as a number for everyone.
- A number inside the description of a job ("tell the top 30 customers", "count 4,200 items") belongs to that job and is not a target. A reserve, allowance or contingency is not a target either.
- A figure the document says is not agreed, not decided or only a choice between two numbers is not a target. Leave it out.
- A month or a quarter column is not a target of its own: where a row is split across months and also has a total, take the total only. Where it has no total, add nothing up - take nothing.

NUMBERS FOR EVERYBODY. A total for the group, or a limit every person carries.
- "TOTAL 153,000,000" is one for everybody, to reach.
- A column where every person has the same figure - a credit ceiling of 35%, a maximum discount - is one for everybody, not to exceed.

DATES. Where the document says something is due, give it in the document's own words: "by December", "end of Q3", "3 October". Never work out a date that is not written.

WHAT IT IS. One full plain sentence, starting "It is" or "This is", saying what kind of document this is, for somebody choosing between files in a list. Never a label or a noun phrase on its own, such as "A Q4 sales target sheet" - write "It is a Q4 sales target sheet."

TWO RULES OVER EVERYTHING. Give names and wording exactly as the document writes them - do not correct, expand, translate or match them to anybody. And an empty answer is a correct answer: a document with no numbers in it is an ordinary document, and a wrong number is worse than none.`;

export const WHAT_A_DOCUMENT_HOLDS_SCHEMA = {
  name: 'emit_what_the_document_holds',
  description: 'Emit the numbers and dates this document sets, and one plain, full sentence saying what it is.',
  input_schema: {
    type: 'object',
    properties: {
      whatItIs: { type: 'string', description: 'One full plain sentence, starting "It is" or "This is", saying what kind of document this is. Never a bare noun phrase.' },
      forOnePerson: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            personName: { type: 'string', description: "The person's name exactly as the document writes it." },
            what: { type: 'string', description: "What the number is of, in the document's own words." },
            target: { type: 'number' },
            by: { type: ['string', 'null'], description: "When it is due, in the document's own words." },
          },
          required: ['personName', 'what', 'target'],
        },
      },
      forEverybody: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            what: { type: 'string' },
            target: { type: 'number' },
            kind: { type: ['string', 'null'], enum: ['to reach', 'not to exceed', null] },
            by: { type: ['string', 'null'] },
          },
          required: ['what', 'target'],
        },
      },
      dates: {
        type: 'array',
        items: {
          type: 'object',
          properties: { what: { type: 'string' }, when: { type: 'string' } },
          required: ['what', 'when'],
        },
      },
    },
    required: ['whatItIs', 'forOnePerson', 'forEverybody', 'dates'],
  },
} as const;

const fmt = (n: number): string =>
  Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m` : Math.abs(n) >= 1e3 ? n.toLocaleString('en-GB') : String(n);

export interface WhatLanded {
  fileName: string;
  whatItIs?: string | null;
  /** Per-person rows that reached the record, with the person named as this reader may see them. */
  forOnePerson: { who: string; what: string; target: number; by?: string | null; page?: number; ownerParticipantId?: string | null; asWritten?: string | null }[];
  forEverybody: { what: string; target: number; kind?: string | null; by?: string | null; page?: number; asWritten?: string | null }[];
  dates: { what: string; when: string; page?: number }[];
  /** How many pages the file has, when its text carries them (a PDF with a text layer). */
  pages?: number;
  /** A PDF read from a picture of its pages: it has pages, and we cannot say which item is on which. */
  pagesNotKnown?: boolean;
  /** Names the document has that this check-in does not. */
  unmatched: string[];
  /**
   * WHAT IS WAITING ON A YES, with the owner already resolved.
   *
   * The numbers used to be written the moment the file was read, and the conversation then asked "is
   * that right?" about something already on the record. They wait here instead - see
   * whatTheDocumentWaitsFor - and `takenAt` says when a person said yes to them.
   */
  waiting?: { name: string; target: number; ownerParticipantId: string | null }[];
  takenAt?: string | null;
  /** What the read found and did not keep, and why: bank details, and numbers this person may not set. */
  leftOut?: { what: string; why: string; page?: number }[];
}

/** The prototype's words, on its upload screen, under "What it left out". */
export const BANK_DETAILS_LEFT_OUT = { what: 'Bank account details', why: 'Never kept, in any document.' } as const;

/**
 * THE CONTEXT WE HAVE, IN ONE BLOCK, THE SAME WORDS EVERYWHERE.
 *
 * `asking` adds the question at the end, which the chat wants and a page does not: a page is a
 * statement of what is on record, and a question on a page is a question nobody can answer.
 */
/**
 * WHO IS READING IT. The reader is "you" in a sentence the product writes, so a number that is the
 * reader's own reads "Your target for cookers delivered is 3." and never "Amani Wekesa's target" to
 * Amani herself. Matched on the participant the number was kept against, and, for a read that
 * predates that, on the reader's own name.
 */
export interface WhoIsReading { participantId?: string | null; name?: string | null }

const sameName = (a?: string | null, b?: string | null): boolean =>
  !!a && !!b && a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');

export const isTheReader = (row: { who: string; ownerParticipantId?: string | null }, reader?: WhoIsReading | null): boolean =>
  !!reader && ((!!reader.participantId && row.ownerParticipantId === reader.participantId) || sameName(row.who, reader.name));

/**
 * THE LINE THAT SAYS WHERE IT CAME FROM, ONE FIELD (fix plan, release batch 1, group 6; Hafsah's one voice, 3 November 2026). It read
 * "Here is the context we have from team-plan.txt", Groundwork calling itself "we", and two places cut it off the front of the block with
 * a pattern of its words. It is written here once, served beside the block, and read by whatever needs the block without it.
 */
export function theDocumentLine(fileName: string, whatItIs?: string | null): string {
  const what = aSentence(whatItIs ?? null);
  return `Here is what I took from ${fileName}.${what ? ` ${what}` : ''}`;
}

/** The block without its first line, for a page that already names the document. */
export function whatTheDocumentHolds(held: WhatLanded, opts: { reader?: WhoIsReading | null } = {}): string | null {
  const all = theContextWeHave(held, opts);
  if (!all) return null;
  const line = theDocumentLine(held.fileName, held.whatItIs);
  return all.startsWith(line) ? all.slice(line.length).trim() : all;
}

export function theContextWeHave(held: WhatLanded, opts: { asking?: boolean; willNoteIt?: { visibility?: string | null }; reader?: WhoIsReading | null } = {}): string | null {
  const something = held.forOnePerson.length || held.forEverybody.length || held.dates.length || held.unmatched.length;
  if (!something) return null;
  /*
   * EACH LINE A SENTENCE, NOT A HEADING, A COLON AND A DASH (request 40). This read "For the whole
   * check-in:", "- Lowest price for the 600L: 76,000" and "Dates it sets:", and a record line read
   * "cookers delivered, 3, by by 9 October" because the document's own "by 9 October" was given a
   * second "by". The document's words for what a number is of stay exactly as it wrote them.
   */
  const lines: string[] = [theDocumentLine(held.fileName, held.whatItIs)];
  if (held.forEverybody.length) {
    lines.push('');
    for (const t of held.forEverybody) {
      lines.push(t.kind === 'not to exceed'
        ? `${atTheStart(t.what)} must stay at or under ${t.asWritten || fmt(t.target)}${byWhen(t.by)} for everyone in this check-in.`
        : `For everyone in this check-in, ${theTargetForEveryone(t.what, t.asWritten || fmt(t.target))}${byWhen(t.by)}.`);
    }
  }
  if (held.forOnePerson.length) {
    lines.push('');
    for (const t of held.forOnePerson) lines.push(`${atTheStartOf(theirTarget(isTheReader(t, opts.reader) ? 'Your' : `${t.who}'s`, t.what, t.asWritten || fmt(t.target)))}${byWhen(t.by)}.`);
  }
  if (held.dates.length) {
    lines.push('');
    /* "The date it sets for Date of draft is 22 October 2026." (pilots, problem 13): a name that is itself a date says it plainly. */
    for (const d of held.dates) lines.push(dateSentence(d));
  }
  if (held.unmatched.length) {
    lines.push(
      '',
      held.unmatched.length === 1
        ? `One name in it, ${held.unmatched[0]}, is not on this check-in. Add them, and their numbers will go on too.`
        : `${held.unmatched.length} names in it are not on this check-in. They are ${andList(held.unmatched)}. Add them, and their numbers will go on too.`,
    );
  }
  if (held.leftOut?.some((l) => l.what === BANK_DETAILS_LEFT_OUT.what)) {
    lines.push('', 'It also held bank account details. Those are never kept, in any document.');
  }
  /* The yes also writes a note everyone reads. Said here, before the yes, where it will be written. */
  if (opts.willNoteIt && held.forEverybody.length + held.forOnePerson.length) {
    lines.push('', aboutTheNoteBeforeTheYes(held.fileName, opts.willNoteIt.visibility));
  }
  if (opts.asking) lines.push('', 'Is that right?');
  return lines.join('\n');
}

/** A name that starts a sentence in the document reads in the middle of ours with a small first letter, unless it is a name or an acronym: "for the new stock system", "for Kilifi". */
/**
 * A LIMIT'S NAME STARTS ITS SENTENCE (B-014). "For everyone in this check-in, Discount ceiling must stay at
 * or under 5." kept the document's capital mid-sentence, and a capital cannot be safely lowered (it may be a
 * name). So the limit's own words open the sentence, where a capital is right: "Discount ceiling must stay at
 * or under 5 for everyone in this check-in."
 */
export function atTheStart(what: string): string {
  const w = (what ?? '').trim();
  return w ? `${w.charAt(0).toUpperCase()}${w.slice(1)}` : w;
}

export function inTheMiddle(what: string): string {
  const w = (what ?? '').trim();
  return /^(The|A|An)\s/.test(w) ? `${w.charAt(0).toLowerCase()}${w.slice(1)}` : w;
}

/** " by 9 October", said once, whether or not the document wrote its own "by". */
export function byWhen(by?: string | null): string {
  const when = (by ?? '').trim().replace(/\.$/, '').replace(/^by\s+/i, '');
  if (!when) return '';
  /* "each week", "every Friday", "per month" say how often, not by when: "15 each week", never "15 by each week" (B-014). */
  /* "within 30 days", "before the hearing", "on 21 October" already say when: never "by within 30 days" (pilots, 13 October). */
  return /^(each|every|per|a|once|twice|weekly|daily|monthly|yearly|annually|within|in|before|after|on|until|till|no later than|at)\b/i.test(when) ? ` ${when}` : ` by ${when}`;
}

/**
 * ONE FULL SENTENCE, NEVER THE MODEL'S FRAGMENT ON ITS OWN.
 *
 * `whatItIs` is asked of the model as a full sentence (see WHAT_A_DOCUMENT_HOLDS_PROMPT), but a read
 * from before that wording, or a PromptVersion override that has not caught up, can still hand back a
 * bare noun phrase - "A Q4 sales target sheet". Put straight after "Here is what I took from
 * Q4 targets.xlsx.", that fragment read as two sentences that did not join up. So it is turned into a
 * sentence here, in code, which is the one guarantee that does not depend on the model getting it
 * right: a phrase with no verb of its own is given one, in the product's own voice ("It looks like a
 * Q4 sales target sheet."); a phrase that already has a verb - "This sheet sets the Q4 targets for
 * each dealer." - is kept exactly as it is, with its full stop made certain. An empty answer stays
 * empty: no sentence is better than an invented one.
 */
/*
 * ONLY WORDS THAT ARE RARELY ANYTHING BUT A VERB HERE. "list", "record", "report", "detail", "cover"
 * and "hold" were tried and dropped: a document description says "a price list" and "sales record"
 * often enough, as an ordinary noun, that treating them as a verb wrapped the wrong half of a real
 * fragment - "A price list for the 600L cookers" was kept as if "list" made it a sentence.
 */
const HAS_A_VERB =
  /\b(is|are|was|were|has|have|had|sets|shows|show|tracks|track|outlines|outline|describes|describe|summarizes|summarize|summarises|summarise|contains|contain|confirms|confirm|explains|explain|asks|ask|requests|request|provides|provide|captures|capture|gives|give|lays out|lay out|breaks down|break down|tallies|tally)\b/i;

export const aSentence = (t: string | null | undefined): string | null => {
  const s = (t ?? '').trim().replace(/[.;:,\s]+$/, '').trim();
  if (!s) return null;
  /* A sentence in the first person ("I will keep this on record ...") is already one, and its "I" is never made small (B-014). */
  if (HAS_A_VERB.test(s) || /^I(\s|'|\u2019)/.test(s) || /\b(will|shall|can|should|must)\b/i.test(s)) return `${s}.`;
  /* The first letter is made small only where the first word is an ordinary one: not an "I", not an acronym such as OKR or KPI. */
  const first = s.split(/\s+/)[0];
  /* A name of two capitalised words ("Drop Access Ltd") keeps its capital too: it read "drop Access Ltd" (26 October 2026). */
  const keepsItsCapital = first === 'I' || /^[A-Z]{2,}\b/.test(first) || /^[A-Z][a-z]*[A-Z]/.test(first) || /^[A-Z][a-z]+\s+[A-Z]/.test(s);
  const lower = keepsItsCapital ? s : `${s.charAt(0).toLowerCase()}${s.slice(1)}`;
  /*
   * AN ACTION IS SAID AS ONE (26 October 2026). "What I will do with it" read "It looks like hold this as a record of the transaction":
   * a line that starts with what will be done is an action, never a guess, so it is "I will hold this as a record ...".
   */
  if (/^(?:hold|use|keep|add|file|link|store|treat|compare|check|note|attach|track|record|save|match|flag|ask|send|show|put)\b/i.test(s)) return `I will ${lower}.`;
  return `It looks like ${lower}.`;
};

const andList = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/* ------------------------------------------------------------------------------------------------ */

/** Whoever a name in a document might be, as every caller here already holds them. */
export interface SomebodyOnTheCheckIn {
  id: string;
  email: string;
  nameGiven?: string | null;
  roleAsDescribed?: string | null;
  managingOnly?: boolean;
  userId?: string | null;
  user?: { firstName?: string | null; lastName?: string | null } | null;
}

/**
 * WHO A NAME IN A DOCUMENT IS, OR NOBODY.
 *
 * The same rule the spoken path uses, in one place, because two copies of a name-matching rule is two
 * answers to "is this Dayo". Full name, the name they gave at the end of an open link, first name, the
 * address's local part with dots and underscores read as spaces, or the role as the lead described it.
 * Case and spacing are ignored; nothing else is. A first name that two people share matches NEITHER -
 * a target on the wrong person is worse than a target nobody holds, and the caller says the name out
 * loud instead.
 */
export function whoThisNameIs(name: string, people: SomebodyOnTheCheckIn[]): SomebodyOnTheCheckIn | null {
  /* Dots and underscores read as spaces on BOTH sides: a sheet's name column sometimes holds an
     address, and "dayo.adebayo" is the same person as "Dayo Adebayo". */
  const n = (name ?? '').trim().toLowerCase().replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!n) return null;
  const ways = (p: SomebodyOnTheCheckIn) => [
    [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').toLowerCase().trim(),
    (p.nameGiven ?? '').toLowerCase().trim(),
    (p.user?.firstName ?? '').toLowerCase().trim(),
    /* The first name of the name they gave, for somebody added by a colleague pick who has not opened the invitation:
       "Amani, have you sent the proposal?" is Amani Wekesa. Found walking the user journeys, where the lead's plan named
       "Amani" and the check-in said she was not on it. Two people sharing a first name still match neither. */
    (p.nameGiven ?? '').toLowerCase().trim().split(/\s+/)[0],
    (p.email ?? '').split('@')[0].toLowerCase().replace(/[._]/g, ' '),
    /* And the first name in the address, for somebody invited by address alone ("amani.wekesa@..." is "Amani"). Found in the browser
       journeys: the lead's plan said "Amani" and the check-in said she was not on it. Two people with one first name still match neither. */
    ((p.email ?? '').split('@')[0].toLowerCase().split(/[._]+/).length >= 2 ? (p.email ?? '').split('@')[0].toLowerCase().split(/[._]+/)[0] : ''),
    (p.roleAsDescribed ?? '').toLowerCase().trim(),
  ].filter(Boolean);
  const hits = people.filter((p) => ways(p).includes(n));
  return hits.length === 1 ? hits[0] : null;
}

/** How this person is named back to a reader: their own name, the one they gave, else their address. */
export function theNameWeUseFor(p: SomebodyOnTheCheckIn): string {
  const known = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim();
  if (known) return known;
  /*
   * AND OTHERWISE THE NAME IN THEIR ADDRESS, NOT THE ADDRESS.
   *
   * Read live on 22 September 2026: "I will put the Client C call down as hassan@harvestline.test",
   * and a Context page whose rows read "david@harvestline.test". Nobody has to see an address where
   * the address itself says the name - it is the same read `whoThisNameIs` already does in the other
   * direction. Where the local part is not a name (info, sales, a number), it is left as the address,
   * because guessing a person out of "accounts@" would be worse than showing it.
   */
  const local = (p.email ?? '').split('@')[0] ?? '';
  /* Digits stay - see personLabel: person1@ and person2@ are two people, not one called Person. */
  const asWords = local.replace(/[._-]+/g, ' ').trim();
  if (!asWords || asWords.length < 2 || NOT_A_PERSON.has(asWords.toLowerCase())) return p.email;
  return asWords.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Addresses that are a desk rather than a person. */
const NOT_A_PERSON = new Set([
  'info', 'hello', 'admin', 'sales', 'support', 'contact', 'team', 'office', 'accounts', 'finance',
  'hr', 'billing', 'help', 'enquiries', 'inquiries', 'noreply', 'no reply', 'mail', 'post',
]);

/* "The date it sets for Date of draft is 22 October 2026." (pilots, problem 13): a name that is itself a date says it plainly. */
export function dateSentence(d: { what: string; when: string }): string {
  const what = d.what.trim();
  const when = d.when.trim().replace(/\.$/, '');
  return /^date\b/i.test(what) ? `It gives the ${what.charAt(0).toLowerCase()}${what.slice(1)} as ${when}.` : `The date it sets for ${inTheMiddle(what)} is ${when}.`;
}

const atTheStartOf = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
