import { RecordEntryType } from '@prisma/client';

/**
 * WHAT THE RECORD NEEDS BY THE END, AS DATA RATHER THAN AS A SCRIPT.
 *
 * Two cards a chief of staff picks - set goals and keep a team moving against them, or set one goal
 * at the top and have other teams write their own underneath - and a table of what each person
 * should have been asked at each stage. The obvious way to serve that is eighteen prompt packs.
 * That is the disease prescribed as the cure: the prompt already runs to 927 lines and 273
 * imperatives, and a rule added there loses to the other 272.
 *
 * So this says what has to end up ON THE RECORD, and the conversation asks for whatever is still
 * missing. Same tables, different mechanism.
 *
 * WHAT IT BUYS, beyond serving the two scenarios:
 *
 *   - "Do not re-ask what they already answered" stops being an instruction and becomes arithmetic.
 *     If the fact is on the record it is not missing, so it is not asked.
 *   - The close gate stops being a judgement about thinness and becomes a statement: you have not
 *     said what you need from anybody, and that is owed this round.
 *   - Every slot that becomes data is prose deleted from a pack, so this shrinks the prompt rather
 *     than growing it.
 *   - A transcript can be scored by which slots it filled, which is the eval nobody has.
 *
 * AND A GAP IS RECORDED, NOT PRESSED. Decided rather than assumed: after asking twice, the
 * conversation lets it go and the gap is shown to whoever runs the check-in. A person who feels
 * cornered gives compliant answers, which are worse than missing ones. The gap stays open and
 * closes the moment they answer it, in this round or a later one.
 *
 * THE MODEL NEVER SEES THESE AS QUESTIONS. It is told what is missing and asks in its own words.
 * A list of slot names reaching the person would be a form with a chat interface, which is the one
 * thing this product must never be.
 */

/** Who is answering. By what they can be asked for, never by seniority. */
export type Role =
  /** Runs the check-in. Answers for the whole, and for what other people need from them. */
  | 'lead'
  /** Answers for their own work. */
  | 'member'
  /**
   * Answers for work other people did - a team lead, a partner, an agency.
   *
   * The distinction is answerability, not rank. "What are you working on" is mostly not theirs;
   * "what do you need from others" and "did the pieces fit" are.
   */
  | 'partner';

/** Where in the run this check-in sits. Resolved from the round, never reasoned about by a model. */
export type Stage = 'first' | 'middle' | 'last';

export interface Owed {
  /** Stable id, so a gap recorded in round one is the same gap in round six. */
  id: string;
  /** What the record is missing, in the words somebody would use about it. Never a question. */
  what: string;
  role: Role[];
  stage: Stage[];
  /** Entry types that satisfy it. Empty means nothing typed can prove it - see `noTypeYet`. */
  satisfiedBy: RecordEntryType[];
  /**
   * True where extraction has no type for this yet, so it cannot be proved from the record.
   *
   * These are asked once and then recorded as a gap rather than chased, because a slot that can
   * never read as satisfied would ask the same thing every round for ever - which is precisely the
   * interrogation this is built to avoid.
   */
  noTypeYet?: true;
}

const T = RecordEntryType;

/**
 * SET GOALS AND KEEP THE TEAM ON TRACK.
 *
 * First is the starting point, middle is what changed, last is where it landed. Read down a stage
 * and it is one conversation; read across a role and it is three different jobs.
 */
