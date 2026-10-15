import { RecordEntryType } from '@prisma/client';
import type { Owed } from './what-a-check-in-owes';

/**
 * THE SPINE EVERY CHECK-IN HAS, WHATEVER THE SITUATION.
 *
 * Twenty-two situations had two lists between them. The two goal cards were written out slot by
 * slot; the other twenty ran their conversations from the prompt alone, which means first, middle
 * and last were shaped by whatever the model made of a session number in a sentence.
 *
 * Hafsah's rule, and this file is it:
 *
 *     first  = understand.  Establish the person's picture. Do not interrogate them.
 *     second = what changed. "Last time you said X. What has happened since?"
 *     last   = where it landed. "Where did we get to?"
 *
 * and underneath all of them, one question in five parts:
 *
 *     what were you meant to do -> what is actually happening -> how do you see it
 *     -> what has changed -> where do we need to act or support
 *
 * A SPINE, NOT A SCRIPT. Twenty-two hand-written tables would be twenty-two near-copies that drift
 * apart one edit at a time, and the first thing to go would be the thing they have in common. So
 * what every situation shares lives here once, and each situation adds only what is actually
 * different about it - which is also the honest test of whether it IS different.
 *
 * THE MODEL NEVER SEES THESE AS QUESTIONS. Same rule as the file next door: it is told what the
 * record is missing and asks in its own words. A slot name reaching a person would be a form
 * wearing a conversation.
 */
const T = RecordEntryType;

/**
 * FIRST IS UNDERSTAND, AND THAT IS A CONSTRAINT ON US RATHER THAN A DEMAND ON THEM.
 *
 * Three slots, not eight. Somebody's first check-in is the one where the product knows least and is
 * most tempted to ask most, and a first round that works through a checklist is the interrogation
 * this whole design exists to avoid. What is needed is their picture: what they were meant to do,
 * what is actually happening, and how they see it.
 */
const FIRST: Owed[] = [
  {
    id: 'meant-to', what: 'what they understood they were meant to do',
    role: ['lead', 'member', 'partner'], stage: ['first'],
    satisfiedBy: [T.SUCCESS_DEFINITION, T.INTENT, T.COMMITMENT],
  },
  {
    id: 'actually', what: 'what is actually happening, in their account of it',
    role: ['lead', 'member', 'partner'], stage: ['first'],
    satisfiedBy: [T.INTENT, T.COMMITMENT, T.WORRY, T.TENSION],
  },
  {
    id: 'how-they-see-it', what: 'how they see it - what is clear, and what is not',
    role: ['lead', 'member', 'partner'], stage: ['first'],
    satisfiedBy: [T.WORRY, T.ASK, T.TENSION, T.OPERATING_DIFFERENCE],
  },
];

/**
 * SECOND IS PICKING UP THE THREAD, WHICH IS ONLY POSSIBLE BECAUSE THE RECORD HOLDS ONE.
 *
 * "Last time you said X. What has happened since?" - and the X is real, from their own rows, put
 * in front of the conversation by what-the-record-already-holds. This says what is owed; that says
 * what is already there. Neither works without the other.
 */
const MIDDLE: Owed[] = [
  {
    id: 'since-then', what: 'what has happened since what they said last time',
    role: ['lead', 'member', 'partner'], stage: ['middle'],
    /* PROGRESS first: this slot is literally asking what happened, and until the record had a type
       for that, somebody who said "all forty are migrated" still read as not having answered it. */
    satisfiedBy: [T.PROGRESS, T.COMMITMENT, T.INTENT],
  },
  {
    id: 'in-the-way-now', what: 'what is getting in the way now',
    role: ['member', 'partner'], stage: ['middle'],
    satisfiedBy: [T.WORRY, T.TENSION, T.ASK],
  },
  {
    id: 'needs-acting-on', what: 'where somebody needs to act or step in',
    role: ['lead'], stage: ['middle'],
    satisfiedBy: [T.ASK, T.WORRY, T.TENSION],
  },
];

/** LAST IS CLOSING THE LOOP. Where did we get to, what did not get there, and what happens now. */
const LAST: Owed[] = [
  {
    id: 'where-it-landed', what: 'where it actually landed',
    role: ['lead', 'member', 'partner'], stage: ['last'],
    /* Where it LANDED is what happened, not what was promised or what good would have looked like.
       Both of those stay: on a last round people restate the standard they are judging it by. */
    satisfiedBy: [T.PROGRESS, T.COMMITMENT, T.SUCCESS_DEFINITION],
  },
  {
    id: 'left-open', what: 'what is still open or unresolved',
    role: ['lead', 'member', 'partner'], stage: ['last'],
    satisfiedBy: [T.WORRY, T.TENSION, T.ASK],
  },
  {
    id: 'what-next', what: 'what should happen next, and what would help',
    role: ['lead', 'member', 'partner'], stage: ['last'],
    satisfiedBy: [T.COMMITMENT, T.INTENT, T.ASK],
  },
];

