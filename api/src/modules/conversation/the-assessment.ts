/**
 * ONE ASSESSMENT PER CONVERSATION (Hafsah's brief of 31 October 2026, layer 1; docs/fix-plan.md, "One assessment per conversation").
 *
 * WHAT IT IS. After a setup or a check-in is finished, one model call reads the whole conversation and fills every part of
 * Hafsah's list: what it was, a summary, each piece of work and how it moved, each claim and whether it is proved, each
 * promise in the person's own words, each number with its unit, the people and organisations, dates, decisions, blockers
 * and waits, corrections, documents, for setup the objective and everything around it, what the person actually did (role
 * signals), the area each item belongs to, observations (never judgements), the facts compared with that person's last
 * assessment, what is still open, and everything else. Every item carries the person's own words, the message it came from,
 * who may see it, and its history when it is corrected.
 *
 * THE COMPLETENESS CHECK. Every message the person sent is matched to items, or marked "nothing to record". Anything the
 * first read left unmatched is read again on its own (a second call only for those), and anything still unmatched is kept
 * whole, in their words, under everything else. Only then is the assessment marked ready, so nothing they said is lost.
 *
 * WHERE IT LIVES. `CheckIn.sessionReport`, the per-session Json column that setup already wrote its report into. The
 * assessment is kept there as a versioned envelope, and setup's report stays inside it whole, as `reportTheyRead`, so the
 * report a lead read at the end of setup opens exactly as before. `theReportTheyRead` is the only way the column is served
 * (a-transcript-serves-only-what-is-theirs.ts and getSessionReport), so the assessment itself reaches nobody.
 *
 * ITS DRAFT. The per-turn note (`CheckIn.whatWeHave`) and the end card's single extraction (`ConversationTurn.recordDraft`)
 * are given to the read as its draft, so no new call is added during the conversation.
 *
 * This file is pure: the shape, the envelope, the prompt, the material, the reading of the answer and the completeness
 * check. assess-the-conversation.ts loads, calls and stores.
 */
import { createHash } from 'crypto';
import { READ_WHAT_THEY_PROMISED } from './what-they-said-they-would-do-next';
import { DEPENDENCY_EXTRACTION_PROMPT, READ_THE_AIMS } from './prompt-library';
import { READ_WHAT_HAPPENED } from './what-happened-to-what-they-said';

export const THE_ASSESSMENT_KIND = 'assessment' as const;
export const THE_ASSESSMENT_VERSION = 1 as const;
/** The PromptVersion key a stored version of the assessment's instructions would use. None is seeded, so the file's words run. */
export const ASSESSMENT_PROMPT_KEY = 'assessment';

/** How the conversation ended. */
export type HowItEnded = 'finished by the person' | 'closed by the clock' | 'declined' | 'setup saved' | 'missed';

/**
 * WHO MAY SEE AN ITEM, decided by the item's kind in code, never by the model (privacy is a fixed rule, CLAUDE.md).
 *   - 'the people in this check-in': what a person says in a check-in can be shown word for word to the people in it.
 *   - 'the lead only': the lead's private notes on each person, the team as the lead described it, risks the lead named,
 *     observations and role and focus reads (a participant never reads the lead's judgement).
 *   - 'the person only': nothing yet; kept for the person's own report.
 */
export type WhoMaySee = 'the people in this check-in' | 'the lead only' | 'the person only';

/** One message the person sent, numbered from 1 in the order they sent it. Setup's words come first, then the check-in's. */
export interface AMessage {
  n: number;
  /** The ConversationTurn id, or null for a setup message (setup's own turns are kept in LeadSetupWords, not as turns). */
  turnId: string | null;
  where: 'setup' | 'check-in';
  at: string | null;
}

export interface AHistoryStep {
  /** When it changed. */
  on: string;
  /** The check-in whose assessment changed it. */
  inCheckInId: string;
  /** What it said before. */
  said: string;
  /** What it says now. */
  nowSays: string;
  /** Whether the change is backed by proof or the record. */
  backed: boolean;
}

/** What every item carries. */
export interface AnItem {
  id: string;
  /** The person's own words, as they typed them. */
  words: string;
  /** The messages it came from. */
  from: number[];
  whoMaySee: WhoMaySee;
  /** Its history when it was corrected, oldest first. */
  history?: AHistoryStep[];
  /** True where the words were found word for word in the messages they point at. */
  saidWordForWord: boolean;
  [field: string]: unknown;
}

export interface TheSetupPart {
  objective: AnItem[];
  success: AnItem[];
  team: AnItem[];
  timing: AnItem[];
  rules: AnItem[];
  risks: AnItem[];
  privateNotes: AnItem[];
}

