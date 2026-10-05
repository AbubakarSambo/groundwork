import { PLAIN_WORDS, SPOKEN_TO_THE_READER } from '../conversation/plain-words';
import { stillNeedsSomethingInWriting } from './what-the-documents-say';
import { CADENCE_WORDS, CADENCES, type Cadence } from './what-the-context-chat-heard';
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
  /** It runs until the lead ends it (request 37): the length is answered, so it is not asked. */
  runsUntilEnded?: boolean;
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
  /**
   * HOW MANY PEOPLE HAVE SOMETHING EXPECTED OF THEM AT ALL, seen or not.
   *
   * `perPersonObjectiveCount` counts only what may be READ AGAINST, which is right for reading and
   * wrong for asking. A lead who has just recorded an expectation for all six people was asked "what
   * is each person actually trying to achieve?" on the very next turn, because none of the six had
   * been seen by the person it is about yet - they cannot be, nobody has checked in. The product
   * asked again for what it had just written down.
   */
  perPersonAnyCount?: number;
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
  'NEW_PROJECT', 'HELP_TEAM_UNDERSTAND', 'ROLE_HANDOVER', 'NEW_COFOUNDER', 'OKR_ALIGNMENT', 'WORKPLAN_BUDGET',
  'BOARD_STRATEGY', 'PULSE_CHECK', 'COHORT_CHECK', 'NEW_HIRE', 'NEW_MANAGER', 'NEW_ADVISOR',
  'PIP', 'CONTRACT_RENEWAL', 'RECOGNITION', 'IMPLEMENTATION_TRACKING',
]);