export const THE_SPINE: Owed[] = [...FIRST, ...MIDDLE, ...LAST];

/**
 * AND WHAT EACH SITUATION ADDS TO IT.
 *
 * One or two slots each, and only where the situation genuinely asks for something the spine does
 * not. A situation with nothing here is not neglected - it is a situation whose whole job the spine
 * already does, and saying so is more useful than inventing a difference to fill a row.
 *
 * Keyed by the scenario on the ground. The two goal cards are deliberately absent: they have their
 * own written-out lists next door, given verbatim, and a spine underneath them would double up.
 */
export const WHAT_EACH_SITUATION_ADDS: Record<string, Owed[]> = {
  /* ---- Someone is starting, or a role is moving. ---- */
  NEW_HIRE: [
    { id: 'settling', what: 'how the start is actually going for them', role: ['member'], stage: ['middle'], satisfiedBy: [T.WORRY, T.TENSION, T.OPERATING_DIFFERENCE] },
    { id: 'what-would-help', what: 'what would make the job easier', role: ['member'], stage: ['middle', 'last'], satisfiedBy: [T.ASK] },
  ],
  NEW_MANAGER: [
    { id: 'team-as-found', what: 'what the team was doing before, as each person describes it', role: ['member', 'partner'], stage: ['first'], satisfiedBy: [T.INTENT, T.COMMITMENT] },
    { id: 'from-the-manager', what: 'what they need from the new manager', role: ['member', 'partner'], stage: ['first', 'middle'], satisfiedBy: [T.ASK] },
  ],
  NEW_ADVISOR: [
    { id: 'contribute', what: 'what they expect to contribute, and on what', role: ['partner'], stage: ['first'], satisfiedBy: [T.INTENT, T.COMMITMENT] },
    { id: 'been-useful', what: 'what has actually been useful', role: ['lead', 'partner'], stage: ['middle', 'last'], satisfiedBy: [], noTypeYet: true },
  ],
  NEW_COFOUNDER: [
    { id: 'who-decides', what: 'who decides what, where it is not written down', role: ['lead', 'partner'], stage: ['first'], satisfiedBy: [T.OPERATING_DIFFERENCE, T.SUCCESS_DEFINITION] },
    { id: 'matters-to-them', what: 'what matters most to them about how this works', role: ['lead', 'partner'], stage: ['first'], satisfiedBy: [T.TOLERANCE, T.WORRY] },
  ],
  ROLE_HANDOVER: [
    { id: 'must-not-drop', what: 'what must not be dropped in the handover', role: ['lead', 'member', 'partner'], stage: ['first'], satisfiedBy: [T.COMMITMENT, T.WORRY] },
    { id: 'found-since', what: 'what they have found since taking it over', role: ['member'], stage: ['middle', 'last'], satisfiedBy: [T.WORRY, T.TENSION, T.ASK] },
    { id: 'still-with-them', what: 'what is still sitting with the person handing over', role: ['lead', 'partner'], stage: ['middle', 'last'], satisfiedBy: [T.COMMITMENT, T.ASK] },
  ],

  /* ---- Work being done. ---- */
  NEW_PROJECT: [
    { id: 'their-part', what: 'the part of it that is theirs to deliver', role: ['member', 'partner'], stage: ['first'], satisfiedBy: [T.COMMITMENT, T.INTENT] },
    { id: 'by-when', what: 'when their part is meant to be done', role: ['member', 'partner'], stage: ['first', 'middle'], satisfiedBy: [T.TIMEFRAME] },
  ],
  WORKPLAN_BUDGET: [
    { id: 'planned-work', what: 'the work they are planning to do', role: ['member', 'partner'], stage: ['first'], satisfiedBy: [T.INTENT, T.COMMITMENT] },
    { id: 'what-it-needs', what: 'what that work needs to be possible - money, people, time', role: ['member', 'partner'], stage: ['first', 'middle'], satisfiedBy: [T.ASK, T.WORRY] },
    { id: 'against-plan', what: 'what actually happened against the plan', role: ['lead'], stage: ['middle', 'last'], satisfiedBy: [T.COMMITMENT, T.SUCCESS_DEFINITION] },
  ],
  PULSE_CHECK: [
    { id: 'right-now', what: 'how the work is going right now, not in general', role: ['member', 'partner'], stage: ['first', 'middle'], satisfiedBy: [T.INTENT, T.WORRY, T.TENSION] },
  ],
  DRIFT: [
    { id: 'what-they-think', what: 'what they think is actually wrong', role: ['lead', 'member', 'partner'], stage: ['first'], satisfiedBy: [T.WORRY, T.TENSION, T.OPERATING_DIFFERENCE] },
    { id: 'needs-changing', what: 'what would have to change for it to come right', role: ['lead', 'member', 'partner'], stage: ['middle', 'last'], satisfiedBy: [T.ASK, T.COMMITMENT] },
  ],

  /* ---- A decision, or a difference of view. ---- */
  CRISIS_ALIGNMENT: [
    { id: 'their-view', what: 'their own view of the decision, and what they are weighing', role: ['lead', 'member', 'partner'], stage: ['first'], satisfiedBy: [T.INTENT, T.TOLERANCE, T.WORRY] },
    { id: 'changed-view', what: 'whether their view has changed, and what changed it', role: ['lead', 'member', 'partner'], stage: ['middle'], satisfiedBy: [T.INTENT, T.OPERATING_DIFFERENCE] },
    { id: 'where-they-landed', what: 'where they landed, and anything they still cannot live with', role: ['lead', 'member', 'partner'], stage: ['last'], satisfiedBy: [T.TOLERANCE, T.WORRY, T.COMMITMENT] },
  ],
  REALIGN_TEAM: [
    { id: 'how-they-see', what: 'how they see the situation, without being asked to agree', role: ['lead', 'member', 'partner'], stage: ['first'], satisfiedBy: [T.OPERATING_DIFFERENCE, T.TENSION, T.WORRY] },
    { id: 'what-remains', what: 'what they think still needs to be understood or settled', role: ['lead', 'member', 'partner'], stage: ['last'], satisfiedBy: [T.TENSION, T.ASK] },
  ],
  ACUTE_SHOCK: [
    { id: 'what-they-saw', what: 'what they saw happen, in their own account', role: ['lead', 'member', 'partner'], stage: ['first'], satisfiedBy: [T.INTENT, T.WORRY, T.TENSION] },
    { id: 'effect-on-work', what: 'how it has affected the work they are responsible for', role: ['member', 'partner'], stage: ['first', 'middle'], satisfiedBy: [T.WORRY, T.TENSION, T.ASK] },
  ],

  /* ---- An agreement between two sides. ---- */
  CONTRACT_REVIEW: [
    { id: 'makes-sense', what: 'what in the agreement makes sense to them and what does not', role: ['lead', 'member', 'partner'], stage: ['first'], satisfiedBy: [T.WORRY, T.TENSION, T.OPERATING_DIFFERENCE] },
    { id: 'comfortable', what: 'whether they are comfortable going ahead', role: ['lead', 'member', 'partner'], stage: ['last'], satisfiedBy: [T.TOLERANCE, T.WORRY] },
  ],
  IMPLEMENTATION_TRACKING: [
    { id: 'their-side', what: 'what their side is responsible for under the agreement', role: ['lead', 'member', 'partner'], stage: ['first'], satisfiedBy: [T.COMMITMENT, T.SUCCESS_DEFINITION] },
    { id: 'being-kept', what: 'whether it is being kept in practice, both ways', role: ['lead', 'member', 'partner'], stage: ['middle', 'last'], satisfiedBy: [T.COMMITMENT, T.TENSION, T.WORRY] },
  ],
  CONTRACT_RENEWAL: [
    { id: 'how-it-went', what: 'how the relationship has actually worked from their side', role: ['lead', 'member', 'partner'], stage: ['first'], satisfiedBy: [T.INTENT, T.TENSION, T.WORRY] },
    { id: 'continue-change-stop', what: 'what should continue, change or stop', role: ['lead', 'member', 'partner'], stage: ['last'], satisfiedBy: [T.COMMITMENT, T.INTENT, T.ASK] },
  ],

  /* ---- A person being read. Both of these decide something about somebody. ---- */
  RECOGNITION: [
    { id: 'carried', what: 'what they have actually carried, in their own account', role: ['member'], stage: ['first', 'middle'], satisfiedBy: [T.COMMITMENT, T.INTENT] },
    { id: 'want-understood', what: 'anything they want understood about their contribution', role: ['member'], stage: ['middle', 'last'], satisfiedBy: [], noTypeYet: true },
  ],
  PIP: [
    /*
     * WHAT IS HAPPENING, NOT WHY THEY FAILED. The whole design rule for this card: understand what
     * is getting in the way without jumping to a conclusion about the person. So the slots ask for
     * their account and for what is in the way, and there is no slot anywhere asking anybody to
     * explain a shortfall.
     */
    { id: 'from-their-side', what: 'what is happening from their own side', role: ['member'], stage: ['first'], satisfiedBy: [T.INTENT, T.WORRY, T.TENSION] },
    { id: 'in-the-way-of-it', what: 'what is getting in the way, including anything outside their control', role: ['member'], stage: ['first', 'middle'], satisfiedBy: [T.WORRY, T.TENSION, T.ASK] },
    { id: 'support-helping', what: 'what support has been given, and whether it is helping', role: ['lead', 'member'], stage: ['middle', 'last'], satisfiedBy: [T.ASK, T.COMMITMENT] },
  ],
  COHORT_CHECK: [
    /* A borrower who repays early by hiring the tractor out while her own field went unploughed was read as the star
       (adversarial run, 20 Sep 2026): the check-in never asked what the thing was FOR. The outcome it was taken on to
       produce is a different fact from the obligation that came with it, and the first session owes it by name. */
    { id: 'what-it-was-for', what: 'what they took this on to get. The asset, the loan or the programme was meant to produce something for them; get that in their own words. Repaying or attending is the obligation, not the outcome.', role: ['member'], stage: ['first'], satisfiedBy: [T.SUCCESS_DEFINITION] },
    { id: 'against-what-it-was-for', what: 'where they stand against that original outcome. Ask this apart from whether they are repaying or attending. If the two have come apart, find out which way and why.', role: ['member'], stage: ['middle', 'last'], satisfiedBy: [T.PROGRESS, T.SUCCESS_DEFINITION] },
    { id: 'own-experience', what: 'their own experience of the role, not the group’s', role: ['member'], stage: ['first', 'middle'], satisfiedBy: [T.INTENT, T.WORRY, T.TENSION] },
    { id: 'would-make-it-work', what: 'what would make the role work better', role: ['member'], stage: ['last'], satisfiedBy: [T.ASK, T.OPERATING_DIFFERENCE] },
  ],

  /* ---- Nothing to add. ---- */
  /*
   * OPEN_READ and SNAPSHOT get the spine and nothing else, and that is the correct answer rather
   * than an omission. OPEN_READ exists precisely because the situation does not fit a card, so a
   * list of situation-specific things it owes would be inventing the situation it was created to
   * admit it does not know. SNAPSHOT is one round: understand, once - which is the first stage of
   * the spine and the whole of the job.
   */
};