export interface ComparedWithLastTime {
  /** The assessment compared against, or null when this is their first. */
  previousCheckInId: string | null;
  previousOn: string | null;
  promisesDue: AnItem[];
  figuresChanged: AnItem[];
  workMoved: AnItem[];
  blockers: AnItem[];
  repeated: AnItem[];
  disagreements: AnItem[];
}

/** The sections that are lists of items, in the order of Hafsah's list. */
export const THE_ITEM_SECTIONS = [
  'workUpdates', 'claims', 'promises', 'numbers', 'people', 'dates', 'decisions', 'blockers', 'corrections', 'documents',
  'roleSignals', 'areas', 'observations', 'stillOpen', 'everythingElse', 'targets',
] as const;
export type AnItemSection = typeof THE_ITEM_SECTIONS[number];
export const THE_SETUP_SECTIONS = ['objective', 'success', 'team', 'timing', 'rules', 'risks', 'privateNotes'] as const;
export const THE_COMPARED_SECTIONS = ['promisesDue', 'figuresChanged', 'workMoved', 'blockers', 'repeated', 'disagreements'] as const;

export interface TheAssessment {
  kind: typeof THE_ASSESSMENT_KIND;
  version: typeof THE_ASSESSMENT_VERSION;
  /** About it: who, which check-in, date and time, channel, how it ended. */
  about: {
    checkInId: string;
    groundId: string;
    participantId: string;
    who: string;
    isTheLead: boolean;
    checkIn: string | null;
    sessionNumber: number;
    startedAt: string | null;
    endedAt: string | null;
    channel: 'the app' | 'WhatsApp' | 'the API' | 'setup' | 'not known';
    howItEnded: HowItEnded;
  };
  /** Two or three plain sentences. */
  summary: string;
  workUpdates: AnItem[];
  claims: AnItem[];
  promises: AnItem[];
  numbers: AnItem[];
  people: AnItem[];
  dates: AnItem[];
  decisions: AnItem[];
  blockers: AnItem[];
  corrections: AnItem[];
  documents: AnItem[];
  setup: TheSetupPart | null;
  roleSignals: AnItem[];
  /** The role they are actually playing, against the role they were given, read from this conversation only. */
  roleAgainstGiven: { given: string | null; playing: string | null; fits: 'fits' | 'differs' | 'cannot tell' } | null;
  areas: AnItem[];
  observations: AnItem[];
  comparedWithLastTime: ComparedWithLastTime;
  stillOpen: AnItem[];
  everythingElse: AnItem[];
  /** What the check-in as a whole, and each person in it, is aiming at, read by the rules for aims (READ_THE_AIMS). */
  targets: AnItem[];
  /** The messages, numbered, and which were marked "nothing to record". */
  messages: AMessage[];
  nothingToRecord: number[];
  /** The completeness check, as it ran. */
  completeness: {
    messages: number;
    matchedByTheFirstRead: number;
    addedByTheSecondRead: number;
    keptWhole: number;
    ready: boolean;
  };
  /** Which instructions ran: the stored PromptVersion's id, or the file's words by their hash. */
  promptVersionId: string | null;
  promptFromFile: string | null;
  /** The cost and the time, for the with-against-without test. */
  measure: { modelCalls: number; msFromCloseToReady: number; readyAt: string; modelFailed: boolean };
  /** Layer 2: patterns across this person's assessments, computed when this one was written. Never decided inside one. */
  acrossTime?: unknown[];
  /** Layer 3: the next step for each pattern, tracked from assessment to assessment. */
  interventions?: unknown[];
}

/* ---------------------------------------------------------------------------------------------------------------------
 * THE ENVELOPE. One reader and one writer for the column, so the column has one owner.
 * ------------------------------------------------------------------------------------------------------------------- */

export interface TheStoredColumn extends TheAssessment {
  /** Setup's report, exactly as the lead read it at the end of setup, when there was one. */
  reportTheyRead?: unknown;
}

/** The assessment kept in the column, or null when the column holds none (an older setup report, or nothing). */
export function theAssessmentIn(column: unknown): TheStoredColumn | null {
  const c = column as any;
  return c && typeof c === 'object' && c.kind === THE_ASSESSMENT_KIND && typeof c.version === 'number' ? (c as TheStoredColumn) : null;
}

/**
 * THE REPORT A PERSON READ, WHICH IS ALL OF THE COLUMN ANYBODY IS EVER SERVED. An older setup report is the whole column; in
 * the envelope it is `reportTheyRead`; an assessment with no report under it serves nothing.
 */
export function theReportTheyRead(column: unknown): unknown {
  if (column == null) return null;
  const a = theAssessmentIn(column);
  if (!a) return column;
  return a.reportTheyRead ?? null;
}

/** The column to write: the assessment, with the report the person read kept inside it whole. */
export function theColumnWith(assessment: TheAssessment, columnBefore: unknown): TheStoredColumn {
  const report = theReportTheyRead(columnBefore);
  return { ...assessment, ...(report != null ? { reportTheyRead: report } : {}) };
}

