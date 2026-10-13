import { GroundScenario, GroundMoment } from '@prisma/client';

/**
 * TWENTY-TWO SITUATIONS THAT ALL OPENED WITH THE SAME QUESTION.
 *
 * Her words: "what is most fucking annoying is that we have 22 scenarios and they all start the
 * same, new hire does not ask you about the new hire."
 *
 * She was right, and the cause was not the wording. `POST /entry/onboard` received `{ messages }`
 * and nothing else - no scenario, no moment - so one prompt served every card. The sentence the
 * card posts sat in the history as an ordinary user message and the model was never told a pick had
 * happened or which one it was. Every situation therefore opened on the same generic question about
 * the situation, which is a question the person has just answered by clicking.
 *
 * WHAT MADE IT WORSE. The check-in engine on the other side of setup is deeply situation-aware -
 * nineteen of the twenty-two had a written pack, and NEW_HIRE's own check-in question is "Who have
 * you just hired and what did you bring them in to do?". So the product knew the right question and
 * asked it ten minutes late, after setup had already spent four turns establishing what the card
 * had said at the start.
 *
 * WHAT THIS FILE IS. The first question setup asks, per situation. One line each, and the test of a
 * good one is that it could not be asked of any other card: it names the thing the card names and
 * asks for the specifics the card cannot carry. "Who is the new hire, and when do they start" is a
 * question about a new hire. "What is the situation about" is a question about nothing.
 *
 * WHY IT LIVES BESIDE THE ENTRY SERVICE RATHER THAN IN prompt-library.ts. That file is the CHECK-IN
 * engine: what a person is asked once they are giving their account. This is setup, which is a
 * different job with a different job's questions - it is establishing what the record is OF, not
 * building the record. Keeping them apart is what stops setup slowly turning into a first check-in
 * that the real one then repeats.
 */
export type TheFirstQuestion = {
  /** The question itself, in the second person, ready to be asked. */
  ask: string;
  /**
   * What the model should have by the time this question and its follow-up are answered. Not a
   * script - the fields the extractor is looking for, said in the language of this situation, so
   * the model knows when to move on rather than asking a third version of the same thing.
   */
  until: string;
};

/**
 * A situation with no entry here is a situation that opens generically, which is the whole bug -
 * so the guard beside this file reads the enum, not this record, and goes red on a missing key.
 */
