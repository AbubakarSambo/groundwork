import { withTheValueWorkedOut, theBuyingDateOf, aBuyingDateSaid, aLineIsAbout, BUYING_DATE } from './a-deals-value-and-buying-date';
import { PLAIN_WORDS } from '../conversation/plain-words';

/**
 * THE KIND OF WORK A CHECK-IN IS ABOUT, AND THE RECORDS ITS BOARD NEEDS.
 *
 * Request 76, and Hafsah's ruling of 29 September 2026: all eleven kinds of board in the prototype
 * stay, each matching its example (docs/modules.md G1, and SEED2 in docs/prototype/source/seed2.js
 * and s36.js, s48.js, s52.js). The situation (the scenario) decides which sections a board has. The
 * kind of work decides what goes inside them: a sales board's deal grid holds deals and their
 * stages, an engineering board's holds releases and tasks, a law firm matter's timeline holds its
 * deadlines.
 *
 * Until this, nothing recorded "sales" or "engineering" anywhere, so every board was drawn from its
 * family alone.
 *
 * WHAT IS STORED. `Ground.kindOfWork` holds one of the fifteen names below, exactly, or null (the eleven kinds of
 * the prototype's boards, with "sales team" beside "sales org" since Release 1). It is
 * read from the lead's own words and the brief when setup is saved, checked here against the fifteen
 * (anything else is null, never the nearest match), and the lead can change it. A lead's choice is
 * never overwritten by a later read.
 *
 * THE RECORDS. `WorkItem` rows, one table for every kind, each written either from a line somebody
 * said in a check-in or by the lead. Nothing here is invented: a row the model offers from a check-in
 * is kept only when its name is in the words of the line it points at.
 */

export const KINDS_OF_WORK = [
  'sales team',
  'sales org',
  'engineering release',
  'support desk',
  'distribution operations',
  'trader training programme',
  "founder's own check-in",
  'asset loans',
  'MarketView where next',
  'MarketView Q4',
  'a law firm matter',
  'a government programme',
  /* Release 4: a leadership team, its priorities across the teams. Offered only where Release 4 is on; read from the lead's words like any other kind (15 November, so that typing it reaches its board), and given only where it is offered. */
  'leadership',
  /* Release 5: a funded or client project, its plan and milestones, money in and out, and stakeholders. Offered only where Release 5
     is on; read from the lead's words, and given only where it is offered. */
  'a funded project',
  /* Client delivery is a type of project (Hafsah, 25 October): the same board, for work delivered to a client. */
  'client delivery',
] as const;

export type KindOfWork = (typeof KINDS_OF_WORK)[number];

/**
 * THE TWO SALES KINDS (release plan, Release 1: "Set Drop Access's type to sales team, not sales org"). A "sales team" is
 * one team selling, with one lead and the reps who report to them. A "sales org" is an organisation with several sales
 * teams (the kit's salesorg board, Release 4). Until Release 4 builds that board, both are served the same sales board:
 * the same deal rows, stages and every other sales path. Every place that asks "is this a sales check-in" asks this,
 * never `=== 'sales org'`, so a sales team is never left out.
 */
export const THE_SALES_KINDS: readonly KindOfWork[] = ['sales team', 'sales org'];

export function isASalesKind(kind: unknown): boolean {
  const k = oneOfTheKinds(kind);
  return !!k && THE_SALES_KINDS.includes(k);
}

/**
 * ONE OF THE TWELVE, OR NOTHING. The code check on the model's answer and on what a lead sends: an
 * exact name (ignoring capitals and spaces at the ends) is that kind; anything else is null. Never
 * the nearest match, because a sales board drawn for a law firm is worse than the family's board.
 */
export function oneOfTheKinds(v: unknown): KindOfWork | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().toLowerCase();
  if (!t) return null;
  return KINDS_OF_WORK.find((k) => k.toLowerCase() === t) ?? null;
}

/** A section of the board a kind of work fills from its own records, or says it cannot. */
export interface ARecordSection {
  /** The switchboard's own section name (docs/modules.md G2), exactly. */
  section: string;
  /** What the rows are, in plain words, plural: "deals", "releases and tasks". */
  holds: string;
  /** The `WorkItem.kind` values that belong here. Empty means Groundwork keeps no such record. */
  itemKinds: string[];
  /** The kind's default stage names, in order, from the prototype's example. The lead can change them. */
  stages?: string[];
  /** Said when Groundwork keeps no such record, so the screen can tell "not known" from "none yet". */
  whyNotKnown?: string;
}

/*
 * THE EXAMPLE FITS ITS OWN SECTION (screens request 88). One sentence said "such as payment records or
 * a helpdesk" under the helpdesk's own section, which read oddly: the example named the very thing the
 * section was about. Each section now names the kind of system that would hold its numbers.
 */
const FROM_ANOTHER_SYSTEM = '';
const FROM_PAYMENT_RECORDS = '';
const FROM_THE_HELPDESK = '';

