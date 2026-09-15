import { stillNeedsSomethingInWriting } from './what-the-documents-say';
/**
 * THE CONTEXT CHAT. G37 and G23, the last of the seven and the largest.
 *
 * From the plan: "It probes for what setup did not capture, and recommends the
 * materials rather than waiting for uploads. This is what stops a ground being
 * created off one sentence, which is a live defect: a real Ground 1 run produced a
 * ninety-day ground from a single answer with no duration, no rhythm and no sense of
 * who was involved."
 *
 * WHAT IT IS. A conversation on the Context tab, for whoever runs the ground, about
 * the ground rather than about a person. It asks for what is missing, in the order
 * that matters, and it names the document that would settle each thing instead of
 * waiting for somebody to guess what to upload.
 *
 * WHAT IT MUST NOT BECOME, and this is the whole design constraint:
 *
 * 1. **It is not a check-in.** Nothing said here is an account of anything. It never
 *    reaches a report, it is never compared against what anybody else said, and it
 *    cannot corroborate a person - the same rule as a document (G24).
 * 2. **It is not about a person.** The moment a lead starts telling this thing what
 *    they think of somebody, it has become a closed dossier with a chat interface.
 *    Anything about a named individual belongs in a closed context note, where the
 *    product already says who can read it.
 * 3. **It does not decide.** It asks and it recommends. What gets saved is what the
 *    lead confirms, which is G24's fourth rule - extraction is confirmed rather than
 *    adopted.
 *
 * WHY THE PROMPT LIVES IN ITS OWN FILE. The same reason as
 * `between-session-notes.ts`: the wording IS the mechanism, and it should be
 * testable as text rather than as the code that concatenates it.
 */

/** What a ground needs before its first session, in the order it is worth asking. */
export interface ContextGaps {
  /** No duration means the ground cannot say how many sessions it holds. */
  timelineDays: number | null;
  /** No rhythm means the same. */
  cadence: string | null;
  /** How many measures this ground counts by. Zero means the board shows movement against nothing. */
  targetCount: number;
  /** Which situation this is, because not every one counts anything. */
  scenario: string;
  /**
   * WHAT DOING WELL LOOKS LIKE, AND IT WAS READING THE WRONG COLUMN.
   *
   * This was `brief`, and the whole success gap ran on it: it asked the question only when the
   * BRIEF was empty, and accepting the answer wrote the answer INTO the brief. Two different things
   * sharing one column, and each one breaking the other.
   *
   * The brief is what this check-in is for, in the lead's words, shown to everybody at the top of
   * their check-in. What doing well looks like is the standard people are read against - it lives
   * in `GroundBaseline`, versioned, with a reason when it changes, because a moved goal must never
   * be able to erase a record. Writing a success statement over the brief destroyed the first and
   * never recorded the second.
   *
   * What it produced, seen on a real check-in: a brief reading "You have two standards for Zainab's
   * first quarter. One you told her in week one; the other you have never written down and doubt
   * she knows about" - a statement about the lead's own private account, published to the team as
   * the description of the work. And a lead who had written a brief was never asked what success
   * looks like at all, because the gap thought the question was already answered.
   */
  successLooksLike: string | null;
  /** How many people are on it. One is a record, not a comparison. */
  partyCount: number;
  /** Whether anybody has said what each person is individually trying to achieve. */
  perPersonObjectiveCount: number;
  /** Documents everybody in the ground can work from. */
  openDocumentCount: number;
  /**
   * Whether the chat has actually been given their text.
   *
   * A count could only ever say a file exists, and the reason to want a document is that everybody
   * works from the same one - which a file nobody has read to the team does not achieve. So the gap
   * closes on having read it, not on it being there.
   */
  documentsWereRead?: boolean;
}

/** The gap, and the document that would settle it. */
export interface ContextGap {
  key: string;
  /** Said to the lead, in the product's voice. */
  ask: string;
  /**
   * The material that answers it. Recommending beats waiting: "upload something"
   * gets nothing, "the brief you sent them" gets the brief.
   */
  suggests: string | null;
}

/**
 * WHAT IS MISSING, WORST FIRST.
 *
 * Ordered by what it costs to be without it, not by how easy it is to ask. A ground
 * with no duration cannot count its own sessions - that is worse than having no
 * documents, so it goes first even though "send me the brief" is the easier question.
 */
/**
 * THE SITUATIONS THAT COUNT SOMETHING, AND THE ONES THAT DO NOT.
 *
 * A crisis, a one-off read, a drift and an open read hold a QUESTION rather than a target - asking
 * those for measures is the product telling somebody their situation is a different shape than it
 * is, on the day they are least able to argue with it. The rest have a number, a date or a count
 * somewhere in them, whether or not anybody has written it down yet.
 */
