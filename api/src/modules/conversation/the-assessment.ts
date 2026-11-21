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

/** What a person can say about their own job, as a role signal's `part`: what their first check-in keeps about their job (their-role-in-the-first-check-in.ts). */
export const THE_PARTS_OF_A_JOB = ['the name of their job', 'what they are responsible for', 'what doing well looks like', 'who they depend on', 'what gets in their way'] as const;

/** How the conversation ended. */
export type HowItEnded = 'finished by the person' | 'closed by the clock' | 'declined' | 'setup saved' | 'missed';

/**
 * WHO MAY SEE AN ITEM, decided by the item's kind in code, never by the model (privacy is a fixed rule, CLAUDE.md).
 *   - 'the people in this check-in': what a person says in a check-in can be shown word for word to the people in it.
 *   - 'the lead only': the lead's private notes on each person, the team as the lead described it, risks the lead named,
 *     observations and role and focus reads (a participant never reads the lead's judgement).
 *   - 'the person only': something about the speaker's wellbeing rather than their work (their health, their family, grief, distress:
 *     "My mum is in hospital"). Read by the speaker alone: never a record line, a board line, a report line or Today, and never the
 *     lead's (Hafsah, batch 2: distress is never a work line).
 *   - 'the lead and whom it is about': what the lead says about a named person's work, figures or performance, in her own check-ins or
 *     in her update in setup. Read by the lead and that person only, never the rest of the team, in every reader (Hafsah, batch 2,
 *     item 1). Whom it is about is the item's `aboutParticipantId`; when the name cannot be matched to one person, nobody but the lead.
 *   - 'the person and who hears a complaint': what a team member said against the person who runs the check-in, and everything
 *     read from the same messages (Hafsah, 3 November 2026). Never the lead; the person, and the admin or HR person who hears it
 *     (a-complaint-about-the-lead.ts).
 */
export type WhoMaySee = 'the people in this check-in' | 'the lead only' | 'the person only' | 'the person and who hears a complaint' | 'the lead and whom it is about';
/** What the lead says about a named person's work: the lead and that person only. */
export const THE_LEAD_AND_WHOM_IT_IS_ABOUT: WhoMaySee = 'the lead and whom it is about';
/** Who may see a complaint about the lead and what came with it. */
export const KEPT_FROM_THE_LEAD: WhoMaySee = 'the person and who hears a complaint';