export const KEEP_THE_TEAM_ON_TRACK: Owed[] = [
  { id: 'aim', what: 'what this is trying to achieve', role: ['lead'], stage: ['first'], satisfiedBy: [T.SUCCESS_DEFINITION] },
  { id: 'targets', what: 'the goals or targets, as numbers or dates', role: ['lead'], stage: ['first'], satisfiedBy: [T.TIMEFRAME, T.SUCCESS_DEFINITION] },
  { id: 'going-in', what: 'what people should know going in', role: ['lead'], stage: ['first'], satisfiedBy: [], noTypeYet: true },

  { id: 'own-work', what: 'what they are working on', role: ['member'], stage: ['first'], satisfiedBy: [T.INTENT, T.COMMITMENT] },
  { id: 'how-it-is', what: 'how it is actually going', role: ['member'], stage: ['first'], satisfiedBy: [T.INTENT, T.WORRY, T.TENSION] },
  { id: 'unclear', what: 'what is clear and what is not', role: ['member'], stage: ['first'], satisfiedBy: [T.WORRY, T.ASK, T.TENSION] },

  { id: 'remit', what: 'what they are answerable for', role: ['partner'], stage: ['first'], satisfiedBy: [T.INTENT, T.COMMITMENT] },
  { id: 'contributes', what: 'how their work contributes to the goal', role: ['partner'], stage: ['first'], satisfiedBy: [T.SUCCESS_DEFINITION, T.INTENT] },
  { id: 'needs-others', what: 'what they need from other people', role: ['partner', 'member'], stage: ['first', 'middle'], satisfiedBy: [T.ASK] },

  { id: 'moved', what: 'what has moved since last time', role: ['lead', 'member', 'partner'], stage: ['middle'], satisfiedBy: [T.COMMITMENT, T.INTENT] },
  { id: 'off-track', what: 'what is off track', role: ['lead'], stage: ['middle'], satisfiedBy: [T.WORRY, T.TENSION] },
  { id: 'support', what: 'who needs support, and with what', role: ['lead'], stage: ['middle'], satisfiedBy: [T.ASK, T.WORRY] },
  { id: 'in-the-way', what: 'what is getting in the way', role: ['member', 'partner'], stage: ['middle'], satisfiedBy: [T.WORRY, T.TENSION, T.ASK] },

  { id: 'achieved', what: 'what was achieved', role: ['lead', 'member', 'partner'], stage: ['last'], satisfiedBy: [T.COMMITMENT, T.SUCCESS_DEFINITION] },
  { id: 'stayed-off', what: 'what stayed off track', role: ['lead', 'member', 'partner'], stage: ['last'], satisfiedBy: [T.WORRY, T.TENSION] },
  { id: 'next', what: 'what should happen next', role: ['lead', 'member', 'partner'], stage: ['last'], satisfiedBy: [T.COMMITMENT, T.INTENT] },
];

/**
 * CONNECT GOALS ACROSS THE TEAM.
 *
 * The cascade. The pack already does the hard half - it makes somebody NAME the thing above them
 * and refuses to supply the name - so that is a slot here rather than a rewrite. What was missing
 * is the middle: overlap, where two teams are quietly doing the same work, is the most expensive
 * thing a cascade hides and nothing was looking for it.
 */
export const CONNECT_GOALS_ACROSS: Owed[] = [
  { id: 'main-goal', what: 'the main goal everything else sits under', role: ['lead'], stage: ['first'], satisfiedBy: [T.SUCCESS_DEFINITION] },
  { id: 'why-now', what: 'what has to be achieved and why now', role: ['lead'], stage: ['first'], satisfiedBy: [], noTypeYet: true },

  { id: 'their-goal', what: 'the goal or target that fits their own role', role: ['member', 'partner'], stage: ['first'], satisfiedBy: [T.SUCCESS_DEFINITION] },
  { id: 'sits-under', what: 'the wider objective theirs sits under, named in their own words', role: ['member', 'partner'], stage: ['first', 'middle'], satisfiedBy: [], noTypeYet: true },
  { id: 'missing', what: 'anything unclear or missing about how it connects', role: ['partner'], stage: ['first'], satisfiedBy: [T.WORRY, T.ASK, T.TENSION] },

  { id: 'still-fits', what: 'whether their goal still makes sense', role: ['member', 'partner'], stage: ['middle'], satisfiedBy: [T.INTENT, T.SUCCESS_DEFINITION] },
  { id: 'overlap', what: 'work another team may also be doing', role: ['lead', 'partner'], stage: ['middle'], satisfiedBy: [], noTypeYet: true },
  { id: 'conflict', what: 'goals that pull against each other', role: ['lead', 'partner'], stage: ['middle'], satisfiedBy: [T.TENSION], },
  { id: 'depends-on', what: 'anything they need from another team that is not agreed', role: ['lead', 'member', 'partner'], stage: ['middle'], satisfiedBy: [T.ASK] },

  { id: 'did-connect', what: 'whether the pieces actually connected', role: ['lead', 'member', 'partner'], stage: ['last'], satisfiedBy: [], noTypeYet: true },
  { id: 'keep-change', what: 'what to keep, change or add next time', role: ['lead', 'member', 'partner'], stage: ['last'], satisfiedBy: [T.COMMITMENT, T.INTENT] },
];

