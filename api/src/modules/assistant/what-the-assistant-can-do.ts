/**
 * ONE DECLARATION PER THING THE ASSISTANT CAN DO.
 *
 * Every capability was a hand-written pattern, a hand-written query and a
 * hand-written sentence, and a new one had to be checked by hand against every
 * pattern already there. Fourteen was manageable. In a single day of adding two
 * more, four collisions happened:
 *
 *   "set up a check-in about our objectives" -> taken by the objective lane
 *   "how do I run a check-in"                -> taken by the check-in lane
 *   "how does the freeze work"               -> taken by nothing
 *   "how do the phases work"                 -> taken by nothing
 *
 * None of them failed. The wrong lane answered, plausibly, and the only reason
 * anybody noticed is that somebody asked the question out loud.
 *
 * SO EACH CAPABILITY DECLARES WHAT IT OWNS AND WHAT IT MUST NOT TAKE, and a
 * guard runs every one of those phrasings through the real router. A collision
 * becomes a failing test rather than a plausible answer, which is the whole
 * difference between fourteen of these and forty.
 *
 * THE ORDER IS STILL AN ORDER, and it is still load-bearing — a specific rule
 * has to be tried before a general one. What changes is that the reason for a
 * position is a field somebody has to fill in rather than a comment somebody
 * might write.
 */
import { Lane } from './the-router-is-deterministic';

export interface Capability {
  /** The lane it routes to. One per lane, and the guard checks both ways. */
  key: Lane;
  /** What it does, in the words somebody would use for it. */
  does: string;
  /**
   * Whether it changes anything, and how that is agreed.
   *
   * The model may propose; deterministic code performs. Nothing here writes on
   * a sentence alone.
   */
  writes: 'nothing' | 'after you confirm it' | 'opens a draft nobody has agreed yet';
  /** Why it sits where it sits. A position with no reason is one nobody can move safely. */
  ordered: string;
  /** Phrasings this capability owns. Every one is routed in the guard. */
  owns: string[];
  /** Phrasings it must NOT take. Every one is routed in the guard, and must land elsewhere. */
  refuses: string[];
}

/**
 * In the order the router tries them. See `ordered` on each for why.
 *
 * `unplaced` is not here: it is the default rather than a capability, and it is
 * the honest half of this design — a question nothing owns gets said so.
 */