/** One message the person sent, numbered from 1 in the order they sent it. Setup's words come first, then the check-in's. */
export interface AMessage {
  n: number;
  /** The ConversationTurn id, or null for a setup message (setup's own turns are kept in LeadSetupWords, not as turns). */
  turnId: string | null;
  where: 'setup' | 'check-in';
  at: string | null;
  /** True for a message she typed in setup that the read named as her own update: it is her first check-in (theTwoPartsOfSetup). */
  saidInSetup?: true;
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
  /** Who asked for it, where it was not said in a check-in (a correction in Ask): their sign-in id. */
  by?: string | null;
  /** Where the correction was made: in a check-in (the default) or in Ask, on a line they were shown. */
  where?: 'check-in' | 'ask';
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
  /** How the lead means to get there. */
  strategy: AnItem[];
  /** Anything else she said about the work that the team should know, something between two people included. */
  notes: AnItem[];
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
export const THE_SETUP_SECTIONS = ['objective', 'success', 'team', 'timing', 'rules', 'risks', 'strategy', 'notes', 'privateNotes'] as const;
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
  acrossTime?: unknown;
  /** Layer 3: the next step for each pattern, tracked from assessment to assessment. */
  interventions?: unknown[];
  /** The lead's marks on its layer-2 patterns, by the pattern's id (the-leads-mark-on-a-pattern.ts), carried to the next one. */
  theLeadsMarks?: unknown;
  /**
   * WHAT IS KEPT FROM THE LEAD (Hafsah, 3 November 2026): a team member's complaint about the person who runs the check-in, and every
   * item read from the same messages, taken out of every section above so no reader of them can serve it to the lead. `messages` are
   * the messages it came from. Read only by the person and whoever hears a complaint (the-facts-on-record.ts).
   */
  keptFromTheLead?: { items: AnItem[]; messages: number[] } | null;
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

/*
 * SETUP BELONGS TO WHOEVER RUNS THE CHECK-IN (Hafsah, 4 November 2026: "setup stays private to whoever runs the check-in. Only what's
 * meant for the team (targets, rules, expectations) is shared, through the proper places"). So every part of setup is the lead's,
 * not only the team, the risks and her private notes: the targets reach the team as the check-in's targets, and the rules and what
 * success looks like as the lines of References and resources (keepWhatSetupGave), never as her words.
 */
const THE_LEADS_ONLY: ReadonlySet<string> = new Set(['observations', 'roleSignals', 'areas', 'compared.disagreements']);

/**
 * THE ONE RULE FOR WHO MAY SEE AN ITEM: by what it is and whom it is about, not only the section it sits in (Hafsah, batch 2, item 1).
 * What it is about is the read's (rule 4): `wellbeing` and `aboutWhom` on the item. Who may then read it is fixed here, because it is
 * privacy.
 */
export function whoMaySee(section: string, item?: { wellbeing?: unknown; aboutWhom?: unknown }, speakerIsTheLead = false): WhoMaySee {
  if (section === 'aboutTheLead') return KEPT_FROM_THE_LEAD;
  if (item?.wellbeing === true) return 'the person only';
  if (section.startsWith('setup.') || THE_LEADS_ONLY.has(section)) return 'the lead only';
  if (speakerIsTheLead && typeof item?.aboutWhom === 'string' && item.aboutWhom.trim()) return THE_LEAD_AND_WHOM_IT_IS_ABOUT;
  return 'the people in this check-in';
}

/**
 * AN AIM HELD BY A NAMED PERSON IS ABOUT THAT PERSON, NOT THE TEAM'S (run 9, 23 November). Lucy's setup line "Mary wants to aim higher on her own" was
 * read as an aim and kept as a team aim with nobody's name on it, so every person's read was given it as "the team's priorities" and said it back in
 * Sam's, Asha's and Amani's recap. What a lead says about a named person's aim stays between her and that person, so it is never kept as a shared
 * aim: it stays on the lead's own assessment, where its `whose` is the person and only she and that person read it. `whose` is the read's: "The team",
 * or the first name of whoever holds it. Nothing here is a word list: it asks only whether the holder is somebody other than the team or the speaker.
 */
export function anAimHeldByAnotherPerson(t: { whose?: unknown; target?: unknown }, speaker: string | null | undefined): boolean {
  const whose = String(t?.whose ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  const me = String(speaker ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  /* One with a number keeps the road it always had: the targets set for a person, which the owner rules already carry. */
  return !!whose && whose !== 'the' && whose !== me && typeof t.target !== 'number';
}

/**
 * WHOM EACH ITEM IS ABOUT, AS A PERSON ON THE CHECK-IN. The read names them as the speaker did ("remy Rep"); `match` finds the one
 * person (whoTheyMeant, which refuses a name two people share). An item the lead said about somebody gets their id; when nobody can be
 * matched it stays null, so only the lead reads it.
 */
export function withWhomEachItemIsAbout<T extends Pick<TheAssessment, AnItemSection | 'setup' | 'comparedWithLastTime'>>(parts: T, match: (name: string) => string | null): T {
  for (const i of everyItemIn(parts)) {
    if (i.whoMaySee !== THE_LEAD_AND_WHOM_IT_IS_ABOUT) continue;
    i.aboutParticipantId = match(String(i.aboutWhom ?? '')) ?? null;
  }
  return parts;
}

/** What "taken further" means, the one wording: the assessment reads it into each wait, and a live check-in reads it from what was said. */
export const TAKEN_FURTHER_MEANS = 'they say they took it above the person it was with, or round them (to that person\'s manager or someone more senior, or another way past them); asking again, chasing, or calling the same person is false.';

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
  '  - Write any other field in plain, short English that a colleague with basic English understands. Where their words say "it", "that", "they", "him", "her" or "their buyer", write the other fields with what it stands for, by name, from the conversation ("the buyer at Naivas Sarit", "the Kasarani Foods submissions draft"), so the item reads right on its own. Never leave a bare pronoun in a field other than `words`.',
  '  - THREE THINGS ARE SAID IN `marks`, NOT ON THE ITEM: `aboutWhom`, `wellbeing` and `cannotBeTrue`. Add one entry to `marks` for an item that needs one of them, with that item\'s `words` copied exactly and the fields that apply. Most items need no entry.',
  '  - `aboutWhom`: for any item, the name of the one person it is about, as they named them, when it is about the work, the figures or the performance of somebody other than the person speaking ("Remy has sold 5 units this month" is about Remy). Leave it out when it is about the speaker\'s own work, the team as a whole, or a customer.',
  '  - `wellbeing`: true for any item about how somebody is in themselves rather than their work: their health, their family, grief, fear, distress or safety ("My mum is in hospital", "I am not coping"). It is never a work item, a claim or a blocker, and it is never in the summary.',
  '  - `cannotBeTrue`: for any item, a short plain reason when what they say cannot be true as they said it, read from their words, what you know of their work and the day of the conversation: far more than one person could do in the time they gave ("10,000 freezers sold by one sales rep in one day"), or a promise for a day that had already passed when they said it ("deliver on 20 October", said on 4 November). Otherwise leave it out. It is not doubt: an ordinary claim with no proof yet is "said", not this.',
  '',
  'EVERY MESSAGE IS ACCOUNTED FOR. Each message number must appear in the `from` of at least one item, or in `nothingToRecord` when it holds nothing to record (a greeting, "ok", a remark about Groundwork itself, or a polite answer to a polite question). Read each message together with the question it answered: "No, nothing is wrong" after "Is anything in the way?" or "Anything else?" is a courtesy that says nothing about the work, and it is never a claim, a position or a fact about any topic (it is not "nothing is wrong with sales progress"). Where somebody says plainly that a named thing is fine or on track, that is a claim; where they only close a question, it is nothing to record. The same holds for a message that only says they are done, that a summary is right, or that there is nothing to add ("That\'s right, finish", "That is all", "No, that is right", "Nothing else"), however it is worded: it is nothing to record and never goes under everythingElse. Where a message holds something about the work and you cannot tell which part it belongs to, record it under everythingElse rather than leave it out.',
  '',
  'THE SECTIONS:',
  '  - summary: two or three plain sentences on what this conversation established.',
  '  - workUpdates: each piece of work mentioned, with its stage, value, dates, the next step, the day of the next step and who owns it, as far as they said.',
  '  - claims: each thing they say is true or done. `proof` is "proved" only when they gave or pointed to proof (a document, a photo, a number someone else confirmed); otherwise "said". `proofIs` says what the proof is. `needsProof` is true when they say something is done, sent, sold, paid, signed or true that a document, a photo or another person could show; it is false for something not done, a plan, a feeling or "on track". `proofAsked` is true when Groundwork asked them to show it, or they said they would send the proof. Where it is the same claim as one in their previous assessment, `previousItem` is that item\'s id.',
  '  - promises: each thing somebody said they would do. `byThePerson` is true only for this person\'s own promises. For this person\'s own, the rules below apply.',
  '  - numbers: each figure, what it measures, its unit, and where it came from.',
  '  - people: each person and organisation mentioned, with their role, and how the speaker spoke of them (praise, criticism or neutral), only from their words. For a person on the check-in, `theirWork` says how the speaker spoke of that person\'s work: "credited" when the speaker says they did or moved something, or unblocked the speaker; "covered for" when the speaker did or picked up work that belongs to them; otherwise "none". A mention with no work attached ("I spoke to Dana") is "none".',
  '  - dates: each date or deadline, as they said it.',
  '  - decisions: each decision made or waiting, and who decides.',
  '  - blockers: each thing this person is waiting on or blocked by. The rules below apply. `since` is when it started, as they said it, and `sinceDay` is that day as a date (YYYY-MM-DD), worked out from their words and the day of the conversation; null when they did not say when it started. Where it is the same wait as one in their previous assessment, `previousItem` is that item\'s id. `takenFurther` is true only when ' + TAKEN_FURTHER_MEANS,
  '  - corrections: anything they said the record, the board or Groundwork has wrong: what it said, what it should say, and whether they backed it. Where it corrects an item of the previous assessment, `correctsItem` is that item\'s id.',
  '  - documents: each document or photo they added or pointed to: what it says, what it proves, and where it belongs. Where it proves a claim in their previous assessment, `provesItem` is that claim\'s id.',
  '  - targets: what the check-in as a whole is aiming at, and each number somebody is aiming at, by the rules for aims below. In every conversation, setup or check-in.',
  '  - herUpdate (only when setup material is given): the number of each of the lead\'s setup messages that gives her own update on the work, that is where things stand today and what is open, as far as she knows it. Read those messages into the sections above as you would any check-in: they are her first check-in. A message that only sets the check-in up (what it is for, who is in it, the targets, the rules, how often, her notes on people, what she wants to find out) is not in it, and is read only into setup.',
  '  - setup (only when setup material is given): the objective, what success looks like, the team and their roles, working days and timing, rules and definitions, risks, the strategy (how the lead means to get there), notes (anything else about the work the team should know, something between two people included), and the lead\'s private notes on each person. Anything still to decide goes under decisions, as waiting. For each person on the team and each private note, `spokenOf` says how the lead spoke of that person (praise, criticism or neutral), only from her words.',
  '  - roleSignals: what the person actually did or talked about doing: tasks, decisions, who they dealt with, what they owned. Also each thing they said about their own job, with its `part`: "the name of their job" (a few words such as "sales representative", only if they said it), "what they are responsible for" (in their job, over this one piece of work), "what doing well looks like" (in their job), "who they depend on" (and who depends on them), or "what gets in their way". Anything else they did is "something they did". `words` are copied from ONE of their answers, exactly, never joined from two. A worry about a customer or a deal is not part of their job.',
  '  - roleAgainstGiven: from this conversation only, the role they are actually playing, and whether it fits the role they were given ("cannot tell" when the conversation does not show it).',
  '  - areas: each item tagged with the area of work it belongs to (a client, a product, a project, admin and so on), and whether it fits one of the team\'s priorities, where they are given.',
  '  - observations: what you noticed, as facts and never as judgements: a vague answer, a question they avoided, signs of overload. Quote their words.',
  '  - comparedWithLastTime (only when a previous assessment or open promises are given; facts only): promisesDue has one item for EACH open promise on the record, with its id in `previousItem`, saying what happened to it (kept; not kept, only when their own words say it was not done, which includes a promise whose day has passed that they now promise again for later; not mentioned, which includes "I have nothing more on that" and anything that does not say what happened; or still open, in progress or given a new date before its day passed) and `happened` by the rules below; `dayPassed` is true when the day they gave for it is before the day of this conversation; figures that changed with both values and the date of the earlier one, work that moved or did not, blockers new, still there or cleared, anything repeated and how many times, and where what they said disagrees with the record or with someone else. Use the previous item\'s id in `previousItem` where there is one.',
  '  - stillOpen: what is still open, to ask next time.',
  '  - saidBack: one entry for each item of this person\'s own about their work (work, claims, promises, numbers, dates, decisions, blockers, targets), as it will be read back to them at the end so they can check it. `words` is the item\'s words, copied exactly from the item. `says` is one whole, plain sentence to them, using "you", that says what was recorded: who, what, the number with what it counts, and the day, by name, as far as they said it, and true to how sure it is ("one verbal agreement", never "signed" for that). Never quote a fragment of their words, never join pieces with commas, and never write "which I recorded as".',
  '  - everythingElse: everything else they said, so nothing falls through.',
  '  - aboutTheLead: only for somebody who is not the lead. Each thing they say against the person who leads this check-in. That is how that person treats them, leads them, speaks to them or behaves. Read it by its meaning, in any words or language. A wait on the lead for a piece of work is not one, and nor is a fair disagreement about the work. Copy their words exactly. Never mention any of it in the summary.',
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
      /*
       * THE THREE FIELDS NO ITEM NEEDS BY DEFAULT ARE SAID ONCE, HERE, AND NOT ON EVERY ITEM OF EVERY SECTION (fix plan 16 November, group 1).
       * On 4 and 7 November `aboutWhom`, `wellbeing` and `cannotBeTrue` were added to the shape every one of the 33 sections shares, which
       * put 99 more fields into one request of 306 and 36,000 characters. From then on every read of every conversation in the
       * 15 November end-to-end run was refused by the model as "Request contains an invalid argument" (400 INVALID_ARGUMENT) and no
       * conversation was read at all. Said here, the request is 99 fields smaller and the model says them only for the items that
       * need them. `withTheMarksOnTheItems` puts each back on its item before anything reads it, so whoMaySee, whom an item is about
       * and what cannot be true as said are read exactly as before.
       */
      marks: {
        type: 'array',
        description: 'One entry for each item that is about somebody else, about how somebody is, or cannot be true as said. Most items need none.',
        items: {
          type: 'object',
          properties: {
            words: { type: 'string', description: 'The words of the item, copied exactly from the item.' },
            aboutWhom: S('The name of the one person it is about, when it is about the work, figures or performance of somebody other than the speaker.'),
            wellbeing: { type: 'boolean', description: 'True when it is about how somebody is in themselves (health, family, grief, distress), not their work.' },
            cannotBeTrue: S('Only when it cannot be true as said: far more than one person could do in the time given, or a promise for a day already past when it was said. The plain reason.'),
          },
          required: ['words'],
        },
      },
      saidBack: {
        type: 'array',
        description: 'Each of this person\'s own items about their work, said back to them as one whole plain sentence, for them to check at the end.',
        items: {
          type: 'object',
          properties: {
            words: { type: 'string', description: 'The words of the item, copied exactly from the item.' },
            says: { type: 'string', description: 'One whole plain sentence to them, using "you", saying what was recorded.' },
          },
          required: ['words', 'says'],
        },
      },
      workUpdates: anItem({ work: S('The piece of work.'), area: S('Its area.'), stage: S('Its stage.'), value: S('Its value, with the unit.'), dates: S('Its dates, as said.'), nextStep: S('The next step.'), nextStepDay: S('The day of the next step, as said.'), nextStepOwner: S('Who owns the next step.') }),
      claims: anItem({ claim: S('What they say is true or done.'), proof: { type: 'string', enum: ['proved', 'said'] }, proofIs: S('What the proof is.'), needsProof: { type: 'boolean', description: 'True when it is something done or true that proof could show; false for something not done, a plan or a feeling.' }, proofAsked: { type: 'boolean', description: 'True when Groundwork asked for proof of it, or they said they would send it.' }, previousItem: S('The id of the same claim in their previous assessment.') }),
      promises: anItem({
        byThePerson: { type: 'boolean', description: 'True only when this person promised it themselves.' },
        who: S('Who promised it.'), action: S('The action, their words.'), clear: S('The same promise as one clear action.'),
        outcome: S('What it is for, only if they said.'), when: S('The timing, their words.'), whatItMeans: S('What "it" means, where they were asked.'),
      }),
      numbers: anItem({ figure: S('The figure.'), measures: S('What it measures.'), unit: S('Its unit.'), source: S('Where it came from.') }),
      people: anItem({ name: S('The name.'), kind: { type: 'string', enum: ['person', 'organisation'] }, role: S('Their role.'), organisation: S('Their organisation.'), spokenOf: { type: 'string', enum: ['praise', 'criticism', 'neutral'] }, theirWork: { type: 'string', enum: ['credited', 'covered for', 'none'] } }),
      dates: anItem({ when: S('The date, as said.'), what: S('What it is for.') }),
      decisions: anItem({ decision: S('The decision.'), state: { type: 'string', enum: ['made', 'waiting'] }, whoDecides: S('Who decides.') }),
      blockers: anItem({
        what: S('What they wait for, reading after the word "for", without who they wait on (that is onName or onLabel): "the delivery schedule for Kilimani Fresh", never "an answer from Baraka about the delivery schedule".'), namedTheThing: { type: 'boolean' }, onName: S('The person waited on.'),
        onLabel: S('What is waited on when not a person.'), status: { type: 'string', enum: ['BLOCKING', 'WAITING', 'CLEARED'] },
        then: S('What happens once it clears.'), previousItem: S('The id of the same wait in their previous assessment.'), triedSaid: S('What they said they already did, their words.'), takenFurther: { type: 'boolean', description: 'True only when they say they took it above the person it was with, or round them. Asking again or chasing is false.' }, dueSaid: S('When it is due, their words.'), since: S('Since when, as said.'), sinceDay: S('The day it started, YYYY-MM-DD, from their words and the day of the conversation.'),
      }),
      corrections: anItem({ recordSaid: S('What the record said.'), shouldSay: S('What it should say.'), backed: { type: 'boolean' }, correctsItem: S('The id of the previous assessment\'s item it corrects.') }),
      documents: anItem({ name: S('The document or photo.'), says: S('What it says.'), proves: S('What it proves.'), filedOn: S('Where it belongs.'), provesItem: S('The id of the claim in their previous assessment it proves.') }),
      setup: {
        type: 'object',
        properties: {
          objective: anItem({ objective: S('The objective.') }),
          success: anItem({ success: S('What success looks like.') }),
          team: anItem({ name: S('The person.'), role: S('Their role.'), spokenOf: { type: 'string', enum: ['praise', 'criticism', 'neutral'] } }),
          timing: anItem({ timing: S('Working days, times and how often.') }),
          rules: anItem({ rule: S('A rule or definition.') }),
          risks: anItem({ risk: S('A risk.') }),
          strategy: anItem({ strategy: S('How the lead means to get there.') }),
          notes: anItem({ note: S('Anything else about the work the team should know.') }),
          privateNotes: anItem({ about: S('Who the note is about.'), note: S('The lead\'s note.'), spokenOf: { type: 'string', enum: ['praise', 'criticism', 'neutral'] } }),
        },
      },
      roleSignals: anItem({ did: S('What they did or owned.'), part: { type: 'string', enum: [...THE_PARTS_OF_A_JOB, 'something they did'] } }),
      roleAgainstGiven: { type: 'object', properties: { playing: S('The role they are actually playing.'), fits: { type: 'string', enum: ['fits', 'differs', 'cannot tell'] } } },
      areas: anItem({ item: S('The item.'), area: S('Its area.'), fitsAPriority: { type: 'string', enum: ['yes', 'no', 'unclear'] } }),
      observations: anItem({ observed: { type: 'string', enum: ['vague answer', 'avoided question', 'overload', 'other'] }, what: S('What was noticed, as a fact.') }),
      comparedWithLastTime: {
        type: 'object',
        properties: {
          promisesDue: anItem({ promise: S('The promise.'), previousItem: S('Its id, as given.'), outcome: { type: 'string', enum: ['kept', 'not kept', 'not mentioned', 'still open'] }, happened: { type: 'string', enum: ['DONE', 'NOT_DONE', 'OPEN'] }, dayPassed: { type: 'boolean', description: 'True when the day given for it is before the day of this conversation.' } }),
          figuresChanged: anItem({ what: S('What it measures.'), before: S('The earlier value.'), beforeOn: S('The date of the earlier value.'), now: S('The value now.'), previousItem: S('Its id.') }),
          workMoved: anItem({ work: S('The work.'), moved: { type: 'boolean' }, how: S('How it moved.'), previousItem: S('Its id.') }),
          blockers: anItem({ what: S('The blocker.'), state: { type: 'string', enum: ['new', 'still there', 'cleared'] }, previousItem: S('Its id.') }),
          repeated: anItem({ what: S('What was said again.'), times: { type: 'integer' } }),
          disagreements: anItem({ what: S('What they said.'), otherSays: S('What the record or someone else says.') }),
        },
      },
      targets: anItem({ aim: S('The aim as one plain, full sentence about whoever holds it, by first name, or "The team".'), target: { type: ['number', 'null'], description: 'The number aimed at, only where they said one.' }, unit: S('What it counts.'), by: S('By when, in their words.'), whose: S('Whose aim: a first name, or "The team".'), reportsWhatIsDone: { type: 'boolean', description: 'True when the number is what they say they have already done or got ("I sold 24 last week"), reported against an aim, and not a number they are aiming at.' } }),
      stillOpen: anItem({ question: S('What to ask next time.') }),
      everythingElse: anItem({ what: S('What it is about.') }),
      aboutTheLead: anItem({ what: S('What they say against the person who leads this check-in, in plain words.') }),
      nothingToRecord: { type: 'array', items: { type: 'integer' }, description: 'Message numbers with nothing to record.' },
      herUpdate: { type: 'array', items: { type: 'integer' }, description: 'Only in setup: the numbers of the lead\'s messages that give her own update on where things stand today.' },
    },
    required: ['summary', 'nothingToRecord'],
  },
} as const;