/* One sales board for both sales kinds until Release 4 draws the sales organisation's own (see THE_SALES_KINDS). */
const THE_SALES_RECORDS: ARecordSection[] = [
  { section: 'Deal grid', holds: 'deals', itemKinds: ['deal'], stages: ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'] },
  { section: 'Forecast', holds: 'where the sales numbers are likely to end up', itemKinds: [], whyNotKnown: FROM_PAYMENT_RECORDS },
];

/**
 * EACH KIND'S RECORDS, FROM ITS PROTOTYPE EXAMPLE. The sections a kind fills, what each holds and,
 * where the example shows them, the stages in order. A section listed with no `itemKinds` is one the
 * example board draws but Groundwork has no record for; it is served as not known.
 */
export const RECORDS_FOR_EACH_KIND: Record<KindOfWork, ARecordSection[]> = {
  'sales team': THE_SALES_RECORDS,
  'sales org': THE_SALES_RECORDS,
  'engineering release': [
    { section: 'Deal grid', holds: 'releases and tasks', itemKinds: ['release', 'task'], stages: ['Worked on', 'Written', 'Merged', 'Tested', 'Deployed', 'Used'] },
  ],
  'support desk': [
    { section: 'Deal grid', holds: 'tickets', itemKinds: ['ticket'] },
    { section: 'Themes', holds: 'ticket volume and causes from the helpdesk', itemKinds: [], whyNotKnown: FROM_THE_HELPDESK },
  ],
  'distribution operations': [
    { section: 'Deal grid', holds: 'incidents', itemKinds: ['incident'] },
  ],
  'trader training programme': [
    { section: 'Deal grid', holds: 'trader groups', itemKinds: ['group'], stages: ['Enrolled', 'Check-in 1', 'Check-in 2', 'Completed'] },
  ],
  "founder's own check-in": [
    { section: 'Work plan', holds: 'commitments and decisions', itemKinds: ['commitment', 'decision'] },
  ],
  'asset loans': [
    { section: 'Deal grid', holds: 'loans and their repayments', itemKinds: ['loan'], stages: ['Disbursed', 'Repaying', 'Late', 'Repaid'] },
  ],
  'MarketView where next': [
    { section: 'Themes', holds: 'priorities people named', itemKinds: ['priority'] },
  ],
  'MarketView Q4': [
    { section: 'Deal grid', holds: 'subscriptions and the metrics people state', itemKinds: ['subscription', 'metric'], stages: ['Said', 'Paid'] },
    { section: 'Forecast', holds: 'where paying subscribers are likely to end up', itemKinds: [], whyNotKnown: FROM_PAYMENT_RECORDS },
  ],
  'a law firm matter': [
    { section: 'Timeline', holds: 'deadlines', itemKinds: ['deadline'] },
    { section: 'Obligations', holds: 'the parties', itemKinds: ['party'] },
  ],
  'a government programme': [
    { section: 'Deal grid', holds: 'counties and their projects', itemKinds: ['county', 'project'] },
  ],
  'a funded project': [
    { section: 'Timeline', holds: 'milestones', itemKinds: ['milestone'], stages: ['Planned', 'Started', 'At risk', 'Delivered', 'Accepted', 'Paid for'] },
    { section: 'Forecast', holds: 'money in and out, by month', itemKinds: ['money'] },
    { section: 'Obligations', holds: 'stakeholders', itemKinds: ['stakeholder'] },
  ],
  'client delivery': [
    { section: 'Timeline', holds: 'milestones', itemKinds: ['milestone'], stages: ['Planned', 'Started', 'At risk', 'Delivered', 'Accepted', 'Paid for'] },
    { section: 'Forecast', holds: 'money in and out, by month', itemKinds: ['money'] },
    { section: 'Obligations', holds: 'stakeholders', itemKinds: ['stakeholder'] },
  ],
  leadership: [
    { section: 'Themes', holds: 'the priorities across the teams', itemKinds: ['priority'] },
    { section: 'Work plan', holds: 'commitments and decisions', itemKinds: ['commitment', 'decision'] },
  ],
};

/**
 * WORK ITEMS THAT ARE NOT WORK (anchor pieces 19, 26 and 27; review of 1d9ef0a5). An idea, an idea waiting for its yes,
 * and a request offered in a check-in are kept as work items, and none of them is a piece of work anybody owns. Every
 * read of work items that shows them as work leaves these kinds out.
 */
export const KINDS_THAT_ARE_NOT_WORK = ['idea', 'idea-offered', 'request-offered'];

/** Every `WorkItem.kind` a kind of work may hold. */
export function itemKindsFor(kind: KindOfWork): string[] {
  return RECORDS_FOR_EACH_KIND[kind].flatMap((s) => s.itemKinds);
}

/**
 * THE SECTIONS SERVED WHEN NOBODY KNOWS THE KIND OF WORK. Every section any kind fills from its
 * records, each as not known, so the screen draws the family's board and leaves these out.
 */
export const RECORD_SECTIONS: string[] = [...new Set(Object.values(RECORDS_FOR_EACH_KIND).flatMap((l) => l.map((s) => s.section)))];

export const NOT_KNOWN_KIND = '';

/** What one row looks like on the board. */
export interface AServedRecord {
  id: string;
  kind: string;
  name: string;
  stage: string | null;
  owner: string | null;
  ownerParticipantId: string | null;
  due: string | null;
  /** The day somebody last spoke about it in a check-in, "2026-09-30": the day of the line it came from. Null for one added on the board. */
  lastSaidOn?: string | null;
  /** Its group on a sales deal grid (request 112 a), and why it is there, in sentences from its own record. */
  group?: 'likely' | 'possible' | 'next-quarter' | 'cooling' | 'cold' | 'won';
  groupSays?: string;
  fields: Record<string, string>;
  /** "said" when it came from a check-in line, "lead" when the lead added it. */
  from: 'said' | 'lead';
  /** The line it came from, word for word, when it came from a check-in. */
  said?: string;
  /**
   * WHO SAID IT, beside whose it is (screens request 89). One person can name another person's deal,
   * so "in the owner's words" was wrong. A first name, named under the same rule as every other name
   * on the board ("a colleague" where this reader may not name them), and the id only where they may.
   * Both null for a record the lead added, which nobody said.
   */
  saidBy?: string | null;
  saidByParticipantId?: string | null;
  /** How it is known (request 107 c): "proof" where a document is behind its line, "said", or "lead" where it was added on the board. */
  known?: 'proof' | 'said' | 'lead';
  knownSays?: string;
  /**
   * THE PROOF MARK (request 108 c), the shape ProofMark reads: `proven`, `confirmed`, `said` or `memory`
   * from the line it came from, and `none` for a record added on the board. Never upgraded.
   */
  mark?: 'proven' | 'confirmed' | 'said' | 'memory' | 'none';
  /** True where the proof is on another line that names this deal's customer, read by this reader (pilots, problem 2). */
  proofOnAnotherLine?: boolean;
  /** The day the customer stopped answering, as a check-in said it (YYYY-MM-DD), or null (pilots after fixes, A4). */
  notAnsweringSince?: string | null;
  /**
   * Somebody says this record, which has nobody's name on it, is theirs (decision 76, item 3). Served to the lead
   * alone, with the question in a plain sentence ("Amani Wekesa says the Westgate Deli deal is theirs. Is it?").
   * Only her yes, through POST work-items/:itemId/claim, sets the owner.
   */
  ownerClaim?: { participantId: string; who: string; says: string };
  /** What happens next, only as somebody said it: an open commitment that names it. Null where nobody has said. */
  next?: string | null;
  /** The step alone, short, for the deal grid's Next step column and the gap list; `next` says whose it is. */
  nextStep?: string | null;
  /** Each stage somebody said a deal was at (a-deals-stages-are-kept), for "Reported vs criteria met". */
  stagesSaid?: string[];
  /** The day the customer said they will buy, YYYY-MM-DD, filed on the deal (Release 1's sales board; a-deals-value-and-buying-date). */
  buyingDate?: string | null;
  /** A payment or deposit record backs it (Release 1's sales board; a-deals-four-criteria). "With proof of payment" counts these alone. */
  paymentRecord?: boolean;
  /** A signed order backs it. Won is met with a signed order or a payment record (Hafsah, 18 October, answer 2). */
  signedOrder?: boolean;
  /** Its four criteria, ticked as the kit ticks them, and the stages its record meets (Release 1's sales board). */
  criteria?: { criterion: string; label: string; met: boolean; says: string | null }[];
  criteriaSays?: string;
  stagesMet?: string[];
  stageMet?: string | null;
  nextKnown?: 'said' | null;
  nextSays?: string;
  /** What it is worth, where somebody said (request 115 b), and the sentence where nobody has. */
  value?: string | null;
  valueSays?: string | null;
  /** Each day somebody spoke about it in a check-in, newest first, and what those dates are. */
  contactHistory?: { on: string; how: 'with proof' | 'in their words'; says: string }[];
  contactHistorySays?: string;
  /** The owner's own latest sentence that names it, word for word, where this reader may read their words. */
  theirRead?: { who: string; words: string; says: string } | null;
  /**
   * DROPPED (Release 1's sales board; a-deal-that-was-dropped): the customer turned it down, or the rep gave it up. Not an open
   * deal: the grid shows it once, as one line at the foot of the group it would be in, and no count of open deals reads it.
   */
  lost?: { on: string; reason: string | null; reasonFrom: string; lesson: string | null; says: string } | null;
}

export type AServedSection =
  | { section: string; holds?: string; state: 'not-known'; why: string }
  | { section: string; holds: string; state: 'none-yet' | 'filled'; stages?: string[]; rows: AServedRecord[] };

/** Only plain string pairs survive in `fields`: a record's details are words, never nested data. */
export function plainFields(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string' && k.trim() && val.trim()) out[k.trim().slice(0, 60)] = val.trim().slice(0, 300);
  }
  return out;
}