/* ---------------------------------------------------------------------------------------------------------------------
 * WHO MAY SEE EACH SECTION.
 * ------------------------------------------------------------------------------------------------------------------- */

const THE_LEADS_ONLY: ReadonlySet<string> = new Set([
  'observations', 'roleSignals', 'areas', 'setup.team', 'setup.risks', 'setup.privateNotes',
  'compared.disagreements',
]);

export function whoMaySee(section: string): WhoMaySee {
  return THE_LEADS_ONLY.has(section) ? 'the lead only' : 'the people in this check-in';
}

/* ---------------------------------------------------------------------------------------------------------------------
 * THE INSTRUCTIONS. The promise and wait rules are the ones the separate readers used, quoted whole, so the rules have one
 * home and the assessment reads promises and waits exactly as they were read before.
 * ------------------------------------------------------------------------------------------------------------------- */

export const THE_ASSESSMENT_PROMPT = [
  'You are writing the assessment of ONE conversation Groundwork has just finished with one person. It is internal: nobody reads it as it is. Everything else in Groundwork reads from it, so anything you leave out is lost.',
  '',
  'You are given the person\'s messages, numbered, each after the question it answered; what Groundwork noted during the conversation (a draft, which may be wrong or incomplete); the lines its end card took out (also a draft); and, where there is one, this person\'s previous assessment.',
  '',
  'FOR EVERY ITEM:',
  '  - `words` is the person\'s own words, copied exactly from their messages, as short as still makes sense. Never your paraphrase. Keep their punctuation and quotation marks.',
  '  - `from` is the number of every message the item came from.',
  '  - Write any other field in plain, short English that a colleague with basic English understands.',
  '',
  'EVERY MESSAGE IS ACCOUNTED FOR. Each message number must appear in the `from` of at least one item, or in `nothingToRecord` when it holds nothing to record (a greeting, "ok", a remark about Groundwork itself). When unsure, record it under everythingElse rather than leave it out.',
  '',
  'THE SECTIONS:',
  '  - summary: two or three plain sentences on what this conversation established.',
  '  - workUpdates: each piece of work mentioned, with its stage, value, dates, the next step, the day of the next step and who owns it, as far as they said.',
  '  - claims: each thing they say is true or done. `proof` is "proved" only when they gave or pointed to proof (a document, a photo, a number someone else confirmed); otherwise "said". `proofIs` says what the proof is.',
  '  - promises: each thing somebody said they would do. `byThePerson` is true only for this person\'s own promises. For this person\'s own, the rules below apply.',
  '  - numbers: each figure, what it measures, its unit, and where it came from.',
  '  - people: each person and organisation mentioned, with their role, and how the speaker spoke of them (praise, criticism or neutral), only from their words.',
  '  - dates: each date or deadline, as they said it.',
  '  - decisions: each decision made or waiting, and who decides.',
  '  - blockers: each thing this person is waiting on or blocked by. The rules below apply. `since` is when it started, as they said it, and `sinceDay` is that day as a date (YYYY-MM-DD), worked out from their words and the day of the conversation; null when they did not say when it started.',
  '  - corrections: anything they said the record, the board or Groundwork has wrong: what it said, what it should say, and whether they backed it. Where it corrects an item of the previous assessment, `correctsItem` is that item\'s id.',
  '  - documents: each document or photo they added or pointed to: what it says, what it proves, and where it belongs.',
  '  - targets: what the check-in as a whole is aiming at, and each number somebody is aiming at, by the rules for aims below. In every conversation, setup or check-in.',
  '  - setup (only when setup material is given): the objective, what success looks like, the team and their roles, working days and timing, rules and definitions, risks, and the lead\'s private notes on each person.',
  '  - roleSignals: what the person actually did or talked about doing: tasks, decisions, who they dealt with, what they owned.',
  '  - roleAgainstGiven: from this conversation only, the role they are actually playing, and whether it fits the role they were given ("cannot tell" when the conversation does not show it).',
  '  - areas: each item tagged with the area of work it belongs to (a client, a product, a project, admin and so on), and whether it fits one of the team\'s priorities, where they are given.',
  '  - observations: what you noticed, as facts and never as judgements: a vague answer, a question they avoided, signs of overload. Quote their words.',
  '  - comparedWithLastTime (only when a previous assessment or open promises are given; facts only): promisesDue has one item for EACH open promise on the record, with its id in `previousItem`, saying what happened to it (kept; not kept, which includes a promise whose day has passed that they now promise again for later; not mentioned; or still open, in progress or given a new date before its day passed) and `happened` by the rules below; figures that changed with both values and the date of the earlier one, work that moved or did not, blockers new, still there or cleared, anything repeated and how many times, and where what they said disagrees with the record or with someone else. Use the previous item\'s id in `previousItem` where there is one.',
  '  - stillOpen: what is still open, to ask next time.',
  '  - everythingElse: everything else they said, so nothing falls through.',
  '',
  'RULES FOR THIS PERSON\'S OWN PROMISES (the same rules Groundwork has always read promises by):',
  READ_WHAT_THEY_PROMISED,
  'In a promise item, `action` follows these rules, `clear`, `outcome` and `when` too, and `whatItMeans` is what "it" or "that" means where they were asked.',
  '',
  'RULES FOR WHAT HAPPENED TO EACH OPEN PROMISE (`happened` in promisesDue; the same rules Groundwork has always read them by; `words` are the words that say what happened):',
  READ_WHAT_HAPPENED,
  '',
  'RULES FOR AIMS (`targets`; the same rules Groundwork has always read aims by; `words` are the words that hold the aim and its number):',
  READ_THE_AIMS,
  'In a target item, `target` is the number only, `unit` what it counts, `by` when, in their words, and `whose` the first name of whoever holds it, or "The team".',
  '',
  'RULES FOR BLOCKERS AND WAITS (the same rules Groundwork has always read waits by):',
  DEPENDENCY_EXTRACTION_PROMPT,
].join('\n');