/**
 * THE SCHEMA FOR THIS CONVERSATION: ONLY THE SECTIONS THAT CAN APPLY TO IT (fix plan 17 November, group A).
 *
 * THE CAUSE OF THE 400 INVALID_ARGUMENT ON THE READ, FOUND ON THE REAL MODEL. The refusal is the model's own, not the request's size: the
 * same full schema (19,284 characters) was accepted 20 of 20 times with one short message and refused in 7 of 20 with a conversation of
 * sixteen messages and a previous assessment, on the same instructions and the same material each time. It is the length of what the model
 * writes under a schema this large, so it is not a fixed fraction of requests and not a function of the request's length. The same
 * conversation with the sections that cannot apply left out of the schema (setup's nine, the lead's complaint, the lead's own update)
 * was refused 0 of 13 times. Earlier, taking 99 fields out of every item (306 to 215 fields) moved 100 percent to about a third; this is the
 * same cause, so the answer is the same: ask for what applies and no more.
 *
 * What applies is what `thePartsFrom` already reads: setup's sections and the lead's own update only in setup; the comparison only where
 * there is an earlier assessment or an open promise to compare against; what is said against the lead only by somebody who is not the lead.
 * A section left out is a section nothing reads for that conversation, so nothing downstream changes.
 */
export function theAssessmentSchemaFor(o: { hasSetup: boolean; compares: boolean; isTheLead: boolean }): typeof THE_ASSESSMENT_SCHEMA {
  const props: Record<string, unknown> = { ...THE_ASSESSMENT_SCHEMA.input_schema.properties };
  if (!o.hasSetup) { delete props.setup; delete props.herUpdate; }
  if (!o.compares) delete props.comparedWithLastTime;
  if (o.isTheLead) delete props.aboutTheLead;
  return { ...THE_ASSESSMENT_SCHEMA, input_schema: { ...THE_ASSESSMENT_SCHEMA.input_schema, properties: props as any } } as any;
}