export const THE_FIRST_QUESTION: Record<GroundScenario, TheFirstQuestion> = {
  NEW_HIRE: {
    ask: 'Who is the new hire, and what did you bring them in to do?',
    until: 'their name or role, when they start, and what the job is actually for',
  },
  NEW_COFOUNDER: {
    ask: 'Who is joining you, and what is the arrangement?',
    until: 'who they are, what they are bringing that nobody else can, and whether equity or a title is already settled',
  },
  NEW_ADVISOR: {
    ask: 'Who is coming on, and what are they being brought in for?',
    until: 'who they are, what they are expected to contribute, and what they are being paid or given',
  },
  /* The anchor's first question, from docs/anchor-scenario.md section 6. The anchor's door, its opening text and its conversation all read it from here (decision 114). */
  HELP_TEAM_UNDERSTAND: {
    ask: "What's happening right now that makes you wish your team saw more of what you see?",
    until: 'what the lead is carrying and what they are seeing today',
  },
  NEW_PROJECT: {
    ask: 'What is the project, and who is on it?',
    until: 'what is being built or delivered, who is working on it, and by when',
  },
  NEW_MANAGER: {
    ask: 'Who is taking over, and what are they taking over?',
    until: 'who the new manager is, which team or area, and when they step in',
  },
  CONTRACT_RENEWAL: {
    ask: 'What is the agreement, and who is on the other side of it?',
    until: 'what the arrangement covers, who the counterparty is, and when the renewal lands',
  },
  ROLE_HANDOVER: {
    ask: 'Who is handing over, and who is taking it on?',
    until: 'both names or roles, what the role covers, and the last day of the handover',
  },
  CONTRACT_REVIEW: {
    ask: 'What are you about to sign, and who with?',
    until: 'what the agreement is for, who the other side is, and when it is due to be signed',
  },
  IMPLEMENTATION_TRACKING: {
    ask: 'What agreement is running, and who is on the other side of it?',
    until: 'what was signed, with whom, and what each side is supposed to be doing under it',
  },
  RECOGNITION: {
    ask: 'What went well, and who did it?',
    until: 'what actually happened, who was involved, and what you want on the record about it',
  },
  DRIFT: {
    ask: 'Which project has drifted, and what has changed since you agreed it?',
    until: 'which piece of work, what was originally agreed, and what is different now',
  },
  CRISIS_ALIGNMENT: {
    ask: 'What is the decision, and when does it have to be made?',
    until: 'what is being decided, who is in the room for it, and the date it has to be made by',
  },
  OKR_ALIGNMENT: {
    /*
     * THE GOAL FIRST, THEN THE PEOPLE. This asked for the period first, which is the least
     * interesting thing about somebody's quarter and reads like a form opening on a date field.
     * Her shape: what are you trying to hit, and who is being pulled in to get there.
     */
    ask: 'What are you trying to hit this period, and who is being pulled in to get there?',
    until: 'what the goals are, who is involved, and the period they run over',
  },
  WORKPLAN_BUDGET: {
    ask: 'What is the plan for, and what resources do you actually have?',
    until: 'the period, who owns which part, and the money or people available',
  },
  PULSE_CHECK: {
    ask: 'Who is on the team, and what are they each working on?',
    until: 'who the people are, what each of them owns, and how often you want to hear from them',
  },
  /*
   * THREE THINGS AND NOT ONE MORE. Who, what you want to know in one line, and how often. There is
   * no aim to agree and nothing to set up - somebody who wanted those opened a different card - so
   * this is the shortest `until` in the file on purpose.
   */
  TEAM_UPDATES: {
    ask: 'What is the one thing you want to ask them? Your words - they will answer exactly this.',
    until: 'the one line they are answering, who is answering it, and how often you want it',
  },
  REALIGN_TEAM: {
    ask: 'Who do you need to realign with, and what do you think you see differently?',
    until: 'who the other person is and what the disagreement is actually about',
  },
  PIP: {
    ask: 'Who is this about, and what is not happening that should be?',
    until: 'the person, what is slipping specifically, and how long this has been going on',
  },
  BOARD_STRATEGY: {
    ask: 'Who is on the leadership team, and what is the strategic question in front of you?',
    until: 'who is in the room, what has to be decided, and when',
  },
  COHORT_CHECK: {
    ask: 'Who is in the group, and what are they all doing?',
    until: 'roughly how many people, what they have in common, and what you are trying to see across them',
  },
  ACUTE_SHOCK: {
    ask: 'What happened, and when?',
    until: 'the event, when it happened, and who it hit',
  },
  SNAPSHOT: {
    ask: 'Who do you want to hear from, and what do you want to ask them?',
    until: 'who the people are and what the one read is about. Nothing else - this is a single round',
  },
  OPEN_READ: {
    /*
     * THE ONE THAT CANNOT NAME THE SITUATION, because the person chose to describe their own and
     * nothing has been classified yet. So it asks the open question honestly rather than pretending
     * to know - and `classifyIntent` runs on their answer, after which the specific pack takes over.
     */
    ask: 'What is going on? Tell me in your own words - a couple of sentences is plenty.',
    until: 'enough of the situation to know what it is, who is in it, and why it matters now',
  },
  DISCOVERY: {
    ask: 'What are you trying to work out, and who are you asking?',
    until: 'the decision this is meant to inform, and roughly who is in the room',
  },
};

/**
 * The block that goes into the setup prompt for this situation.
 *
 * Returns an empty string for no scenario at all, which is the honest state before somebody has
 * picked or described anything - the generic opener still stands there, and it should.
 */