/** The stage names this check-in uses: the lead's own, or the kind's defaults. */
export function stagesFor(section: ARecordSection, leadsOwn: unknown): string[] | undefined {
  if (!section.stages) return undefined;
  if (Array.isArray(leadsOwn)) {
    const own = leadsOwn.filter((s): s is string => typeof s === 'string' && !!s.trim()).map((s) => s.trim());
    if (own.length) return own;
  }
  return section.stages;
}

/**
 * THE SECTIONS FOR ONE BOARD. Pure: given the kind, the lead's stage names and the rows this reader
 * may see (already walled and named by the caller), it says what each section holds.
 */
export function theRecordSections(kind: KindOfWork | null, leadsStages: unknown, rows: AServedRecord[]): AServedSection[] {
  if (!kind) {
    return RECORD_SECTIONS.map((section) => ({ section, state: 'not-known' as const, why: NOT_KNOWN_KIND }));
  }
  return RECORDS_FOR_EACH_KIND[kind].map((s) => {
    if (!s.itemKinds.length) return { section: s.section, holds: s.holds, state: 'not-known' as const, why: s.whyNotKnown ?? FROM_ANOTHER_SYSTEM };
    const seenNames = new Set<string>();
    const mine = rows.filter((r) => s.itemKinds.includes(r.kind) && aNameThatNamesSomething((r as any).name)).filter((r) => {
      /* Per person: two borrowers' tricycles are two loans, whatever article each was said with. A priority people name
         together (the where-next board's themes) is one theme whoever named it. */
      const key = `${r.kind}|${r.kind === 'priority' ? '' : ((r as any).ownerParticipantId ?? '')}|${theSameName((r as any).name)}`;
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });
    const stages = stagesFor(s, leadsStages);
    return {
      section: s.section,
      holds: s.holds,
      state: mine.length ? ('filled' as const) : ('none-yet' as const),
      ...(stages ? { stages } : {}),
      rows: mine,
    };
  });
}

