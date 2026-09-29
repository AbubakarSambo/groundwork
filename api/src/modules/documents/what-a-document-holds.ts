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
- A month or a quarter column is not a target of its own: where a row is split across months and also has a total, take the total only. Where it has no total, add nothing up - take nothing.

NUMBERS FOR EVERYBODY. A total for the group, or a limit every person carries.
- "TOTAL 153,000,000" is one for everybody, to reach.
- A column where every person has the same figure - a credit ceiling of 35%, a maximum discount - is one for everybody, not to exceed.

DATES. Where the document says something is due, give it in the document's own words: "by December", "end of Q3", "3 October". Never work out a date that is not written.

WHAT IT IS. One plain line naming what kind of document this is, for somebody choosing between files in a list.

TWO RULES OVER EVERYTHING. Give names and wording exactly as the document writes them - do not correct, expand, translate or match them to anybody. And an empty answer is a correct answer: a document with no numbers in it is an ordinary document, and a wrong number is worse than none.`;

export const WHAT_A_DOCUMENT_HOLDS_SCHEMA = {
  name: 'emit_what_the_document_holds',
  description: 'Emit the numbers and dates this document sets, and one plain, full sentence saying what it is.',
  input_schema: {
    type: 'object',
    properties: {
      whatItIs: { type: 'string', description: 'One plain, full sentence saying what kind of document this is.' },
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
  forOnePerson: { who: string; what: string; target: number; by?: string | null }[];
  forEverybody: { what: string; target: number; kind?: string | null; by?: string | null }[];
  dates: { what: string; when: string }[];
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
  /** What the read found and did not keep, and why. Only bank details, today. */
  leftOut?: { what: string; why: string }[];
}

/** The prototype's words, on its upload screen, under "What it left out". */
export const BANK_DETAILS_LEFT_OUT = { what: 'Bank account details', why: 'Never kept, in any document.' } as const;

/**
 * THE CONTEXT WE HAVE, IN ONE BLOCK, THE SAME WORDS EVERYWHERE.
 *
 * `asking` adds the question at the end, which the chat wants and a page does not: a page is a
 * statement of what is on record, and a question on a page is a question nobody can answer.
 */
export function theContextWeHave(held: WhatLanded, opts: { asking?: boolean } = {}): string | null {
  const something = held.forOnePerson.length || held.forEverybody.length || held.dates.length || held.unmatched.length;
  if (!something) return null;
  /*
   * EACH LINE A SENTENCE, NOT A HEADING, A COLON AND A DASH (request 40). This read "For the whole
   * check-in:", "- Lowest price for the 600L: 76,000" and "Dates it sets:", and a record line read
   * "cookers delivered, 3, by by 9 October" because the document's own "by 9 October" was given a
   * second "by". The document's words for what a number is of stay exactly as it wrote them.
   */
  const lines: string[] = [`Here is the context we have from ${held.fileName}.${held.whatItIs ? ` ${aSentence(held.whatItIs)}` : ''}`];
  if (held.forEverybody.length) {
    lines.push('');
    for (const t of held.forEverybody) {
      lines.push(t.kind === 'not to exceed'
        ? `For everyone in this check-in, ${t.what} must stay at or under ${fmt(t.target)}${byWhen(t.by)}.`
        : `For everyone in this check-in, the target for ${t.what} is ${fmt(t.target)}${byWhen(t.by)}.`);
    }
  }
  if (held.forOnePerson.length) {
    lines.push('');
    for (const t of held.forOnePerson) lines.push(`${t.who}'s target for ${t.what} is ${fmt(t.target)}${byWhen(t.by)}.`);
  }
  if (held.dates.length) {
    lines.push('');
    for (const d of held.dates) lines.push(`The date it sets for ${d.what} is ${d.when.trim().replace(/\.$/, '')}.`);
  }
  if (held.unmatched.length) {
    lines.push(
      '',
      held.unmatched.length === 1
        ? `One name in it, ${held.unmatched[0]}, is not on this check-in. Add them, and their numbers will go on too.`
        : `${held.unmatched.length} names in it are not on this check-in. They are ${andList(held.unmatched)}. Add them, and their numbers will go on too.`,
    );
  }
  if (held.leftOut?.length) {
    lines.push('', 'It also held bank account details. Those are never kept, in any document.');
  }
  if (opts.asking) lines.push('', 'Is that right?');
  return lines.join('\n');
}

/** " by 9 October", said once, whether or not the document wrote its own "by". */
export function byWhen(by?: string | null): string {
  const when = (by ?? '').trim().replace(/\.$/, '').replace(/^by\s+/i, '');
  return when ? ` by ${when}` : '';
}

const aSentence = (t: string): string => {
  const s = t.trim();
  return /[.!?]$/.test(s) ? s : `${s}.`;
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
    (p.email ?? '').split('@')[0].toLowerCase().replace(/[._]/g, ' '),
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