/** The instructions' own fingerprint, recorded on every assessment written from the file's words. */
export function theFilesPromptVersion(content: string = THE_ASSESSMENT_PROMPT): string {
  return `file:${ASSESSMENT_PROMPT_KEY}@${createHash('sha256').update(content).digest('hex').slice(0, 12)}`;
}

/* ---------------------------------------------------------------------------------------------------------------------
 * THE SCHEMA.
 * ------------------------------------------------------------------------------------------------------------------- */

const S = (description: string) => ({ type: ['string', 'null'], description });
const anItem = (props: Record<string, any>) => ({
  type: 'array',
  items: {
    type: 'object',
    properties: {
      words: { type: 'string', description: 'Their own words, copied exactly.' },
      from: { type: 'array', items: { type: 'integer' }, description: 'The message numbers it came from.' },
      ...props,
    },
    required: ['words', 'from'],
  },
});

export const THE_ASSESSMENT_SCHEMA = {
  name: 'emit_the_assessment',
  description: 'The full assessment of one conversation: every part, every item with their own words and the messages it came from.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Two or three plain sentences.' },
      workUpdates: anItem({ work: S('The piece of work.'), area: S('Its area.'), stage: S('Its stage.'), value: S('Its value, with the unit.'), dates: S('Its dates, as said.'), nextStep: S('The next step.'), nextStepDay: S('The day of the next step, as said.'), nextStepOwner: S('Who owns the next step.') }),
      claims: anItem({ claim: S('What they say is true or done.'), proof: { type: 'string', enum: ['proved', 'said'] }, proofIs: S('What the proof is.') }),
      promises: anItem({
        byThePerson: { type: 'boolean', description: 'True only when this person promised it themselves.' },
        who: S('Who promised it.'), action: S('The action, their words.'), clear: S('The same promise as one clear action.'),
        outcome: S('What it is for, only if they said.'), when: S('The timing, their words.'), whatItMeans: S('What "it" means, where they were asked.'),
      }),
      numbers: anItem({ figure: S('The figure.'), measures: S('What it measures.'), unit: S('Its unit.'), source: S('Where it came from.') }),
      people: anItem({ name: S('The name.'), kind: { type: 'string', enum: ['person', 'organisation'] }, role: S('Their role.'), organisation: S('Their organisation.'), spokenOf: { type: 'string', enum: ['praise', 'criticism', 'neutral'] } }),
      dates: anItem({ when: S('The date, as said.'), what: S('What it is for.') }),
      decisions: anItem({ decision: S('The decision.'), state: { type: 'string', enum: ['made', 'waiting'] }, whoDecides: S('Who decides.') }),
      blockers: anItem({
        what: S('What they wait for, reading after the word "for".'), namedTheThing: { type: 'boolean' }, onName: S('The person waited on.'),
        onLabel: S('What is waited on when not a person.'), status: { type: 'string', enum: ['BLOCKING', 'WAITING', 'CLEARED'] },
        then: S('What happens once it clears.'), triedSaid: S('What they said they already did, their words.'), dueSaid: S('When it is due, their words.'), since: S('Since when, as said.'), sinceDay: S('The day it started, YYYY-MM-DD, from their words and the day of the conversation.'),
      }),
      corrections: anItem({ recordSaid: S('What the record said.'), shouldSay: S('What it should say.'), backed: { type: 'boolean' }, correctsItem: S('The id of the previous assessment\'s item it corrects.') }),
      documents: anItem({ name: S('The document or photo.'), says: S('What it says.'), proves: S('What it proves.'), filedOn: S('Where it belongs.') }),
      setup: {
        type: 'object',
        properties: {
          objective: anItem({ objective: S('The objective.') }),
          success: anItem({ success: S('What success looks like.') }),
          team: anItem({ name: S('The person.'), role: S('Their role.') }),
          timing: anItem({ timing: S('Working days, times and how often.') }),
          rules: anItem({ rule: S('A rule or definition.') }),
          risks: anItem({ risk: S('A risk.') }),
          privateNotes: anItem({ about: S('Who the note is about.'), note: S('The lead\'s note.') }),
        },
      },
      roleSignals: anItem({ did: S('What they did or owned.') }),
      roleAgainstGiven: { type: 'object', properties: { playing: S('The role they are actually playing.'), fits: { type: 'string', enum: ['fits', 'differs', 'cannot tell'] } } },
      areas: anItem({ item: S('The item.'), area: S('Its area.'), fitsAPriority: { type: 'string', enum: ['yes', 'no', 'unclear'] } }),
      observations: anItem({ observed: { type: 'string', enum: ['vague answer', 'avoided question', 'overload', 'other'] }, what: S('What was noticed, as a fact.') }),
      comparedWithLastTime: {
        type: 'object',
        properties: {
          promisesDue: anItem({ promise: S('The promise.'), previousItem: S('Its id, as given.'), outcome: { type: 'string', enum: ['kept', 'not kept', 'not mentioned', 'still open'] }, happened: { type: 'string', enum: ['DONE', 'NOT_DONE', 'OPEN'] } }),
          figuresChanged: anItem({ what: S('What it measures.'), before: S('The earlier value.'), beforeOn: S('The date of the earlier value.'), now: S('The value now.'), previousItem: S('Its id.') }),
          workMoved: anItem({ work: S('The work.'), moved: { type: 'boolean' }, how: S('How it moved.'), previousItem: S('Its id.') }),
          blockers: anItem({ what: S('The blocker.'), state: { type: 'string', enum: ['new', 'still there', 'cleared'] }, previousItem: S('Its id.') }),
          repeated: anItem({ what: S('What was said again.'), times: { type: 'integer' } }),
          disagreements: anItem({ what: S('What they said.'), otherSays: S('What the record or someone else says.') }),
        },
      },
      targets: anItem({ aim: S('The aim as one plain, full sentence about whoever holds it, by first name, or "The team".'), target: { type: ['number', 'null'], description: 'The number aimed at, only where they said one.' }, unit: S('What it counts.'), by: S('By when, in their words.'), whose: S('Whose aim: a first name, or "The team".') }),
      stillOpen: anItem({ question: S('What to ask next time.') }),
      everythingElse: anItem({ what: S('What it is about.') }),
      nothingToRecord: { type: 'array', items: { type: 'integer' }, description: 'Message numbers with nothing to record.' },
    },
    required: ['summary', 'nothingToRecord'],
  },
} as const;