// --- Reading the kind of work from setup -------------------------------------------------------

/*
 * THE KINDS, IN WORDS, AND HOW ONE IS CHOSEN: one source (Hafsah, 21 November 2026; release test bug 3). The kind's own read at setup
 * (below) and the reading of the situation at the door (entry/which-situation-this-is.ts) both read these, so the situation and the kind
 * are worked out from the same words by the same understanding and cannot be told two different things.
 */
export const THE_KINDS_IN_WORDS = `- "sales team": one team selling to customers, with one lead and the people who sell under them (for example reps, sales executives or account managers), and deals that move through stages.
- "sales org": a sales organisation of several sales teams, each with its own lead, such as teams for different regions or products, selling to customers with deals that move through stages.
- "engineering release": engineers building and shipping software, with tasks and releases.
- "support desk": a customer support team answering customers' questions and problems, as tickets, emails or chats, however its work is described.
- "distribution operations": the day-to-day running of sites, deliveries, equipment and suppliers, with incidents as they happen. A project that changes how the sites work, such as moving them onto a new system, is not distribution operations: it is a project, which is none of these kinds.
- "trader training programme": a training or development programme for groups of people across places, with check-ins.
- "founder's own check-in": a founder, owner or chief executive checking in on their own, about their own commitments and decisions and a read on everything they run.
- "asset loans": a cohort of people who borrowed money to buy equipment or stock for their business and are repaying it. Money that customers or clients owe for work done, such as unpaid invoices, bills or fee notes, is not a loan, and is none of these kinds.
- "MarketView where next": a workshop of many people choosing priorities or where to focus next. Choosing between a few options, such as suppliers or vendors, is a decision, which is a situation and none of these kinds.
- "MarketView Q4": a quarter's goals for a product, such as paying subscribers and weekly users, checked against a payments system.
- "a law firm matter": a legal case or matter, with parties, a court and deadlines.
- "a government programme": a government or public programme run through counties or regions and their projects.
- "leadership": a leadership or executive team, such as a chief executive and the directors, agreeing the company's priorities across its teams and where they are not aligned. The lead has to say it is that team. "The business", "the company" or "my team" with something going wrong is not leadership.
- "a funded project": a project paid for by a donor, funder or grant, with a workplan, milestones, a budget, money in and out, and partners or stakeholders to report to.
- "client delivery": work delivered to a client under an agreement, such as a website, a software build or a branding project, with deliverables, approvals, milestones and invoices. Money that clients owe for work already done, such as unpaid invoices, bills or fee notes, is not client delivery: the work is finished and the question is collecting what is owed, so it is none of these kinds.`;

export const HOW_A_KIND_IS_CHOSEN = `Choose a kind only when the lead's words clearly say it. What the check-in is for is why the lead set it up, and it is not a kind of work: a new hire's first weeks, one person's plan, or getting a new project off to a good start, such as moving sites onto a new system, is none of these kinds, unless the lead's own words say the check-in is about that kind of work itself, such as a sales team's deals or a support desk's tickets. Never decide from the job titles of the people in it, or from a place or a word that appears in passing; what the lead says about themselves, such as "founder here", is the lead's own words and counts. When the work is selling and nothing says there are several sales teams, it is a "sales team". When the work is none of these, or you are not sure, give none. A lead who says only that something is wrong, or that they are worried, without saying who is involved or what the work is, has not named a kind: give none, so the conversation asks. A wrong kind is worse than none.`;

/**
 * The lead's words the read is given: the name, the brief, and the end they are working toward; and, where they are known,
 * the job titles of the people in it (release plan, Release 1: a sales team is detected from its words and its job titles).
 */
/*
 * WHAT THE KIND IS READ FROM (Hafsah, 21 November 2026): the check-in's purpose and what the lead said it is for, never the people's job
 * titles. "The new stock system, four depots" (a new project) and "Imani Hassan, first ninety days" (a new hire) were read as
 * "distribution operations" from an operations analyst's title and the word depots; the purpose says what the check-in is.
 */
export function theSetupWords(
  g: { label?: string | null; brief?: string | null; endState?: string | null; resolutionState?: string | null },
  /** What the check-in is for, in the scenario table's words ("Get a new project off to a good start"). */
  purpose?: string | null,
  /**
   * What the lead said at set-up (grounds/what-the-lead-said-at-set-up.ts). A check-in set up in the chat is saved with an empty brief and
   * end state, so without it the reading saw only "A check-in at Drop Access" and gave no kind (existing customers, 22 November 2026).
   */
  atSetUp?: string | null,
): string {
  return [
    purpose ? `What the check-in is for: ${purpose}` : '',
    atSetUp?.trim() ? atSetUp.trim() : '',
    g.label ? `What the lead called it: ${g.label}` : '',
    g.brief ? `What the lead said about it: ${g.brief}` : '',
    g.endState ? `What they are working toward: ${g.endState}` : '',
    g.resolutionState ? `How they hope it ends: ${g.resolutionState}` : '',
  ].filter(Boolean).join('\n\n');
}

// --- Reading records from what people said -----------------------------------------------------