export function theSetupPackFor(
  scenario: GroundScenario | null | undefined,
  moment?: GroundMoment | null,
): string {
  if (!scenario) return '';
  const q = THE_FIRST_QUESTION[scenario];
  if (!q) return '';

  /*
   * COHORT_CHECK IS TWO SITUATIONS UNDER ONE NAME, and the check-in engine already branches on the
   * moment for exactly this reason: at the start it is an onboarding period that ends in a decision
   * about each person, later it is a repeatable read. Setup asks a different first question for
   * each, so the branch belongs here too rather than being answered once and wrongly.
   */
  const ask =
    scenario === GroundScenario.COHORT_CHECK && moment === GroundMoment.STARTING
      ? 'Who are you onboarding, and what are they all starting?'
      : q.ask;

  /**
   * AND WHETHER THE CARD ALREADY ANSWERED "IS THIS A ONE OFF OR DOES IT COME BACK ROUND".
   *
   * Driven live on "A new hire starting", the setup chat asked that question three times in six
   * turns - once, again after an answer about something else, and a third time after the person
   * stopped to ask what it even meant ("is this about me or someone else"). Two passes of
   * instruction did not stop it, which is the signal to stop instructing: the card ALREADY carries
   * the answer. Somebody who clicked "A new hire starting" has said this is something starting,
   * exactly as they said what the situation is by clicking - and the pack's next line already
   * forbids asking THAT back for the same reason.
   *
   * So the question is removed rather than rationed, and how often people check in keeps the
   * scenario's default, which is on the Setup tab where it can be changed. A loop that cannot be
   * entered needs no rule about how many times to go round it.
   */
  const momentIsKnown = !!moment;
  const momentSaid: Record<string, string> = {
    STARTING: 'something that is just starting',
    UNDERWAY: 'something already underway',
    HAPPENED: 'something that has already happened',
    RECURRING: 'a read they want to repeat',
  };

  return [
    'THE SITUATION THEY PICKED, AND THE FIRST QUESTION IT DESERVES.',
    '',
    `They chose this situation from a list, so you already know what this is. Do NOT ask them what the situation is about - they have answered that, and asking it back is the single thing that makes this feel like the click went nowhere.`,
    '',
    ...(momentIsKnown
      ? [
        `AND THE SAME GOES FOR WHEN. The card says this is ${momentSaid[String(moment)] ?? 'already placed in time'}, so that is settled: NEVER ask whether this is a one off, whether they will be checking in regularly, or whether it is something that comes back round. It was asked three times in one live run and read as not listening.`,
        '',
        'AND NEVER ASK HOW LONG IT RUNS OR HOW OFTEN PEOPLE CHECK IN. Both already have a value from the situation they picked, the screen shows it while they talk, and both are changed on the Setup tab in two clicks afterwards. Asked here they are two more questions before anybody has said anything real, and the answer is a guess about a person who has not started yet. Driven live, this was the question that would not stop coming: banned as the moment, it came back as "how long should this run for, and how often would you like to check in with Margaret".',
        '',
      ]
      : []),
    /*
     * "AFTER THE ONE ABOUT WHO WRITES THE OBJECTIVE" USED TO BE HERE, AND IT KEPT THAT QUESTION ALIVE.
     *
     * The general rules had already been rewritten to forbid asking it - it moved to the end, to the
     * screen, with two buttons. This line still told the model to ask it first, so it did: driven
     * against the live endpoint, "A new hire starting. Before we get into the details, who writes
     * the objective here, and who checks in against it?" Two halves of one prompt disagreeing, and
     * the one that named a question won over the one that forbade it.
     *
     * Caught by running it, not by reading it. Every test passed.
     */
    `YOUR FIRST QUESTION IS THIS ONE, or a close version of it in your own words. Ask it straight away - nothing comes before it:`,
    `  "${ask}"`,
    '',
    `Keep asking around it until you have: ${q.until}.`,
    '',
    `Then move on to the rest of setup in the usual order. Do not re-ask any part of this later, and do not ask a generic version of it first as a warm-up.`,
  ].join('\n');
}