export function contextGaps(g: ContextGaps): ContextGap[] {
  const gaps: ContextGap[] = [];

  if (!g.runsUntilEnded && (!g.timelineDays || g.timelineDays <= 0)) {
    gaps.push({
      key: 'timeline',
      ask: 'How long should this run? You can give an end date or a number of weeks. I need it to work out how many check-ins there will be.',
      suggests: null,
    });
  }

  if (!g.cadence) {
    gaps.push({
      key: 'cadence',
      ask: 'How often should people check in? They can check in every week, every two weeks, every month, or once at the end.',
      suggests: null,
    });
  }

  if (!g.successLooksLike?.trim()) {
    gaps.push({
      key: 'success',
      ask: 'What does doing well look like here? I do not mean a target for one person. What would make you say, at the end, that this went the way it should have?',
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
      ask: 'How will you count whether this is going well? Name the two or three measures. If they are already in something you have attached, say so and I will take them from there.',
      suggests: 'the plan, budget or scorecard the numbers were set in',
    });
  }

  if (g.partyCount < 2) {
    gaps.push({
      key: 'parties',
      ask: 'Who else is in this? With one person, the report is a record of what they said. With two or more, it can show you where people understand the same work differently.',
      suggests: null,
    });
  }

  /* Asked about the people who have nothing, and not at all where everybody has something - an
     expectation nobody has seen yet is not a missing expectation, it is an unseen one. */
  const haveSomething = Math.max(g.perPersonObjectiveCount, g.perPersonAnyCount ?? g.perPersonObjectiveCount);
  if (haveSomething < g.partyCount) {
    const without = g.partyCount - haveSomething;
    gaps.push({
      key: 'objectives',
      ask: without === g.partyCount
        ? 'What is each person actually trying to achieve? Without that, the report can only speak about the whole thing, not about how anybody is doing against their own part of it.'
        : `${without === 1 ? 'One person has' : `${without} people have`} nothing expected of them yet. What are they trying to achieve? Without it, the report can speak about the whole thing and not about their part of it.`,
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
export function contextChatPrompt(
  groundLabel: string,
  scenario: string,
  gaps: ContextGap[],
  /**
   * WHAT IT ALREADY HAS, so the first thing it says is not a cold greeting.
   *
   * Hafsah, 22 September 2026: "the chat doesnt seem to flow like a conversation to help you with
   * these things." She had pasted a quarter in - thirteen targets, six people, twelve rules - and
   * the next thing the chat said was "Hello! We're setting up the Groundwork ground...". A
   * conversation that cannot see what is on the page it sits on has to open by asking, every time.
   */
  holds?: { what: string; count: number }[],
  /**
   * AND WHAT IS ACTUALLY ON IT, so the conversation can answer a question about the page it sits on.
   *
   * "Are these targets right?" and "what is not settled?" were unanswerable: the chat knew how many
   * things there were and not what they said. Everything in this block is already on the screen in
   * front of the lead, so it discloses nothing - it stops the one control on the page being the only
   * thing that cannot see it.
   */
  onRecord?: { heading: string; lines: string[] }[],
): string {
  const gapList = gaps.length
    ? gaps.map((g) => `- ${g.key}: ${g.ask}${g.suggests ? ` (worth asking for: ${g.suggests})` : ''}`).join('\n')
    : '- nothing is missing that this conversation can fix.';
  const hasList = (holds ?? []).filter((h) => h.count > 0);

  return [
    `You are helping somebody set up a Groundwork ground called "${groundLabel}" (${scenario.replace(/_/g, ' ').toLowerCase()}).`,
    '',
    'A ground collects each person\'s own private account of a piece of work over several sessions, then shows where those accounts agree and differ. Your job here is the SETUP, not the accounts.',
    '',
    ...(hasList.length ? [
      'WHAT THIS CHECK-IN ALREADY HOLDS, which you can see and they can too:',
      ...hasList.map((h) => `- ${h.count} ${h.what}`),
      '',
      'OPEN ON THAT, NOT ON A GREETING. Your first message in a conversation that already has something recorded says what is here in one short line, then asks for the most important missing thing. Never introduce yourself, never explain what a ground is, and never ask for something this list says you already have.',
      '',
    ] : []),
    ...((onRecord ?? []).some((r) => r.lines.length) ? [
      'WHAT IS ON THIS CHECK-IN, IN FULL. They can see all of it on the page beside this conversation:',
      ...(onRecord ?? []).filter((r) => r.lines.length).flatMap((r) => [`${r.heading}:`, ...r.lines.map((l) => `  - ${l}`)]),
      '',
      'ANSWER A QUESTION ABOUT IT FROM THAT LIST AND NOTHING ELSE. "Are these targets right?", "what is not settled?", "what does nobody own?" are questions about the list above: read the relevant part back plainly, say what looks thin or contradictory in it, and do not invent a line that is not there. If they ask about something the list does not hold, say it is not here.',
      '',
    ] : []),
    'WHAT IS STILL MISSING, in the order it matters:',
    gapList,
    '',
    'THEY CAN ALSO CHANGE WHAT IS HERE, and that is part of this conversation rather than a different one. "Drop the 30-day rule", "the 12m is signed not collected", "Client C is Hassan\'s", "that one is decided" - take it, say back exactly which line you would change and how, and change it when they say yes. If you cannot tell which line they mean, ask which one.',
    '',
    'HOW TO ASK. One thing at a time, in your own words, shortest useful question first. Take what they give you and move on - if they answer a different question than you asked, that answer still counts. Never ask twice for something they have already told you.',
    '',
    'ANSWER THEM BEFORE YOU ASK. Whatever they just said gets a reply first: a question gets an answer, a greeting gets one short line back, something they have told you gets said back so they can see it landed. Only then the next question. A turn that ignores what somebody said and asks the next item on a list is not a conversation, and it is the thing people close this panel over.',
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
    /*
     * COACHING WAS ASKED FOR AND THIS RULE FORBADE IT.
     *
     * Hafsah, 22 September 2026: "Everything in the context chat can be used to guide and coach the
     * team and also help them where they are going wrong." Then, 23 September: "i didnt forbid
     * coaching... It seems i asked for coaching and then you did the opposite."
     *
     * She is right, and the old rule said so in as many words: "stop", "do not draw them out on
     * it", and then it pointed at a private note box under "About <that person>" - a control that
     * was removed on 23 September, so the one place it sent people no longer existed.
     *
     * WHAT THE RULE WAS ACTUALLY PROTECTING is still protected, and it is one thing: a lead's read
     * of somebody is the lead's read. It is recorded as theirs, it guides how this check-in is run,
     * and it is never handed to that person as a finding or quoted into their own check-in - which
     * is their account of their own work. That wall does not need silence to hold; it needs the
     * line to be labelled, which it now is.
     */
    '2. Coach them. If they tell you somebody is struggling, or difficult, or the problem, that is the conversation - do not stop it and do not send them somewhere else. Ask what they have seen, what they have already tried, and what they want to be different. Record it as THEIR READ of that person, in their words, and say plainly that it is kept as their read: it guides how this check-in is run and how you talk to them about it, and it is never quoted to that person as a finding or put into that person\'s own check-in, because a check-in is that person\'s account of their own work. A judgement is not a fact about somebody and is never recorded as one. But what they EXPECT of a named person - a number, a date, a piece of work they are to own - is a different thing again: take it, say it back plainly, and say it is recorded as theirs and marked unseen until that person reads it. Never tell them individual targets cannot be set here, and never send them to somebody else\'s check-in to set one.',
    '',
    '3. You do not decide anything. You ask and you suggest. Nothing is saved until they confirm it, so put what you have understood back to them in their own words and let them correct it.',
    '',
    'When nothing important is missing, say so and stop. A setup conversation that will not end teaches people to skip setup.',
    '',
    PLAIN_WORDS,
    '',
    SPOKEN_TO_THE_READER,
  ].join('\n');
}

/**
 * WHAT THIS CHECK-IN ALREADY HOLDS, WRITTEN BY THE PRODUCT, NOT ASKED OF THE MODEL. FIX 3.
 *
 * Driven live, item 15: a check-in that already had its length and rhythm set opened with "Hello,
 * I'm here to help you set up your Groundwork check-in. First, tell me, what does doing well look
 * like..." - a greeting, and not a word about what it already holds, even though the prompt's own
 * "OPEN ON THAT, NOT ON A GREETING" rule only fires when `whatThisCheckInAlreadyHolds` has a target, a
 * line, an action or a document to point at (see `hasList` in `contextChatPrompt`) - never for
 * duration or cadence on their own, because those two never appeared in that list at all.
 *
 * So the length and the rhythm, when either is set, are said as a plain sentence by the product
 * itself - "This check-in runs for 12 weeks and people check in once a week." - and it is PREPENDED
 * to the model's reply on the opening turn, never asked of the model: a fact the ground's own columns
 * already hold does not need a model call to say correctly, and a sentence written here cannot drift
 * from what a re-run of the model would have said.
 */
export function openingLine(timelineDays: number | null, cadence: string | null, runsUntilEnded = false): string | null {
  const parts: string[] = [];
  if (runsUntilEnded) {
    parts.push('runs until you end it');
  } else if (timelineDays && timelineDays > 0) {
    const weeks = Math.round(timelineDays / 7);
    parts.push(weeks >= 4 && timelineDays % 7 === 0 ? `runs for ${weeks} weeks` : `runs for ${timelineDays} days`);
  }
  const c = (cadence ?? '').toUpperCase().trim();
  if (CADENCES.includes(c as Cadence)) {
    parts.push(`people check in ${CADENCE_WORDS[c as Cadence]}`);
  }
  return parts.length ? `This check-in ${parts.join(' and ')}.` : null;
}

/**
 * THE GREETING THE MODEL STILL ADDS, DROPPED FROM AN OPENING TURN.
 *
 * "OPEN ON THAT, NOT ON A GREETING" is a prompt instruction, and the model does not reliably keep it,
 * particularly on the very first turn of a conversation where nothing in `hasList` gave it a reason
 * not to introduce itself. Narrow on purpose: only a self-introduction sentence at the very START of
 * the reply is dropped, never a "hello" that shows up mid-conversation answering something the lead
 * said, which is a normal, polite reply and not this defect.
 */
const OPENING_GREETING = /^(?:(?:hi|hey|hello|hiya|greetings|welcome)\b[^.!?\n]*[.!?]+\s*|[^.!?\n]*\bi(?:'m| am)\s+here to help[^.!?\n]*[.!?]+\s*)/i;

/**
 * DRIVEN LIVE: A SINGLE STRIP LEFT A SECOND GREETING SENTENCE STANDING.
 *
 * `openingSentence.test(the-context-chat.spec.ts)` proved a single sentence was stripped; the live
 * run (30 September 2026) showed the model writing TWO in a row - "Hello! I'm here to help you set
 * up your check-in." - and `String.replace` with no `/g` flag, on a pattern already anchored to `^`,
 * only ever removes the first match it finds at that position: "Hello! " went, and "I'm here to help
 * you set up your check-in." was still the first thing the lead read. Looped rather than given a
 * `/g` flag, because `/g` on a pattern anchored with `^` only ever matches once anyway - what is
 * needed is repetition FROM THE NEW START of the string after each removal, which only a loop gives.
 * Bounded to five passes so a reply that never stops matching cannot loop forever.
 */
export function withoutTheOpeningGreeting(reply: string): string {
  let out = reply;
  for (let i = 0; i < 5; i++) {
    const stripped = out.replace(OPENING_GREETING, '');
    if (stripped === out) break;
    out = stripped;
  }
  return out;
}