/**
 * A SALES DEAL AND ITS DETAILS (Hafsah, 16 October 2026). What reps say becomes deals and leads on the record, one per
 * customer, with the details the board shows: what it is worth, who they dealt with, and the next step with its day. A lead is
 * a deal at its first stage. The labels are fixed so the board can read them (theValueOf reads "Value"; the next step is read
 * from "Next step" where no commitment names the customer).
 */
export const A_DEAL_AND_ITS_DETAILS = `For a sales team, every customer a line names is one deal, a new lead included: give it once per customer, named only as the business is named ("Savannah Cafe", never "Jane Mwende at Savannah Cafe"; the person goes in Contact), and never as a person in the team. A line that names no business ("two shops on Ngong Road") names no deal. What each stage means: Contacted is a business and a person reached, and a new lead is Contacted; Need established is the customer's need said; Pitched is an offer made with its price; Qualified is a need, a budget the customer stated, who decides and a buying date; Quoted is a quote the customer received; Won is paid or an order signed, and a yes with the payment or the order still to come is not Won. Give the stage the line supports, and none when it does not say. Read every line about a customer together, with the document a line was added with: where one line says the customer signed up and another says it is a verbal yes, or that they will sign later, or the document shows another customer's order, it is not Won. A customer said in two ways in these lines or on record (a short name and a longer one, such as a shop's name with and without the word for shop, where the lines and the documents make clear it is one shop) is one customer: give one record, by the fullest name said, and sameAs where it is on record. Use only these labels for details, each only when the line says it: Value (what the whole deal is worth, such as KES 30,000 for 6 units; never the price of one unit, and never a discount), Price each (the price of one unit, such as KES 4,500, when that is what the line says), Units (how many), Contact (the person they dealt with at the customer), Next step (what happens next, in a few words), Next step by (its day, as said), Buying date (the day the customer said they will buy, as YYYY-MM-DD; it is the customer's date, never the rep's own next step), Need (what the customer needs, in the customer's own words as the line gives them, such as "3 units for the members' area"; a discount or a lower price the customer asks for is never their need), Budget stated (the money the customer said they have or will spend, as said: an amount such as KES 15,000, or a range kept as the range, such as KES 10,000 to 15,000; never the rep's own price or quote), Decision maker (who at the customer decides, by name or by role, such as "the owner" or "Mrs Njeri, the buyer"). A discount the customer asked for is not a value. A line that names only the person at a customer, as the deals on record give them ("Rose said she will buy on October 30th", where Rose is the contact at Mama Mboga Mart), is about that customer's deal: give the deal by its name on record.`;

/**
 * A LOAN AND THE FIGURES THE TRADER GAVE (pilot, Hafsah's ruling of 14 November 2026, build order 3). The loans board draws
 * what each trader said in their own check-in, as said and never as proven. The labels are fixed so the board can read them.
 * The model gives only what the line says; nothing is worked out or added up.
 */
export const A_LOAN_AND_ITS_DETAILS = `For an asset loans cohort, every loan a person speaks of is one loan, named as they name it. Use only these labels for details, each only when the line says it, in the person's own words and figures: Business (what they sell or run), Place (where, such as a market or a town), Sales (what they say they have sold lately, with the amount and the period as said, such as KES 38,000 in four weeks; never a repayment, and never a figure added up from several lines), Repayment (how they say their repayments stand, such as "on time" or "two weeks behind"), In the way (what they say is getting in the way of selling or repaying, as they say it), Next step (what happens next, in a few words). A figure the line does not say is left out.`;

/**
 * A TICKET, INCIDENT OR TASK AND THE FIGURES PEOPLE GAVE ABOUT IT (pilot, tickets family, November 2026). The support, operations and
 * engineering boards draw what people said in their own check-ins, as said and never as proven; a figure a system would count (tickets
 * a week, on-time dispatch, downtime) is kept only where a person said it. The labels are fixed so the board can read them. The model
 * gives only what the line says: nothing is worked out, added up or filled in.
 */
const THE_TICKET_DETAILS_RULE = 'Use only these labels for details, each only when the line says it, in the person\'s own words and figures, and never a figure added up from several lines or worked out';
export const THE_TICKETS_FAMILY_DETAILS: Partial<Record<KindOfWork, string>> = {
  'support desk': `For a support desk, every ticket a line names is one ticket, named as it is named (its number and what it is about). ${THE_TICKET_DETAILS_RULE}: Where it stands (such as waiting on engineering, reopened or passed to engineering), Queue (the group of tickets it sits in), Cause (what caused it, as the person says it), Seen before (how many like it, as said), Within a day (the share or number of tickets answered within a day, with its period and queue, as said), Reopened (how many were opened again, as said), Passed to engineering (how many, as said), Next step (what happens next, in a few words).`,
  'distribution operations': `For an operations team, every incident a line names is one incident, named as it is named. ${THE_TICKET_DETAILS_RULE}: Where it stands (such as repeat or plan missed), Site (the depot or place), Type (what kind of problem it is, in one or two words as said, such as equipment, transport or power), Impact (what it cost, such as hours down or orders late, as said), Cause (as the person says it), Fix (what was done), Prevention (what will stop it happening again), On time (the share of orders on time at the site, as said), Downtime (hours down, as said), Next step (what happens next, in a few words).`,
  'engineering release': `For an engineering team, every task or release a line names is one record, named as it is named. ${THE_TICKET_DETAILS_RULE}: Area (the part of the work it belongs to, such as payments), Done (how far along it is, as said, such as 60% done), Change (what was changed), Test (what testing was done, as said), Deploy (when or whether it went out, as said), Blocked (what it is blocked on, as said), Released (whether it has been released, as said), Next step (what happens next, in a few words).`,
};