/* ---------------------------------------------------------------------------------------------------------------------
 * THE MATERIAL GIVEN TO THE READ.
 * ------------------------------------------------------------------------------------------------------------------- */

export interface TheMaterial {
  who: string;
  isTheLead: boolean;
  /** THE PERSON SPEAKING, by first name (the-person-speaking.ts), so an aim is a sentence about them by name. */
  speaking?: string;
  checkIn: string | null;
  /** The day of the conversation, YYYY-MM-DD, so "since last Thursday" can be read as a day. */
  on?: string | null;
  givenRole: string | null;
  priorities: string[];
  /** Every turn in order; person turns carry their number. */
  turns: { role: 'person' | 'groundwork'; content: string; n?: number }[];
  /** Setup's words, numbered first, and what setup was given beside them (the lead's notes on each person, the timing). */
  setup: { words: { n: number; content: string }[]; given: string[] } | null;
  /** The lead's documents that everybody on the check-in may open, read with her words (never a private one). */
  documents?: { name: string; content: string }[];
  /** The per-turn note's claims and the end card's lines, as a draft. */
  draft: { claims: string[]; lines: string[] };
  /** The previous assessment's items, with their ids, to compare against. */
  previous: { checkInId: string; on: string | null; items: { id: string; text: string }[] } | null;
  /** The promises open on the record from before this check-in (GroundCommitment, the owner of a promise's state), with their ids. */
  openPromises: { id: string; text: string; whenSaid: string | null; saidOn?: string | null }[];
}

/** How an open promise on the record is named to the read, and read back. */
export const aPromisesId = (commitmentId: string) => `c:${commitmentId}`;