export const WHAT_THE_ASSISTANT_CAN_DO: Capability[] = [
  {
    key: 'what_can_you_do',
    does: 'Say what this reader can do here, in plain sentences: the check-ins they are in or run, the suites switched on for them and what waits for them to approve',
    writes: 'nothing',
    ordered: 'First, because "help" and "what can you do" are whole messages that no other lane should read, and "how do I use this" would otherwise be read as a handbook question. Whole message only, so "help me think through the Q4 target" stays with its own lane.',
    owns: ['What can you help me with?', 'help', 'what can you do', 'what can I ask you?', 'how can you help', 'how do I use this'],
    refuses: ['help me think through the Q4 target', 'what can you see', 'how do I swap the on-call rota'],
  },
  {
    key: 'set_up_a_suite',
    does: 'For an admin, set up how leave requests, spending requests, time sheets or performance reviews work by describing it. Only what is missing is asked, one question at a time, the whole of it is said back in plain sentences, and nothing is set until you say yes. Anybody else is told that an admin sets it up, and nothing changes.',
    writes: 'after you confirm it',
    ordered: 'First of all, because "set up our leave process" holds the word leave, which the leave lane would read as a request for time off. Narrow: a word for setting up, then only the suite and words such as process or rules to the end, and never a check-in.',
    owns: ['Set up our employee leave process', 'set up leave requests', 'configure how leave works', 'set up our spending approvals', 'set up the expenses process', 'set up timesheets', 'set up performance reviews', 'set up our review process'],
    refuses: ['set up a check-in', 'I want leave on 20 October', 'what is our leave policy', 'set up a check-in about our leave process', 'I spent 12,000 on fuel', 'how do we handle expenses', 'I did 6 hours on Atlas today', 'set up a review for Aisha'],
  },
  {
    key: 'tick_off_a_to_do',
    does: 'Mark one of your own to-dos or commitments as done by naming it. It is said back first.',
    writes: 'after you confirm it',
    ordered: 'First, because "done: send the rota" holds the same words as the to-do it closes.',
    owns: ['done: send the rota', 'tick off the rota', 'mark the rota as done'],
    refuses: ['what did I commit to', 'what am I on'],
  },
  {
    key: 'move_a_deadline',
    does: 'Move the day on one of your own commitments, or on one you set for somebody on a check-in you run. It is said back with both days first.',
    writes: 'after you confirm it',
    ordered: 'Above adding a to-do, because "push the rota back to Friday" changes something that already has a day.',
    owns: ['move the Westgate price list to Tuesday', 'push the rota back to Friday', 'change the deadline on the report to 7 October'],
    refuses: ['what did I commit to', 'what is on my list?'],
  },
  {
    key: 'add_a_commitment',
    does: 'Write down something you will do, with the day if you give one. It is said back first, and it is yours.',
    writes: 'after you confirm it',
    ordered: 'Above adding a to-do, because a commitment is to somebody and a to-do is a note to yourself.',
    owns: ['add a commitment: book the room by Friday', 'commit me to sending the report'],
    refuses: ['add the rota to my to-do list', 'remind me to book the room'],
  },
  {
    key: 'think_it_through',
    does: 'Lay out two to four options for something you are deciding, such as a target, with what each would mean, what it assumes and what would show it is working. It never says which to choose and writes nothing.',
    writes: 'nothing',
    ordered: 'Above the objective lane, because "help me think through the Q4 target" holds the word target and must not open a draft. Below the lanes that change something.',
    owns: ['help me think through the Q4 target', 'what are my options for the Atlas deadline', 'let us think it through', 'brainstorm how to hit the quarter'],
    refuses: ['set a target for Q4', 'add a commitment: call the depot', 'what should we talk about'],
  },
  {
    key: 'add_a_to_do',
    does: 'Put a note to yourself on your own list. Nobody else reads it and no report weighs it.',
    writes: 'after you confirm it',
    ordered: 'Above the document lane, because "add the rota to my to-do list" names a list and "add the rota" names a file.',
    owns: ['add the rota to my to-do list', 'to-do: chase the invoice', 'remind me to book the room', 'note to self: renew the domain'],
    refuses: ['add the handbook', 'upload a document'],
  },
  {
    key: 'my_to_dos',
    does: 'What is on your own list, open first',
    writes: 'nothing',
    ordered: 'Below adding, so the sentence that adds is not read as a request to list.',
    owns: ['what is on my list?', 'my to-dos', 'what do I still have to do'],
    refuses: ['my commitments', 'what am I on', 'add the rota to my to-do list'],
  },
  {
    key: 'add_a_document',
    does: 'Put a document into a check-in - a file, or a link to where it already lives - and say who it is for',
    writes: 'after you confirm it',
    ordered:
      'Above the sending lane: "send me the handbook" and "add the handbook" are opposite directions, and that lane owns the word "send".',
    owns: ['upload a document', 'add our handbook', 'here is our policy', 'attach a file'],
    refuses: ['email me that', 'what did we agree'],
  },
  {
    key: 'send_me_that',
    does: 'Email you what I just told you, to you and nobody else',
    writes: 'after you confirm it',
    ordered:
      'This comes first. The objectives lane reads "Email me what I am on" as a question about their work. The box would then answer only half of what was asked.',
    owns: ['email me that', 'can you send me this', 'send it to me'],
    refuses: ['what am I on', 'what did I commit to'],
  },
  {
    key: 'start_a_check_in',
    does: 'Start a check-in that is waiting, or open a new one and invite the people in it',
    writes: 'after you confirm it',
    ordered:
      'This comes before the objective lane. "Set up a check-in about our objectives" asks to start a session. That lane reads it as a request to write an objective. Starting a check-in that exists and opening one that does not are the SAME capability on purpose. Nobody should have to know which they want, and a second lane claiming these words would be another collision.',
    owns: ['start my check-in', 'can I start my check-in', 'set up a check-in', 'open the session'],
    refuses: ['how do I run a check-in', 'when is the next session', 'what is my check-in about'],
  },
  {
    key: 'set_an_objective',
    does: 'Open a draft objective and ask what it needs: the measure, the number, why that number, and how it moves',
    writes: 'opens a draft nobody has agreed yet',
    ordered:
      'Above the lanes that answer questions about objectives, because somebody asking to SET one is not asking what exists.',
    owns: ['set an objective for the quarter', 'help me write a goal for onboarding', 'objective setting'],
    refuses: ['what are my objectives', 'how are we doing against the objective'],
  },
  {
    key: 'where_am_i_up_to',
    does: 'Where somebody has got to in their first weeks',
    writes: 'nothing',
    ordered:
      'Above the coaching and handoff lanes. "What am I meant to be doing" from somebody in their first fortnight is a question about their onboarding, and answering it with a stuck handoff is answering a question they did not ask at the moment they are least able to tell.',
    owns: ['where am I up to', 'am I set up', 'what is my role'],
    refuses: ['what is stuck', 'how am I doing'],
  },
  {
    key: 'what_should_we_talk_about',
    does: 'The conversations the record suggests, and answering yes or no to one',
    writes: 'after you confirm it',
    ordered:
      'This comes above what_is_stuck and how_am_i_doing. Those suggestions are addressed to this person by name and they expire, so they are the better answer where both would fit.',
    owns: ['what should we talk about', 'what is waiting on me to decide'],
    refuses: ['what is stuck', 'how am I doing'],
  },
  {
    key: 'what_am_i_on',
    does: 'The objectives somebody owns or contributes to, with why the number is the number',
    writes: 'nothing',
    ordered: 'Below the lanes that start something, above the general ones.',
    owns: ['what am I on', 'what are my objectives'],
    refuses: ['what did I commit to', 'who is Sam'],
  },
  {
    key: 'what_did_i_commit_to',
    does: 'What somebody said they would do',
    writes: 'nothing',
    ordered: 'Beside what_am_i_on, and one pronoun apart from what_came_of_it.',
    owns: ['what did I agree to', 'my commitments'],
    refuses: ['what did we agree', 'what am I on'],
  },
  {
    key: 'what_came_of_it',
    does: 'What a released round produced, for somebody who was in it',
    writes: 'nothing',
    ordered: 'One pronoun from what_did_i_commit_to, so it sits next to it.',
    owns: ['what did we agree', 'what came of the last round'],
    refuses: ['what did I agree to'],
  },
  {
    key: 'who_is',
    does: 'Who somebody is on the roster, and nothing about how they are doing',
    writes: 'nothing',
    ordered: 'Above the general lanes: a question about a named person is about that person.',
    owns: ['who is Sam', 'who does Sam report to'],
    refuses: ['what am I on'],
  },
  {
    key: 'where_am_i_needed',
    does: 'What is waiting on this person, across the organisation',
    writes: 'nothing',
    ordered:
      'Below the specific ones, and above nothing in particular - it is the broad "is anybody blocked on me" question.',
    owns: ['where am I needed'],
    /* "Who is waiting on me" is a HANDOFF question, not a directory lookup, and
       two existing guards pin it to what_is_stuck. I declared it here and was
       wrong; the registry is what said so. */
    refuses: ['who is waiting on me'],
  },
  {
    key: 'what_is_stuck',
    does: 'What has stopped moving, and who is waiting',
    writes: 'nothing',
    ordered: 'Below where_am_i_needed, which is the narrower question.',
    owns: ['what is stuck', 'what is blocked', 'who is waiting on me'],
    refuses: ['where am I needed'],
  },
  {
    key: 'how_is_the_team',
    does: 'How the team is doing, for a lead: what the board and the latest report of each check-in they run say, read to them alone',
    writes: 'nothing',
    ordered: 'Above how_am_i_doing and what_should_we_talk_about, because "how is the team doing" is about the people, not the asker.',
    owns: ['how is the team doing?', 'how is my team getting on', 'how is everyone doing'],
    refuses: ['how am I doing', 'what should we talk about'],
  },
  {
    key: 'who_has_not_checked_in',
    does: 'Who has not checked in yet, for a lead: the people, by name, on each check-in they run, counted the way the board counts',
    writes: 'nothing',
    ordered: 'Above what_is_stuck and who_is, which read "who is waiting" and "who is ..." as questions about a handoff or a person. It needs "checked in", "answered" or "started" beside "not".',
    owns: ['who has not checked in?', 'who has not checked in on Sales team, Q4?', "who hasn't answered yet", 'who still needs to check in'],
    refuses: ['who is waiting on me', 'who is Femi', 'what is stuck'],
  },
  {
    key: 'how_am_i_doing',
    does: 'The coaching step waiting for somebody, if there is one',
    writes: 'nothing',
    ordered: 'Below the suggestion lane, which offers something specific and expires.',
    owns: ['how am I doing', 'how are things going for me'],
    refuses: ['how does the freeze work', 'what should we talk about'],
  },
  {
    key: 'who_is_away',
    does: 'Who is off in a week or a day, from approved leave, as far as the reader may know: everyone for an admin, the lead\u2019s own team for a lead, your own team for a member (dates only), and only your own leave for a guest',
    writes: 'nothing',
    ordered: 'Above who_is, because "who is off next week" begins with "who is" and was answered by looking up a person called "off next week".',
    owns: ['who is off next week?', 'who is away this week', 'who is on leave tomorrow', 'is anyone off today'],
    refuses: ['who is Femi', 'who is waiting on me'],
  },
  {
    key: 'who_approves',
    does: 'Who approves your leave, your hours or your requests to spend, said in plain words from the approval rule the admin set',
    writes: 'nothing',
    ordered: 'Above who_is and how_we_work. It needs the word for approving beside a word for leave, hours or spending.',
    owns: ['who approves expenses?', 'who approves my leave', 'who signs off spending', 'who do I ask to approve my hours'],
    refuses: ['how do we handle expenses', 'who is Femi'],
  },
  {
    key: 'your_requests',
    does: 'Your own leave days left, where your own requests to take leave or to spend stand, and what is waiting for you to approve or decline',
    writes: 'nothing',
    ordered: 'Above what_next and what_should_we_talk_about, because "what is waiting for me to approve" holds words those lanes read as something else. Your own record only.',
    owns: ['how many days of leave do I have left?', 'where is my request to spend?', 'what is waiting for me to approve?', 'what is my leave balance', 'has my leave been approved'],
    refuses: ['what should I do next', 'what should we talk about', 'what is on my list'],
  },
  {
    key: 'what_is_due',
    does: 'What is due on your own commitments and to-dos, soonest first, and how many requests wait for your decision',
    writes: 'nothing',
    ordered: 'Above what_next, which names one thing; this lists what has a date.',
    owns: ['what is due?', 'what is due this week', 'what is overdue', 'what deadlines do I have'],
    refuses: ['what should I do next', 'what is on my list?'],
  },
  {
    key: 'when_is_my_next_check_in',
    does: 'When each of your check-ins opens next, or that one is waiting for you now',
    writes: 'nothing',
    ordered: 'Below the questions about what is due, above the one-next-action lane. It needs "next check-in" in the question, so it never takes a request to start one.',
    owns: ['When is my next check-in?', 'when does my next check-in open'],
    refuses: ['start my check-in', 'what is due?'],
  },
  {
    key: 'what_my_check_in_is_for',
    does: 'What each check-in you are in is for, and who reads its report',
    writes: 'nothing',
    ordered: 'Beside the lane above, for the same reason: it needs the check-in named in the question.',
    owns: ['What is my check-in for, and who reads it?', 'who reads my report'],
    refuses: ['what did we agree', 'start my check-in'],
  },
  {
    key: 'company_priorities',
    does: 'What the company is working on right now, from the Company page, as you may read it',
    writes: 'nothing',
    ordered: 'Beside the lanes above. It needs the company or the word priorities, so a question about your own objectives stays with its lane.',
    owns: ["What are the company's priorities right now?", 'what are our priorities'],
    refuses: ['what am I on', 'set a target for Q4'],
  },
  {
    key: 'is_the_strategy_moving',
    does: 'Whether the strategy is moving, from what the Company page says to you',
    writes: 'nothing',
    ordered: 'Beside the lanes above. It needs the word strategy beside moving, working or on track.',
    owns: ['Is the strategy moving?', 'is our strategy working'],
    refuses: ['what are our priorities', 'how am I doing'],
  },
  {
    key: 'what_next',
    does: 'The one thing to do next, from your own commitments, to-dos and what is waiting on you, and why it is first',
    writes: 'nothing',
    ordered:
      'Above where_am_i_needed. "What should I do this week" is where to spend attention across people; this is one next action, and needs the word next, now or first.',
    owns: ['what should I do next?', 'what do I do next', 'what is next for me'],
    refuses: ['what should I do this week', 'what is on my list?', 'what am I on'],
  },
  {
    key: 'what_did_they_say',
    does: 'What a named colleague said, only as much of it as you may already read, and which check-in it is from',
    writes: 'nothing',
    ordered:
      'Above what_did_i_say, which owns the first person. The name cannot be I, we, the or any other pronoun, so "what did we agree" stays with what_came_of_it.',
    owns: ['what did Femi say last week?', 'what has Femi said', 'what did Femi Adeyemi tell me yesterday'],
    refuses: ['what did I say about pricing', 'what did we agree', 'what did the last check-in say'],
  },
  {
    key: 'what_did_i_say',
    does: 'Something this person said before, in their own words',
    writes: 'nothing',
    ordered: 'Narrow, and about their own record only.',
    owns: ['what did I say about pricing'],
    refuses: ['what did we agree'],
  },
  {
    key: 'how_we_work',
    does: 'What the organisation has written down - its decisions, its process, how a thing works',
    writes: 'nothing',
    ordered:
      'Last of the answering lanes, because it is the broadest. It owns "how does the X work", which is a question about a thing rather than about doing something - and deliberately not a bare "how", which would take "how am I doing".',
    owns: ['how do we handle expenses', 'how does the freeze work', 'how do the phases work'],
    refuses: ['how am I doing', 'what am I on'],
  },
  {
    key: 'context_line',
    does:
      'Type one line straight onto a check-in\'s context - a strategy note, a way of working, a '
      + 'decision, something unsettled - with no conversation needed, for the lead who runs it or an '
      + 'admin covering for them. The same door as the Context and resources page\'s own "type it in" '
      + 'box.',
    writes: 'after you confirm it',
    ordered:
      'Above add_context and anchored on the whole message, so a kind word used in passing elsewhere '
      + 'never lands here by accident - the lead has to open with the kind and a colon. See decision '
      + '50, item 17.',
    owns: ['decision: we will drop the pilot', 'strategy: focus on the Lagos market', 'unsettled: who owns marketing'],
    refuses: ['add this as context', 'what is missing from this check-in'],
  },
  {
    key: 'lead_note',
    does:
      'A note only the lead sees, about the whole check-in or about one named person, never shared '
      + 'or shown to that person.',
    writes: 'after you confirm it',
    ordered:
      'Above add_context, on the word "private" or "privately" - a bare "note:" is ambiguous with a '
      + 'shared context note and is left unplaced rather than guessed onto either. See decision 50, item 9.',
    owns: ['private note: Dayo keeps missing the Friday call', 'note privately that the budget is not settled'],
    refuses: ['add this as context', 'context note: we will focus on retention'],
  },
  {
    key: 'questions_for_people',
    does:
      'The lead\'s exact questions waiting to be asked of somebody, and confirming or leaving one out, '
      + 'word for word, before it ever reaches that person\'s check-in.',
    writes: 'after you confirm it',
    ordered:
      'Above add_context, narrow on the phrase "questions for people" or a name after confirm/decline. '
      + 'See the lead\'s exact question rule and decision 50, item 8.',
    owns: ['questions for people', 'confirm the question for Ben', 'leave out the question for Ben'],
    refuses: ['add this as context', 'what did I commit to'],
  },
  {
    key: 'add_context',
    does:
      'Add or change a check-in\'s setup - how long it runs, how often people check in, what doing '
      + 'well looks like, its documents and targets - for the lead who runs it, or an admin covering '
      + 'for them. The same setup conversation as before, reached from here.',
    writes: 'after you confirm it',
    ordered:
      'Above how_we_work only, so a real handbook question never lands here first. Below everything '
      + 'more specific: "context" and "what is missing" are narrow words nothing else here owns.',
    owns: ['add this as context', 'the context for the Q4 check-in', 'what is missing from this check-in'],
    refuses: ['set an objective for the quarter', 'what are my objectives', 'how does the freeze work'],
  },
  {
    key: 'what_you_can_see',
    does: 'What this assistant is connected to and what it can answer from',
    writes: 'nothing',
    ordered: 'Its own shape, so order does not matter to it.',
    owns: ['what can you see', 'what data do you have'],
    refuses: ['what am I on'],
  },
];

export const CAPABILITY_BY_KEY = new Map(WHAT_THE_ASSISTANT_CAN_DO.map((c) => [c.key, c]));

/** Everything that writes, so the confirmation rule can be asserted in one place. */
export const THE_ONES_THAT_WRITE = WHAT_THE_ASSISTANT_CAN_DO.filter((c) => c.writes !== 'nothing');