const WORTH_COUNTING = new Set([
  'NEW_PROJECT', 'ROLE_HANDOVER', 'NEW_COFOUNDER', 'OKR_ALIGNMENT', 'WORKPLAN_BUDGET',
  'BOARD_STRATEGY', 'PULSE_CHECK', 'COHORT_CHECK', 'NEW_HIRE', 'NEW_MANAGER', 'NEW_ADVISOR',
  'PIP', 'CONTRACT_RENEWAL', 'RECOGNITION', 'IMPLEMENTATION_TRACKING',
]);

export function contextGaps(g: ContextGaps): ContextGap[] {
  const gaps: ContextGap[] = [];

  if (!g.timelineDays || g.timelineDays <= 0) {
    gaps.push({
      key: 'timeline',
      ask: 'How long should this run? Until a date, or for a set number of weeks - either is fine, but without it we cannot work out how many check-ins this holds.',
      suggests: null,
    });
  }

  if (!g.cadence) {
    gaps.push({
      key: 'cadence',
      ask: 'How often should people check in? Weekly, fortnightly, monthly, or once at the end.',
      suggests: null,
    });
  }

  if (!g.successLooksLike?.trim()) {
    gaps.push({
      key: 'success',
      ask: 'What does doing well look like here? Not a target for one person - what would make you say, at the end, that this went the way it should have.',
      suggests: 'the plan, brief or terms this work was agreed against',
    });
  }

  /**
   * THE MEASURES, ASKED AFTER WHAT DOING WELL LOOKS LIKE AND BEFORE ANYTHING ABOUT PEOPLE.
   *
   * A board with no measures shows movement against nothing, and this was the one gap where the
   * document a lead has already uploaded usually holds the answer - so the question says so
   * plainly rather than making them retype a plan they attached ten minutes ago.
   *
   * Asked only where a measure is a thing the situation has. A crisis and a one-off read do not
   * count anything, and asking them for targets is the product telling somebody their situation is
   * a different shape than it is.
   */
  if (g.targetCount === 0 && WORTH_COUNTING.has(g.scenario)) {
    gaps.push({
      key: 'targets',
      ask: 'What is this counted by? Name the two or three measures - and if they are already in something you have attached, say so and I will take them from there.',
      suggests: 'the plan, budget or scorecard the numbers were set in',
    });
  }

  if (g.partyCount < 2) {
    gaps.push({
      key: 'parties',
      ask: 'Who else is in this? One account is a record; two or more is where the report can show you what people mean differently by the same work.',
      suggests: null,
    });
  }

  if (g.perPersonObjectiveCount < g.partyCount) {
    gaps.push({
      key: 'objectives',
      ask: 'What is each person actually trying to achieve? Without that, the report can only speak about the whole thing, not about how anybody is doing against their own part of it.',
      suggests: 'their job description, objectives, or the message where the work was handed over',
    });
  }

  if (stillNeedsSomethingInWriting(g.openDocumentCount, g.documentsWereRead !== false)) {
    gaps.push({
      key: 'documents',
      ask: g.openDocumentCount === 0
        ? 'Is there anything in writing everybody should be working from? Whatever you put in as open context, every check-in has read before it asks anything.'
        : 'There is something attached but nothing has read it yet. Open it as context so every check-in works from it.',
      suggests: 'the brief, the plan, the scope, the grant terms, or the message that started this',
    });
  }

  return gaps;
}

/**
 * The system prompt for the context chat.
 *
 * Written as a set of refusals as much as instructions, because the failure modes are
 * specific and every one of them is a version of "this stopped being about the work
 * and became about a person".
 */