export function theMaterialAsText(m: TheMaterial): string {
  const out: string[] = [];
  if (m.speaking) out.push(m.speaking);
  out.push(`The person: ${m.who}${m.isTheLead ? ', who leads this check-in' : ''}.`);
  if (m.checkIn) out.push(`The check-in: ${m.checkIn}.`);
  if (m.on) out.push(`The day of the conversation: ${m.on}.`);
  out.push(`The role they were given: ${m.givenRole ?? 'not known'}.`);
  if (m.priorities.length) out.push('', 'THE TEAM\'S PRIORITIES:', ...m.priorities.map((p) => `  - ${p}`));
  if (m.setup) {
    out.push('', 'SETUP MATERIAL (the lead setting this check-in up):');
    for (const w of m.setup.words) out.push(`[${w.n}] THE LEAD, IN SETUP: ${w.content}`);
    if (m.setup.given.length) out.push('What the lead gave in setup beside the conversation:', ...m.setup.given.map((g) => `  - ${g}`));
  }
  if (m.documents?.length) {
    out.push('', 'WHAT THE LEAD ATTACHED, WHICH EVERYBODY ON THE CHECK-IN MAY OPEN (hers as surely as her words; read it for the targets and the setup, citing no message):');
    for (const d of m.documents) out.push(`[Document: "${d.name}"]`, d.content);
  }
  out.push('', 'THE CONVERSATION:');
  for (const t of m.turns) out.push(t.role === 'person' ? `[${t.n}] THE PERSON: ${t.content}` : `GROUNDWORK: ${t.content}`);
  if (m.draft.claims.length || m.draft.lines.length) {
    out.push('', 'THE DRAFT (noted during the conversation and on the end card; check it against their words):');
    for (const c of m.draft.claims) out.push(`  - ${c}`);
    for (const l of m.draft.lines) out.push(`  - ${l}`);
  }
  if (m.openPromises.length) {
    out.push('', 'THEIR PROMISES STILL OPEN ON THE RECORD, made before this check-in (say in comparedWithLastTime.promisesDue what happened to each):');
    for (const c of m.openPromises) out.push(`  [${aPromisesId(c.id)}] ${c.text}${c.saidOn || c.whenSaid ? ` (${[c.saidOn && `said on ${c.saidOn}`, c.whenSaid].filter(Boolean).join(', ')})` : ''}`);
  }
  if (m.previous) {
    out.push('', `THIS PERSON'S PREVIOUS ASSESSMENT${m.previous.on ? `, ${m.previous.on.slice(0, 10)}` : ''}:`);
    for (const i of m.previous.items) out.push(`  [${i.id}] ${i.text}`);
  }
  return out.join('\n');
}

/** The material for the second read: only the messages the first left unmatched, with the question each answered. */
export function theUnmatchedAsText(m: TheMaterial, unmatched: number[]): string {
  const want = new Set(unmatched);
  const out: string[] = [`The person: ${m.who}.`, '', 'THESE MESSAGES WERE NOT YET RECORDED. Record everything in them, or mark a message as nothing to record:'];
  let asked = '';
  for (const t of m.turns) {
    if (t.role === 'groundwork') { asked = t.content; continue; }
    if (t.n && want.has(t.n)) out.push(asked ? `(Groundwork had asked: ${asked.slice(-300)})` : '', `[${t.n}] THE PERSON: ${t.content}`);
  }
  for (const w of m.setup?.words ?? []) if (want.has(w.n)) out.push(`[${w.n}] THE LEAD, IN SETUP: ${w.content}`);
  return out.filter((l, i) => l || i < 3).join('\n');
}

/* ---------------------------------------------------------------------------------------------------------------------
 * READING THE ANSWER.
 * ------------------------------------------------------------------------------------------------------------------- */

const squash = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

/** The items of one section of the model's answer, each with an id, its numbers checked and who may see it. */
export function theItems(raw: unknown, section: string, idPrefix: string, said: Map<number, string>): AnItem[] {
  if (!Array.isArray(raw)) return [];
  const out: AnItem[] = [];
  raw.forEach((r: any, i: number) => {
    if (!r || typeof r !== 'object') return;
    const words = typeof r.words === 'string' ? r.words.trim() : '';
    const from = Array.isArray(r.from) ? [...new Set(r.from.map((x: any) => Number(x)).filter((x: number) => said.has(x)))] as number[] : [];
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      if (k === 'words' || k === 'from') continue;
      if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) continue;
      rest[k] = typeof v === 'string' ? v.trim() : v;
    }
    if (!words && !Object.keys(rest).length) return;
    const wordForWord = !!words && from.some((n) => squash(said.get(n) ?? '').includes(squash(words)));
    out.push({ ...rest, id: `${idPrefix}.${i}`, words, from, whoMaySee: whoMaySee(section), saidWordForWord: wordForWord });
  });
  return out;
}