/**
 * WHICH STAGE A ROUND IS.
 *
 * Resolved here, from two numbers, rather than left to a model to work out from a session number in
 * a sentence. A run whose length nobody set has no last round until it is closed, so everything
 * after the first is middle - inventing an ending would put closing questions to somebody in week
 * two.
 */
export function stageOf(round: number, planned: number | null, isFinal = false): Stage {
  if (isFinal) return 'last';
  if (round <= 1) return 'first';
  if (planned && round >= planned) return 'last';
  return 'middle';
}

export interface Held {
  /** Entry types this person has on the record, for the window that counts. */
  types: RecordEntryType[];
  /** Slot ids already recorded as a gap and asked to the limit. Not asked again. */
  letGo: string[];
  /** Slot ids answered at any point in the run. A gap closes the moment it is answered. */
  answered: string[];
}

/** Past this, the conversation stops asking and records the gap. Decided, not assumed. */
export const ASK_TWICE_THEN_LET_IT_GO = 2;

/**
 * What is still owed, for this person, at this stage.
 *
 * Ordered as the table reads, which is the order somebody would ask in. Anything already answered
 * at any point in the run is gone for good: a fact does not stop being on the record because a new
 * round started.
 */
export function whatIsStillOwed(owed: Owed[], role: Role, stage: Stage, held: Held): Owed[] {
  return owed.filter((o) => {
    if (!o.role.includes(role) || !o.stage.includes(stage)) return false;
    if (held.answered.includes(o.id) || held.letGo.includes(o.id)) return false;
    if (o.satisfiedBy.length === 0) return true;
    return !o.satisfiedBy.some((t) => held.types.includes(t));
  });
}

/**
 * The block the conversation gets. Facts about what is missing, never questions to be read out.
 *
 * Empty when nothing is owed, so the caller drops it: a heading with nothing under it reads to a
 * model as an absence to be filled, which is how a check-in starts inventing things to ask.
 */
export function sayWhatIsMissing(still: Owed[], stage: Stage): string {
  if (!still.length) return '';
  /*
   * THE MODEL REPEATS THE WORDS IT IS GIVEN, SO THESE ARE THE PRODUCT'S WORDS.
   *
   * The first version of this block said "WHAT THIS CHECK-IN STILL NEEDS ON THE RECORD. This is a
   * middle round." Nobody was ever going to see that - it is an instruction, not a screen - but a
   * conversation fed "the record" and "middle round" starts handing them back, and "record" is a
   * banned word in this product for a reason. The two most likely leaks are named and refused
   * below, because the cheapest place to stop a phrase reaching somebody is before it is suggested.
   *
   * The stage tells the model what KIND of conversation this is. It is never a thing to announce:
   * a person checking in has no idea they are in round six of twelve and does not need one.
   */
  const framing: Record<Stage, string> = {
    first: 'This is the first time they have done this, so the job is to understand where things stand for them right now.',
    middle: 'They have done this before, so the job is to understand what has changed since the last time.',
    last: 'This is the last one, so the job is to understand where things ended up.',
  };
  return (
    `STILL TO COVER WITH THIS PERSON. ${framing[stage]}\n` +
    still.map((o) => `- ${o.what}`).join('\n') +
    '\nAsk in your own words, one at a time, and only where the conversation has not already ' +
    'covered it. These are things nobody has said yet, not a list to work through - and never ' +
    'read them out. Do not tell them which round this is or that anything is outstanding. If ' +
    'somebody will not or cannot answer one, leave it and move on.'
  );
}