export function contextChatPrompt(groundLabel: string, scenario: string, gaps: ContextGap[]): string {
  const gapList = gaps.length
    ? gaps.map((g) => `- ${g.key}: ${g.ask}${g.suggests ? ` (worth asking for: ${g.suggests})` : ''}`).join('\n')
    : '- nothing is missing that this conversation can fix.';

  return [
    `You are helping somebody set up a Groundwork ground called "${groundLabel}" (${scenario.replace(/_/g, ' ').toLowerCase()}).`,
    '',
    'A ground collects each person\'s own private account of a piece of work over several sessions, then shows where those accounts agree and differ. Your job here is the SETUP, not the accounts.',
    '',
    'WHAT IS STILL MISSING, in the order it matters:',
    gapList,
    '',
    'HOW TO ASK. One thing at a time, in your own words, shortest useful question first. Take what they give you and move on - if they answer a different question than you asked, that answer still counts. Never ask twice for something they have already told you.',
    '',
    'WHAT THEY CAN BRING TO THIS CONVERSATION, AND WHERE EACH THING GOES.',
    '',
    'Reported plainly: "I do not get what this is for". It was written as a gap-filling interview, so it asked its questions and had no answer for somebody arriving with something to add. Anything on this list is welcome, unprompted, at any point - and each one has a place it lands, so say which:',
    '',
    '- SOMETHING THAT HAS CHANGED. A revised scope, a moved deadline, a new constraint. It goes in the change log on this page, dated and kept - nothing is replaced, so the old one stays readable.',
    '- MORE OF WHAT SUCCESS LOOKS LIKE. Add it to what doing well means. This is the one that most often gets set once and never revisited, and a report can only say "on track" against something.',
    '- A GOAL OR A TARGET, for the check-in or for one person. A target is a goal with a number and a line it crosses; take whichever they have and do not press for a number they do not have.',
    '- A LIST OF THINGS TO BE DONE. Take it as commitments against whoever owns each one. Say plainly that a commitment is read back to that person in their next check-in and its state comes from what THEY say about it - this conversation cannot mark anything done, and nobody else can either.',
    '- A DOCUMENT. There is a button beside the message box. It is filed under this check-in\'s documents, everybody\'s check-in reads it before asking a question, and its visibility is set where it is filed.',
    '- SOMEBODY NEW WHO SHOULD BE IN THIS. You cannot add them from here - adding a person emails them an invitation, and that is not something a conversation should do on somebody\'s behalf. Say where the control is: Setup, the first band, "Add a person to this check-in".',
    '',
    'If what they bring is none of these, say what you can do with it rather than refusing. If it is about a named person, rule 2 below decides and it overrides everything on this list.',
    '',
    'RECOMMEND THE MATERIAL, DO NOT WAIT FOR IT. When something in writing would settle a question, name the document you mean - "the brief you sent them", "the grant terms" - rather than asking them to upload something unspecified. People do not know what counts as context; they do know what they emailed somebody.',
    '',
    'THREE THINGS YOU MUST NOT DO.',
    '',
    '1. This is not a check-in. Nothing said here is anybody\'s account of anything. Do not treat it as evidence, do not weigh it against what anybody else has said, and do not tell them it will appear in the report - it will not.',
    '',
    /*
     * A NUMBER FOR SOMEBODY IS NOT AN OPINION ABOUT SOMEBODY, AND THIS RULE COULD NOT TELL THEM
     * APART.
     *
     * Run live. The lead said "Amina is struggling with the wholesale accounts and I have not told
     * her a number yet" - the first half an opinion, the second half the gap. Refused, correctly.
     * Then she said "give her 3,000 units by December" and got the same refusal: "this setup
     * conversation isn't the right place to set individual targets, but once the check-in is set
     * up, you can add that target to Amina's check-in."
     *
     * Three things wrong with that. It is not true - an expectation of a named person is exactly
     * what this conversation records, and `proposalFrom` has had a branch for it the whole time.
     * The check-in is already set up and running. And a participant's check-in is THEIR account of
     * their own work, so it is the one place a lead's target for them must not be typed.
     *
     * It also broke the only loop that matters: her own first session had just told her to give
     * Sahar and Amina numbers, and the one conversation she has for doing that turned her away.
     *
     * The line is what the sentence is: a JUDGEMENT about somebody goes in the private note, a
     * NUMBER OR A JOB for somebody is recorded here, in her name, marked unseen until they read it.
     */
    '2. This is not about a person. A judgement about somebody is not recorded here; a target for them is. If they tell you what they think of somebody by name - that this person is difficult, or underperforming, or the problem - stop and say plainly that this conversation is about how the check-in is set up. Then point them at the ONE place that is for it, by name: the private context note further down this same Context page, under "About <that person>". Do not say it belongs in a check-in - a check-in is that person\'s own account of their own work, and telling a lead to put their opinion of somebody there is pointing them at the one place it must never go. Do not record it here and do not draw them out on it. The moment this becomes a place to say things about people, it is a file on somebody with a chat interface, and this product exists to be the opposite of that. But what they EXPECT of a named person - a number, a date, a piece of work they are to own - is the opposite case and belongs here: take it, say it back plainly, and say it is recorded as theirs and marked unseen until that person reads it. Never tell them individual targets cannot be set here, and never send them to somebody else\'s check-in to set one.',
    '',
    '3. You do not decide anything. You ask and you suggest. Nothing is saved until they confirm it, so put what you have understood back to them in their own words and let them correct it.',
    '',
    'When nothing important is missing, say so and stop. A setup conversation that will not end teaches people to skip setup.',
  ].join('\n');
}