/** Every item in the assessment, flattened, for the completeness check and for the readers. */
export function everyItemIn(a: Pick<TheAssessment, AnItemSection | 'setup' | 'comparedWithLastTime'>): AnItem[] {
  return [
    ...THE_ITEM_SECTIONS.flatMap((s) => (a as any)[s] ?? []),
    ...(a.setup ? THE_SETUP_SECTIONS.flatMap((s) => (a.setup as any)[s] ?? []) : []),
    ...THE_COMPARED_SECTIONS.flatMap((s) => (a.comparedWithLastTime as any)?.[s] ?? []),
  ] as AnItem[];
}

/** The parts of the assessment the model fills, read from one answer. */
export type TheReadParts = Pick<TheAssessment, AnItemSection | 'setup' | 'comparedWithLastTime' | 'summary' | 'roleAgainstGiven' | 'nothingToRecord'>;

export function thePartsFrom(answer: any, said: Map<number, string>, opts: { hasSetup: boolean; previous: { checkInId: string; on: string | null } | null; givenRole: string | null; read: number; compares?: boolean }): TheReadParts {
  const a = answer && typeof answer === 'object' ? answer : {};
  const p = (s: string) => `r${opts.read}.${s}`;
  const parts: any = {
    summary: typeof a.summary === 'string' ? a.summary.trim() : '',
    nothingToRecord: Array.isArray(a.nothingToRecord) ? [...new Set(a.nothingToRecord.map(Number).filter((n: number) => said.has(n)))] : [],
  };
  for (const s of THE_ITEM_SECTIONS) parts[s] = theItems(a[s], s, p(s), said);
  parts.setup = opts.hasSetup
    ? Object.fromEntries(THE_SETUP_SECTIONS.map((s) => [s, theItems(a.setup?.[s], `setup.${s}`, p(`setup.${s}`), said)]))
    : null;
  parts.comparedWithLastTime = {
    previousCheckInId: opts.previous?.checkInId ?? null,
    previousOn: opts.previous?.on ?? null,
    ...Object.fromEntries(THE_COMPARED_SECTIONS.map((s) => [s, opts.previous || opts.compares ? theItems(a.comparedWithLastTime?.[s], `compared.${s}`, p(`compared.${s}`), said) : []])),
  };
  const r = a.roleAgainstGiven;
  parts.roleAgainstGiven = r && typeof r === 'object' && (r.playing || r.fits)
    ? { given: opts.givenRole, playing: typeof r.playing === 'string' && r.playing.trim() ? r.playing.trim() : null, fits: ['fits', 'differs', 'cannot tell'].includes(r.fits) ? r.fits : 'cannot tell' }
    : null;
  return parts as TheReadParts;
}

/* ---------------------------------------------------------------------------------------------------------------------
 * THE COMPLETENESS CHECK.
 * ------------------------------------------------------------------------------------------------------------------- */

/** The messages no item comes from and none marked "nothing to record". */
export function theUnmatched(parts: TheReadParts, messages: AMessage[]): number[] {
  const matched = new Set<number>(parts.nothingToRecord ?? []);
  for (const i of everyItemIn(parts)) for (const n of i.from) matched.add(n);
  return messages.map((m) => m.n).filter((n) => !matched.has(n));
}

/** The second read's items added to the first's, under their own ids. */
export function withTheSecondRead(first: TheReadParts, second: TheReadParts): TheReadParts {
  const out: any = { ...first, nothingToRecord: [...new Set([...(first.nothingToRecord ?? []), ...(second.nothingToRecord ?? [])])] };
  for (const s of THE_ITEM_SECTIONS) out[s] = [...((first as any)[s] ?? []), ...((second as any)[s] ?? [])];
  if (first.setup || second.setup) {
    out.setup = Object.fromEntries(THE_SETUP_SECTIONS.map((s) => [s, [...((first.setup as any)?.[s] ?? []), ...((second.setup as any)?.[s] ?? [])]]));
  }
  out.comparedWithLastTime = { ...first.comparedWithLastTime };
  for (const s of THE_COMPARED_SECTIONS) (out.comparedWithLastTime as any)[s] = [...((first.comparedWithLastTime as any)?.[s] ?? []), ...((second.comparedWithLastTime as any)?.[s] ?? [])];
  return out as TheReadParts;
}

/** Whatever is still unmatched after both reads is kept whole, in their words, under everything else: nothing falls through. */
export function withWhatIsLeftKeptWhole(parts: TheReadParts, left: number[], said: Map<number, string>): TheReadParts {
  if (!left.length) return parts;
  const kept: AnItem[] = left.map((n) => ({
    id: `kept.${n}`, words: (said.get(n) ?? '').trim(), from: [n], whoMaySee: whoMaySee('everythingElse'), saidWordForWord: true,
    what: 'Said, and not yet read into any other part.',
  }));
  return { ...parts, everythingElse: [...(parts.everythingElse ?? []), ...kept] };
}

/* ---------------------------------------------------------------------------------------------------------------------
 * THE PREVIOUS ASSESSMENT, AS THE NEXT READ IS GIVEN IT, AND ITS HISTORY WHEN A LATER ONE CORRECTS IT.
 * ------------------------------------------------------------------------------------------------------------------- */