/**
 * A PROGRAMME'S GROUPS, COUNTIES AND PRIORITIES, AND THE FIGURES PEOPLE GAVE (pilot, programme family, November 2026). The trader
 * training, government programme and where-next boards draw what people said in their own check-ins, as said and never as proven; a
 * figure a register or an attendance sheet would hold (women in a group, who attended, what was spent) is kept only where a person
 * said it. The labels are fixed so the board can read them. The model gives only what the line says: nothing is worked out, added up
 * or filled in.
 */
export const THE_PROGRAMME_FAMILY_DETAILS: Partial<Record<KindOfWork, string>> = {
  'trader training programme': `For a trader training programme, every group of traders a line names is one group, named as it is named. ${THE_TICKET_DETAILS_RULE}: County (where the group trains), Group size (how many people are in it), Women (how many or what share are women, as said, such as 26 of 42 or 62%), Attended (who came to a check-in, with the check-in, as said, such as 38 of 42 at check-in 2), Completed (how many or what share finished all the check-ins, as said), Reached (how many traders have been reached in a place, as said), Drop-off (where people stopped coming, as said), Why missed (why people missed a check-in, as said), Budget spent (what has been spent, as said), Cost per trainee (as said), Next step (what happens next, in a few words).`,
  'a government programme': `For a government programme, every county and every project a line names is one record, named as it is named, with kind "county" or "project". ${THE_TICKET_DETAILS_RULE}: County (for a project, the county it belongs to), Reached (how many people or farmers have been reached, and any change, as said), Activity (the work done, such as visits made, and any change, as said), In the way (what is holding it back, as said).`,
  'MarketView where next': `For a workshop choosing where to focus next, every priority a person names is one priority, named as they name it. ${THE_TICKET_DETAILS_RULE}: Theme (what the priority is about, in a few words, taken from the person's own words, such as a market, a product or a kind of customer), Would pay (whether they say they would pay, and for what, as said), Next step (what they say should happen next, in a few words).`,
};

/**
 * A FOUNDER'S MONEY, RUNWAY AND WEEKLY FIGURES, AND A QUARTER'S METRICS AND GOALS (pilot, number-tracking family, November 2026). The
 * founder's and the MarketView Q4 boards draw what people said in their own check-ins, as said and never as proven; a figure a bank or
 * a payments system would hold (money, runway, subscribers, weekly users) is kept only where a person said it, and a goal only where a
 * person stated it as theirs. The labels are fixed so the board can read them. The model gives only what the line says: nothing is
 * worked out, added up or filled in.
 */
export const THE_NUMBER_TRACKING_DETAILS: Partial<Record<KindOfWork, string>> = {
  "founder's own check-in": `For a founder's own check-in, the commitments and decisions a line names are records, named as they are named. ${THE_TICKET_DETAILS_RULE}: Money (an amount of money the commitment or decision is about, with its currency and what it is for, as said, such as KES 2.1 million in deals with a signed letter), Runway (how long the money lasts, as said, such as 11 months), Each week (how many the person says they do or will do each week, as said, such as 3 investor emails), Next step (what happens next, in a few words).`,
  'MarketView Q4': `For a quarter's numbers, every metric a line states is one record with kind "metric", named as it is named (such as paid subscriptions or weekly users), and it is separate from a subscription. ${THE_TICKET_DETAILS_RULE}: Said (the figure the person gives for it now, as said, such as 31 or 31 of 40), Goal (the goal a person states for it, as said, such as 40 or 40 this quarter; never a figure the person gives only as where it is now), Source (where the person says the figure comes from, such as Paystack, as said).`,
};

export function theRecordsPrompt(kind: KindOfWork): string {
  const sections = RECORDS_FOR_EACH_KIND[kind].filter((s) => s.itemKinds.length);
  const lines = sections.map((s) => `- ${s.holds} (give kind as one of: ${s.itemKinds.map((k) => `"${k}"`).join(', ')})${s.stages ? `. Stages, in order: ${s.stages.join(', ')}` : ''}`);
  return `You are reading lines people said in a check-in about ${kind === "founder's own check-in" ? 'their own work' : `a ${kind.replace(/^a /, '')}`}, to pick out the records its board keeps:
${lines.join('\n')}

Each line has an id. For every record a line names, give the id of the line, the kind, and the record's name as it was said in that line, word for word, such as a customer's name, a release's name, a ticket, a county or a party. Give a stage only when the line says it, using one of the stages above. Give a due date only when the line says one, as YYYY-MM-DD. Give other details only when the line says them, as short label and value pairs, such as Value and KES 90K.

${isASalesKind(kind) ? `${A_DEAL_AND_ITS_DETAILS}\n\n` : ''}${kind === 'asset loans' ? `${A_LOAN_AND_ITS_DETAILS}\n\n` : ''}${THE_TICKETS_FAMILY_DETAILS[kind] ? `${THE_TICKETS_FAMILY_DETAILS[kind]}\n\n` : ''}${THE_PROGRAMME_FAMILY_DETAILS[kind] ? `${THE_PROGRAMME_FAMILY_DETAILS[kind]}\n\n` : ''}${THE_NUMBER_TRACKING_DETAILS[kind] ? `${THE_NUMBER_TRACKING_DETAILS[kind]}\n\n` : ''}Leave out anything the line does not say. Never make up a record, a name, a stage or a date. When no line names a record, give an empty list.

Each line says who said it. Every record is the speaker's own; do not give an owner.

${PLAIN_WORDS}`;
}

