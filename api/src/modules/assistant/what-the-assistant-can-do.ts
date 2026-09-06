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
    key: 'add_a_document',
    does: 'Put a document into a check-in, and say who it is for',
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
      'First. "Email me what I am on" reads to the objectives lane as a question about their work, and answering it in the box answers half of what was asked.',
    owns: ['email me that', 'can you send me this', 'send it to me'],
    refuses: ['what am I on', 'what did I commit to'],
  },
  {
    key: 'start_a_check_in',
    does: 'Start a check-in that is waiting, or open a new one and invite the people in it',
    writes: 'after you confirm it',
    ordered:
      'Before the objective lane. "Set up a check-in about our objectives" is a request to start a session and reads to that lane as a request to write an objective. Starting one that exists and opening one that does not are the SAME capability on purpose — nobody should have to know which they want, and a second lane claiming these words would be another collision.',
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
      'Above what_is_stuck and how_am_i_doing: those suggestions are addressed to this person by name and they expire, so they are the better answer where both would fit.',
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
      'Below the specific ones, and above nothing in particular — it is the broad "is anybody blocked on me" question.',
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
    key: 'how_am_i_doing',
    does: 'The coaching step waiting for somebody, if there is one',
    writes: 'nothing',
    ordered: 'Below the suggestion lane, which offers something specific and expires.',
    owns: ['how am I doing', 'how are things going for me'],
    refuses: ['how does the freeze work', 'what should we talk about'],
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
    does: 'What the organisation has written down — its decisions, its process, how a thing works',
    writes: 'nothing',
    ordered:
      'Last of the answering lanes, because it is the broadest. It owns "how does the X work", which is a question about a thing rather than about doing something — and deliberately not a bare "how", which would take "how am I doing".',
    owns: ['how do we handle expenses', 'how does the freeze work', 'how do the phases work'],
    refuses: ['how am I doing', 'what am I on'],
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