/* Their own promises are not here: the record (GroundCommitment) owns a promise's state, and the read is given the open ones from it. */
const COMPARABLE: { section: string; text: (i: AnItem) => string }[] = [
  { section: 'numbers', text: (i) => `Figure: ${i.figure ?? i.words}${i.measures ? ` (${i.measures})` : ''}` },
  { section: 'workUpdates', text: (i) => `Work: ${i.work ?? i.words}${i.stage ? `, at ${i.stage}` : ''}${i.nextStep ? `, next ${i.nextStep}` : ''}` },
  { section: 'blockers', text: (i) => `Waiting for ${i.what ?? i.words}${i.status ? ` (${String(i.status).toLowerCase()})` : ''}` },
  { section: 'claims', text: (i) => `Claim (${i.proof ?? 'said'}): ${i.claim ?? i.words}` },
];

export function theItemsToCompareAgainst(previous: TheAssessment | null): { id: string; text: string }[] {
  if (!previous) return [];
  return COMPARABLE.flatMap(({ section, text }) => ((previous as any)[section] ?? []).map((i: AnItem) => ({ id: i.id, text: text(i) })));
}

/** The previous assessment with the history of each item this one's corrections name. Returns null when nothing changed. */
export function thePreviousWithItsCorrections(previous: TheAssessment, corrections: AnItem[], inCheckInId: string, on: Date): TheAssessment | null {
  const named = corrections.filter((c) => typeof c.correctsItem === 'string' && c.correctsItem);
  if (!named.length) return null;
  let changed = false;
  const copy = JSON.parse(JSON.stringify(previous)) as TheAssessment;
  for (const item of everyItemIn(copy)) {
    for (const c of named.filter((x) => x.correctsItem === item.id)) {
      item.history = [...(item.history ?? []), {
        on: on.toISOString(), inCheckInId, said: String(c.recordSaid ?? item.words ?? ''), nowSays: String(c.shouldSay ?? c.words ?? ''), backed: c.backed === true,
      }];
      changed = true;
    }
  }
  return changed ? copy : null;
}

/* ---------------------------------------------------------------------------------------------------------------------
 * THE READERS' VIEWS. Each reader that moved onto the assessment takes its part through one of these, and nowhere else.
 * ------------------------------------------------------------------------------------------------------------------- */

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** The waits, in the shape the waits writer (extractDependencies) always took. */
export function whatTheyAreWaitingOn(a: TheAssessment | null): { what: string; onName: string | null; onLabel: string | null; status: string; then: string | null; triedSaid: string | null; dueSaid: string | null; sinceDay: string | null; namedTheThing?: boolean }[] {
  return (a?.blockers ?? []).map((b) => ({
    what: text(b.what) ?? text(b.words) ?? '',
    onName: text(b.onName), onLabel: text(b.onLabel),
    status: text(b.status) ?? 'WAITING',
    then: text(b.then), triedSaid: text(b.triedSaid), dueSaid: text(b.dueSaid),
    /* The day it started, from their own "since": a wait is dated from it, not from the session it was said in. */
    sinceDay: /^\d{4}-\d{2}-\d{2}$/.test(text(b.sinceDay) ?? '') ? text(b.sinceDay) : null,
    ...(typeof b.namedTheThing === 'boolean' ? { namedTheThing: b.namedTheThing } : {}),
  })).filter((d) => d.what);
}

/** This person's own promises, in the shape the promises writer (writeWhatTheyPromised) always took. */
export function whatTheyPromisedThemselves(a: TheAssessment | null): { action: string; clear?: string | null; outcome?: string | null; when?: string | null }[] {
  return (a?.promises ?? [])
    .filter((p) => p.byThePerson === true)
    .map((p) => ({ action: text(p.action) ?? text(p.words) ?? '', clear: text(p.clear), outcome: text(p.outcome), when: text(p.when) }))
    .filter((p) => p.action);
}

/** What happened to each open promise on the record, as the settling of promises takes it: the record's id, and their words. */
export function whatHappenedToTheirOpenPromises(a: TheAssessment | null): { commitmentId: string; happened: 'DONE' | 'NOT_DONE' | 'OPEN'; words: string }[] {
  return (a?.comparedWithLastTime?.promisesDue ?? [])
    .filter((p) => typeof p.previousItem === 'string' && p.previousItem.startsWith('c:'))
    .map((p) => ({
      commitmentId: String(p.previousItem).slice(2),
      happened: (['DONE', 'NOT_DONE', 'OPEN'].includes(String(p.happened)) ? p.happened : 'OPEN') as 'DONE' | 'NOT_DONE' | 'OPEN',
      words: String(p.words ?? ''),
    }));
}