/* ---------------------------------------------------------------------------------------------------------------------
 * THE MATERIAL GIVEN TO THE READ.
 * ------------------------------------------------------------------------------------------------------------------- */

export interface TheMaterial {
  who: string;
  isTheLead: boolean;
  /** The person who leads this check-in, by name, so a complaint about them can be read (only for somebody who is not the lead). */
  theLead?: string | null;
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
  setup: { words: { n: number; content: string; asked?: string | null }[]; given: string[] } | null;
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
  if (!m.isTheLead && m.theLead) out.push(`The person who leads this check-in: ${m.theLead}.`);
  if (m.checkIn) out.push(`The check-in: ${m.checkIn}.`);
  if (m.on) out.push(`The day of the conversation: ${m.on}.`);
  out.push(`The role they were given: ${m.givenRole ?? 'not known'}.`);
  if (m.priorities.length) out.push('', 'THE TEAM\'S PRIORITIES:', ...m.priorities.map((p) => `  - ${p}`));
  if (m.setup) {
    out.push('', 'SETUP MATERIAL (the lead setting this check-in up):');
    for (const w of m.setup.words) out.push(...(w.asked ? [`(Groundwork had asked: ${w.asked.slice(-300)})`] : []), `[${w.n}] THE LEAD, IN SETUP: ${w.content}`);
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
  const out: string[] = [`The person: ${m.who}.`, '', 'THESE MESSAGES WERE NOT YET RECORDED. Record what is about the work in each, and mark a message that only answers a polite question, closes a question or says they are done as nothing to record:'];
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
export function theItems(raw: unknown, section: string, idPrefix: string, said: Map<number, string>, speakerIsTheLead = false): AnItem[] {
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
    out.push({ ...rest, id: `${idPrefix}.${i}`, words, from, whoMaySee: whoMaySee(section, rest, speakerIsTheLead), saidWordForWord: wordForWord });
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
export type TheReadParts = Pick<TheAssessment, AnItemSection | 'setup' | 'comparedWithLastTime' | 'summary' | 'roleAgainstGiven' | 'nothingToRecord'> & {
  /** What they said against the lead, as read; set aside by withWhatIsAboutTheLeadSetAside before anything is stored. */
  aboutTheLead?: AnItem[];
  /** In setup, the messages that are the lead's own update on where things stand: her first check-in (theTwoPartsOfSetup). */
  herUpdate?: number[];
};

/**
 * EACH MARK BACK ON ITS ITEM. The read says `aboutWhom`, `wellbeing` and `cannotBeTrue` once, in `marks`, by the item's own words; here they
 * are put on every item (in any section) whose words are those, so nothing downstream knows they were said apart.
 */
export function withTheMarksOnTheItems(answer: any): any {
  const listed = (k: string) => (Array.isArray(answer?.[k]) ? (answer[k] as any[]).filter((m) => m && typeof m.words === 'string' && m.words.trim()) : []);
  /* The sentence each item is read back in (the-read-back.ts) is put on its item the same way, as `saidBack`. */
  const marks = [...listed('marks'), ...listed('saidBack').filter((m) => typeof m.says === 'string' && m.says.trim()).map((m) => ({ words: m.words, saidBack: m.says.trim() }))];
  if (!marks.length) return answer;
  const byWords = new Map<string, any>();
  for (const m of marks) byWords.set(squash(m.words), { ...byWords.get(squash(m.words)), ...m });
  const mark = (items: any): any => (Array.isArray(items)
    ? items.map((it) => {
      const m = it && typeof it.words === 'string' ? byWords.get(squash(it.words)) : null;
      if (!m) return it;
      const { words: _w, ...fields } = m;
      return { ...fields, ...it };
    })
    : items);
  const out: any = { ...answer };
  for (const k of Object.keys(out)) {
    if (k === 'marks' || k === 'saidBack') continue;
    if (Array.isArray(out[k])) out[k] = mark(out[k]);
    else if (out[k] && typeof out[k] === 'object') out[k] = Object.fromEntries(Object.entries(out[k]).map(([kk, v]) => [kk, mark(v)]));
  }
  return out;
}

export function thePartsFrom(answer: any, said: Map<number, string>, opts: { hasSetup: boolean; previous: { checkInId: string; on: string | null } | null; givenRole: string | null; read: number; compares?: boolean; isTheLead?: boolean }): TheReadParts {
  const a = answer && typeof answer === 'object' ? withTheMarksOnTheItems(answer) : {};
  const p = (s: string) => `r${opts.read}.${s}`;
  const parts: any = {
    summary: typeof a.summary === 'string' ? a.summary.trim() : '',
    nothingToRecord: Array.isArray(a.nothingToRecord) ? [...new Set(a.nothingToRecord.map(Number).filter((n: number) => said.has(n)))] : [],
    herUpdate: opts.hasSetup && Array.isArray(a.herUpdate) ? [...new Set(a.herUpdate.map(Number).filter((n: number) => said.has(n)))] : [],
  };
  const lead = opts.isTheLead === true;
  for (const s of THE_ITEM_SECTIONS) parts[s] = theItems(a[s], s, p(s), said, lead);
  parts.aboutTheLead = theItems(a.aboutTheLead, 'aboutTheLead', p('aboutTheLead'), said);
  parts.setup = opts.hasSetup
    ? Object.fromEntries(THE_SETUP_SECTIONS.map((s) => [s, theItems(a.setup?.[s], `setup.${s}`, p(`setup.${s}`), said, lead)]))
    : null;
  parts.comparedWithLastTime = {
    previousCheckInId: opts.previous?.checkInId ?? null,
    previousOn: opts.previous?.on ?? null,
    ...Object.fromEntries(THE_COMPARED_SECTIONS.map((s) => [s, opts.previous || opts.compares ? theItems(a.comparedWithLastTime?.[s], `compared.${s}`, p(`compared.${s}`), said, lead) : []])),
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
  for (const i of [...everyItemIn(parts), ...(parts.aboutTheLead ?? [])]) for (const n of i.from) matched.add(n);
  return messages.map((m) => m.n).filter((n) => !matched.has(n));
}

/** The second read's items added to the first's, under their own ids. */
export function withTheSecondRead(first: TheReadParts, second: TheReadParts): TheReadParts {
  const out: any = {
    ...first,
    nothingToRecord: [...new Set([...(first.nothingToRecord ?? []), ...(second.nothingToRecord ?? [])])],
    herUpdate: [...new Set([...(first.herUpdate ?? []), ...(second.herUpdate ?? [])])],
  };
  for (const s of THE_ITEM_SECTIONS) out[s] = [...((first as any)[s] ?? []), ...((second as any)[s] ?? [])];
  out.aboutTheLead = [...(first.aboutTheLead ?? []), ...(second.aboutTheLead ?? [])];
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

/**
 * SETUP, STORED IN TWO PARTS (Hafsah, 4 November 2026: "Keep one conversation for the lead (setup and her first check-in together), but
 * store it in two parts: setup facts stay private to whoever runs the check-in; her 'where things stand today' is saved as her first
 * check-in under the normal rules"). Every setup message is setup's until the read says it is her own update on the work; those are
 * her first check-in, so what she says in them is her record and is read like anybody's check-in. Which is which is understood by
 * the read, never matched; what each part may be read by is fixed in code (whoMaySee, and mayRead in the-facts-on-record.ts).
 */
export function theTwoPartsOfSetup(messages: AMessage[], herUpdate: number[] | undefined): AMessage[] {
  const hers = new Set(herUpdate ?? []);
  return messages.map((m) => (m.where === 'setup' && hers.has(m.n) ? { ...m, where: 'check-in' as const, saidInSetup: true as const } : m));
}

/**
 * A COMPLAINT ABOUT THE LEAD IS KEPT FROM THE LEAD (Hafsah, 3 November 2026: "A team member's complaint about their lead is never shown
 * to that lead anywhere they read"). The read finds it by meaning (`aboutTheLead`). Here it is taken out of the assessment's sections,
 * with every other item read from the same messages, so the record, the waits, the promises, the board, the reports, Ask and layer 2,
 * which all read the sections, never hold it. What is set aside is kept whole for the person and whoever hears it.
 */
export function withWhatIsAboutTheLeadSetAside(parts: TheReadParts): { parts: TheReadParts; keptFromTheLead: TheAssessment['keptFromTheLead'] } {
  const { aboutTheLead = [], ...rest } = parts;
  if (!aboutTheLead.length) return { parts: rest as TheReadParts, keptFromTheLead: null };
  const messages = new Set(aboutTheLead.flatMap((i) => i.from));
  const kept: AnItem[] = aboutTheLead.map((i) => ({ ...i, readAs: 'aboutTheLead', whoMaySee: KEPT_FROM_THE_LEAD }));
  const keep = (items: AnItem[] | undefined, section: string): AnItem[] => (items ?? []).filter((i) => {
    if (!i.from.some((n) => messages.has(n))) return true;
    kept.push({ ...i, readAs: section, whoMaySee: KEPT_FROM_THE_LEAD });
    return false;
  });
  const out: any = { ...rest };
  for (const s of THE_ITEM_SECTIONS) out[s] = keep((rest as any)[s], s);
  if (rest.setup) out.setup = Object.fromEntries(THE_SETUP_SECTIONS.map((s) => [s, keep((rest.setup as any)[s], `setup.${s}`)]));
  out.comparedWithLastTime = { ...rest.comparedWithLastTime };
  for (const s of THE_COMPARED_SECTIONS) out.comparedWithLastTime[s] = keep((rest.comparedWithLastTime as any)?.[s], `compared.${s}`);
  return { parts: out as TheReadParts, keptFromTheLead: { items: kept, messages: [...messages].sort((a, b) => a - b) } };
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
      /* One step per check-in: the same conversation assessed again (the read-back, then the close) replaces its own step. */
      item.history = [...(item.history ?? []).filter((h) => h.inCheckInId !== inCheckInId), {
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
export function whatTheyAreWaitingOn(a: TheAssessment | null): { what: string; onName: string | null; onLabel: string | null; status: string; then: string | null; triedSaid: string | null; takenFurther: boolean | null; dueSaid: string | null; sinceDay: string | null; namedTheThing?: boolean }[] {
  return (a?.blockers ?? []).map((b) => ({
    what: text(b.what) ?? text(b.words) ?? '',
    onName: text(b.onName), onLabel: text(b.onLabel),
    status: text(b.status) ?? 'WAITING',
    then: text(b.then), triedSaid: text(b.triedSaid), takenFurther: typeof b.takenFurther === 'boolean' ? b.takenFurther : null, dueSaid: text(b.dueSaid),
    /* The day it started, from their own "since": a wait is dated from it, not from the session it was said in. */
    sinceDay: /^\d{4}-\d{2}-\d{2}$/.test(text(b.sinceDay) ?? '') ? text(b.sinceDay) : null,
    ...(typeof b.namedTheThing === 'boolean' ? { namedTheThing: b.namedTheThing } : {}),
  })).filter((d) => d.what);
}

/**
 * WHAT THE SPEAKER SAID ABOUT ANOTHER PERSON'S WORK, as work mentions: somebody they credited, somebody whose work they covered,
 * and somebody they are waiting on. Read from the people and the blockers, so there is no separate read of the transcript.
 */
export function theWorkTheyMentioned(a: TheAssessment | null): { personName: string; kind: 'CREDIT' | 'COVERAGE' | 'BLOCKED_BY'; text: string }[] {
  const out: { personName: string; kind: 'CREDIT' | 'COVERAGE' | 'BLOCKED_BY'; text: string }[] = [];
  for (const p of a?.people ?? []) {
    const kind = p.theirWork === 'credited' ? 'CREDIT' : p.theirWork === 'covered for' ? 'COVERAGE' : null;
    const name = text(p.name);
    const words = text(p.words);
    if (kind && name && words && p.kind !== 'organisation') out.push({ personName: name, kind, text: words });
  }
  for (const b of a?.blockers ?? []) {
    const name = text(b.onName);
    const words = text(b.words) ?? text(b.what);
    if (name && words && text(b.status) !== 'CLEARED') out.push({ personName: name, kind: 'BLOCKED_BY', text: words });
  }
  return out;
}

/** This person's own promises, in the shape the promises writer (writeWhatTheyPromised) always took. */
/*
 * HOW WHAT THEY SAID STANDS, THE ONE PLACE IT IS DECIDED (Hafsah, 4 November 2026: "In the one source, an unproven claim is always worded
 * as said ('Brian said he sold…'), and an impossible claim or a date already past is left out of the opener, My work and anything else that
 * reads it."). The assessment's own reading says it: "proved" where they showed it, "cannot be true" where the read gave a reason it
 * cannot be true as said (`cannotBeTrue`), otherwise "said". The same words read into two sections are one thing said, so they stand
 * together. Every reader takes the standing from here; the words stay in the assessment, and the lead reads them as what was said.
 */
export type TheStanding = 'proved' | 'said' | 'cannot be true';

const theWordsOf = (i: AnItem) => squash(String(i.words ?? ''));

/** The words in this assessment that the read says cannot be true as said. */
export function theWordsThatCannotBeTrue(a: Pick<TheAssessment, AnItemSection | 'setup' | 'comparedWithLastTime'> | null): Set<string> {
  return new Set((a ? everyItemIn(a) : []).filter((i) => text(i.cannotBeTrue)).map(theWordsOf).filter(Boolean));
}

/** How one item of this assessment stands. */
export function theStandingOf(item: AnItem, cannotBeTrue: Set<string>): TheStanding {
  if (text(item.cannotBeTrue) || (theWordsOf(item) && cannotBeTrue.has(theWordsOf(item)))) return 'cannot be true';
  return item.proof === 'proved' ? 'proved' : 'said';
}

export function whatTheyPromisedThemselves(a: TheAssessment | null): { action: string; clear?: string | null; outcome?: string | null; when?: string | null }[] {
  /* A promise that cannot be true as said (a day already past when it was said) is not kept as a promise: it stays what they said. */
  const cannot = theWordsThatCannotBeTrue(a);
  return (a?.promises ?? [])
    .filter((p) => p.byThePerson === true && theStandingOf(p, cannot) !== 'cannot be true')
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