export const THE_RECORDS_SCHEMA = {
  name: 'emit_work_records',
  description: 'Emit the records the lines name.',
  input_schema: {
    type: 'object',
    properties: {
      records: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            lineId: { type: 'string' },
            kind: { type: 'string' },
            name: { type: 'string' },
            stage: { type: 'string' },
            due: { type: 'string' },
            details: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } } },
            sameAs: { type: 'string', description: 'The id of the item on record this line is about, when it is one of them: the same customer or thing, however it is named ("Mama Rose" and "Mama Rose\'s kiosk"). Omit when it is new.' },
          },
          required: ['lineId', 'kind', 'name'],
        },
      },
    },
    required: ['records'],
  },
};

export interface AnOfferedRecord {
  lineId?: string;
  kind?: string;
  name?: string;
  stage?: string;
  due?: string;
  /** The person the line names as the one whose record it is, when that is not the speaker. */
  owner?: string;
  details?: { label?: string; value?: string }[];
  /** The item on record it is, by id, as the model read it. */
  sameAs?: string;
}

/** A person in the check-in, with the names a line may call them by. */
export interface APersonALineMayName {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  nameGiven?: string | null;
}

const aWord = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const theNamesOf = (p: APersonALineMayName): string[] => {
  const full = [p.firstName, p.lastName].map((x) => (x ?? '').trim()).filter(Boolean).join(' ');
  const given = (p.nameGiven ?? '').trim();
  return [...new Set([full, (p.firstName ?? '').trim(), given, given.split(/\s+/)[0] ?? ''].filter((n) => n.length >= 2))];
};
const saysTheName = (text: string, name: string) => new RegExp(`(?:^|[^\\p{L}])${aWord(name)}(?=$|[^\\p{L}])`, 'iu').test(text);

/**
 * WHOSE A RECORD IS: ALWAYS THE SPEAKER'S (run-26, replacing item 21's rule that let the model give another owner).
 * Item 21, the founder's board, had let it be the person the speaker names (Ada's "Tunde ... is taking on everything
 * engineering" was Tunde's). In run-26 that broke: Musa's "I signed for the loan" became Sunday's record and reached
 * Sunday's board. So the model's offered owner is never used.
 */
export function theOwnerTheLineNames(
  offered: string | null | undefined,
  line: { text: string; participantId: string },
  people: readonly APersonALineMayName[] | null | undefined,
): string {
  /* A record is always owned by the person who said it (run-26, Hafsah's release instruction). What the model offers as
     an owner is never used; this keeps the signature so older callers compile. */
  void offered; void people;
  return line.participantId;
}