/**
 * SOMEBODY WHO HAS JUST STARTED HAS NOTHING "ACTUALLY HAPPENING" YET. Hafsah, 21 September 2026, on
 * a new hire's first session: "asking a new person what they are doing versus what they intend to do
 * versus approach". The spine's first-stage item "what is actually happening" turned into "what
 * specific projects are you working on right now" for a man in his first weeks. At a start, the
 * honest first-stage questions are what they mean to do first and how they mean to go about it.
 */
const STARTING = new Set(['NEW_HIRE', 'NEW_COFOUNDER', 'NEW_ADVISOR', 'NEW_PROJECT', 'HELP_TEAM_UNDERSTAND', 'NEW_MANAGER', 'ROLE_HANDOVER']);
const AT_A_START: Owed = {
  id: 'actually',
  what: 'what they mean to do first, and how they intend to go about it - their approach, not a list of things already done',
  role: ['lead', 'member', 'partner'], stage: ['first'],
  satisfiedBy: [T.INTENT, T.COMMITMENT, T.WORRY, T.TENSION],
};

/** The spine, plus whatever this situation adds. */
export function everythingOwedFor(scenario: string): Owed[] {
  const spine = STARTING.has(scenario) ? THE_SPINE.map((o) => (o.id === 'actually' ? AT_A_START : o)) : THE_SPINE;
  return [...spine, ...(WHAT_EACH_SITUATION_ADDS[scenario] ?? [])];
}

/* The anchor's check-ins owe what a project's did before the anchor had a situation of its own. */
WHAT_EACH_SITUATION_ADDS.HELP_TEAM_UNDERSTAND = WHAT_EACH_SITUATION_ADDS.NEW_PROJECT;