const squash = (s: string) => s.toLowerCase().replace(/[‘’“”'"]/g, '').replace(/\s+/g, ' ').trim();

/*
 * A WORD THAT POINTS AT SOMETHING ELSE IS NOT A RECORD'S NAME (item 21, the engineering board). Ifeoma's task list
 * held rows named "it" ("I expect it to take about five weeks."), "that migration" and "this": a name that is only a
 * pronoun, or "that", "this", "these" or "those" before one or two words, names nothing anybody could find again. Not
 * kept when a check-in is read, and not served from rows already stored.
 */
const ONLY_POINTS_ELSEWHERE = /^(?:it|its|this|that|these|those|them|they|he|she|him|her|one|ones|something|everything|anything|the same|(?:this|that|these|those|which|what)(?:\s+[\p{Ll}-]+){1,2}|(?:\d+|some|all|most|many|few|each|one|two|three|four|five|six|seven|eight|nine|ten)\s+of\s+(?:those|these|them|it|that))$/u;
/*
 * ONE THING UNDER TWO ARTICLES IS ONE RECORD (item 21, the law firm matter). Adaeze's deadlines held "a four-hour
 * acknowledgement" and "the four-hour acknowledgement" as two rows. A name is compared without a leading "a", "an" or
 * "the", and without its case.
 */
/* And "to improve our customer retention" is "improve our customer retention" (the where-next board's themes). */
export const theSameName = (name: string | null | undefined): string => squash(String(name ?? '').replace(/^\s*(?:a|an|the|to)\s+/i, ''));

export function aNameThatNamesSomething(name: string | null | undefined): boolean {
  const n = (name ?? '').trim().replace(/[.,;:!?]+$/, '');
  /* "something I don't have" (the loans board): a name that starts with "something" names nothing. */
  if (/^(?:something|anything|nothing|everything)\b/i.test(n)) return false;
  /* "two shops on Ngong Road" (Drop Access, 16 October): a count of places names no customer anybody could find again. */
  if (/^(?:\d+|a few|a couple of|some|several|many|two|three|four|five|six|seven|eight|nine|ten)\s+(?:other\s+|new\s+|more\s+)?(?:shops?|stores?|customers?|businesses|business|hotels?|supermarkets?|clients?|leads?|offices?|kiosks?|outlets?|places?)\b/i.test(n)) return false;
  return !!n && !ONLY_POINTS_ELSEWHERE.test(n.charAt(0).toLowerCase() + n.slice(1));
}

/**
 * ONLY WHAT THE LINE SAYS. A record the model offers is kept only when its line is one of the lines
 * it was given, its kind belongs to this kind of work, and its name is in that line's words. A stage
 * must be one of the stages; a date must be a real date. Everything else is dropped, never guessed.
 */
/* A line that names a business of its own ("Ngong Road Minimart wants ...") does not go on from the line before it. */
const A_CUSTOMER_NAMED = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Cafe|Gym|Hotel|Stores?|Shop|Mart|Minimart|Supermarket|Hardware|Electricals|Offices|Supplies|Spa|Fresh|Foods|Deli|Butchery|Ltd|Limited)\b/;

export function onlyRecordsTheLinesSay(
  kind: KindOfWork,
  offered: AnOfferedRecord[] | null | undefined,
  lines: { id: string; text: string; participantId: string }[],
  leadsStages: unknown,
  /** The people in the check-in, so a record the speaker says is somebody else's is theirs. See theOwnerTheLineNames. */
  people: readonly APersonALineMayName[] = [],
  /** The deals on record, so a line that names only a deal's contact ("Rose said she will buy") is about that deal (point 6). */
  dealsOnRecord: readonly { name: string; fields?: Record<string, string> | null; ownerParticipantId?: string | null }[] = [],
): { kind: string; name: string; stage: string | null; dueAt: Date | null; fields: Record<string, string>; sourceEntryId: string; ownerParticipantId: string }[] {
  const byId = new Map(lines.map((l) => [l.id, l]));
  const allowed = new Set(itemKindsFor(kind));
  const out: ReturnType<typeof onlyRecordsTheLinesSay> = [];
  const seen = new Set<string>();
  for (const r of offered ?? []) {
    const line = r.lineId ? byId.get(r.lineId) : undefined;
    const name = (r.name ?? '').trim();
    if (!line || !r.kind || !allowed.has(r.kind) || !name || name.length > 120 || !aNameThatNamesSomething(name)) continue;
    if (!squash(line.text).includes(squash(name))) {
      /* A line that names only the contact at a customer the speaker already has on record is about that deal (Hafsah's point 6). */
      const theirs = r.kind === 'deal' ? dealsOnRecord.find((d) => squash(d.name) === squash(name) && (!d.ownerParticipantId || d.ownerParticipantId === line.participantId)) : undefined;
      /*
       * AN ANSWER THAT GOES ON FROM THE LINE BEFORE IT (the four criteria, Drop Access test bed, 18 October). Joseph said "Juja
       * Hardware: I met Mr Kariuki again, he still wants 5 units." and then "He has about KES 22,500 for the 5 units.", which names
       * nobody. A deal line that names no customer is about the deal that the same person's line just before it, in this check-in,
       * named. Only the line just before, and only by the same person.
       */
      const at = lines.indexOf(line);
      const before = at > 0 ? lines[at - 1] : null;
      const goesOn = r.kind === 'deal' && !!before && before.participantId === line.participantId && !A_CUSTOMER_NAMED.test(line.text)
        && (squash(before.text).includes(squash(name)) || (!!theirs && aLineIsAbout(before.text, theirs)));
      if (!goesOn && (!theirs || !aLineIsAbout(line.text, theirs))) continue;
    }
    /* A person in the check-in is never a customer, a deal or any other record (pilots after fixes, 14 October): Joseph's
       "She wants 12,000 for 10 units" became a deal called "Mercy". */
    if (isOneOfThePeople(name, people)) continue;
    const section = RECORDS_FOR_EACH_KIND[kind].find((s) => s.itemKinds.includes(r.kind!))!;
    const stages = stagesFor(section, leadsStages) ?? [];
    const stage = stages.find((s) => s.toLowerCase() === (r.stage ?? '').trim().toLowerCase()) ?? null;
    const due = /^\d{4}-\d{2}-\d{2}$/.test((r.due ?? '').trim()) ? new Date(`${r.due!.trim()}T00:00:00.000Z`) : null;
    let fields = plainFields(Object.fromEntries((r.details ?? []).map((d) => [d?.label ?? '', d?.value ?? ''])));
    if (isASalesKind(kind) && r.kind === 'deal') {
      /*
       * The value is the whole deal's: a price for one unit or a discount is kept under its own name (Hafsah's point 5). And only
       * the units and value this line says, or the same person's line just before it that it goes on from (Drop Access run 1, A2:
       * "Units: 40" was written on Juja Hardware from "I can ask Grace again. I'll do it today.").
       */
      const at = lines.indexOf(line);
      const before = at > 0 && lines[at - 1].participantId === line.participantId ? [lines[at - 1].text] : [];
      fields = withTheValueWorkedOut(fields, [line.text, ...before], { onlyNumbersSaid: true });
      /* A buying date is a real day, or it is not kept; where the model gave none, the line's own words are read for one (point 6). */
      const given = theBuyingDateOf(fields);
      delete fields[BUYING_DATE];
      const day = given ?? aBuyingDateSaid(line.text, new Date());
      if (day) fields[BUYING_DATE] = day;
    }
    const key = `${r.kind}|${squash(name)}|${line.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: r.kind, name, stage, dueAt: due && !isNaN(due.getTime()) ? due : null, fields, sourceEntryId: line.id, ownerParticipantId: theOwnerTheLineNames(r.owner, line, people) });
  }
  return out;
}

/** Whether a record's name is only a person in the check-in: their first name, their full name, or the name given for them. */
export function isOneOfThePeople(name: string, people: readonly APersonALineMayName[]): boolean {
  const n = squash(name.replace(/['’]s$/i, ''));
  if (!n) return false;
  return people.some((p) => {
    const first = squash(p.firstName ?? '');
    const full = squash([p.firstName, p.lastName].filter(Boolean).join(' '));
    const given = squash(p.nameGiven ?? '');
    return (!!first && n === first) || (!!full && n === full) || (!!given && n === given);
  });
}
