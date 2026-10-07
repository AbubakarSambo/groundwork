/**
 * THE ROUTER IS RULES. THE MODEL COMPOSES LANGUAGE AND NEVER DRIVES A WRITE.
 *
 * Intent is decided here, in code that can be read and tested without a model call, and the lane it
 * picks is what decides whether anything happens. A model that could choose the lane could be
 * talked into choosing one - and every piece of text reaching it arrives from a customer's own
 * systems, which is exactly the carrier an injection needs.
 *
 * WHAT THIS IS NOT: an attempt at understanding. It is a small set of confident matches and an
 * honest default. The default is the important half.
 */
import { quotedThenEnding } from './a-quote-takes-no-second-mark';
import { parseAskAPerson } from './a-line-or-a-note-typed-in-chat';
import { SET_UP_A_SUITE_PATTERNS } from './a-suite-set-up-by-talking';
import { WHAT_YOU_CAN_HELP_WITH_PATTERNS } from './what-you-can-ask-here';
import { WHAT_IS_DUE_PATTERNS, WHO_APPROVES_PATTERNS, WHO_IS_AWAY_PATTERNS, YOUR_REQUESTS_PATTERNS } from './your-own-requests-asked-about';

/** A sentence that asks one named person something. Shares its reading with the lane that acts on it. */
const ASKS_A_PERSON = { exec: (m: string): RegExpExecArray | null => (parseAskAPerson(m) ? (['ask'] as unknown as RegExpExecArray) : null) } as unknown as RegExp;

export type Lane =
  | 'what_you_can_see'
  | 'what_am_i_on'
  | 'who_is'
  | 'what_did_i_commit_to'
  | 'how_we_work'
  | 'what_did_i_say'
  | 'what_did_they_say'
  | 'what_next'
  | 'how_am_i_doing'
  /** A lead asking how their team is doing: the board and the latest report of the check-ins they run, read to them alone. */
  | 'how_is_the_team'
  /** A lead asking who has not checked in yet, on a check-in they run: the people, by name (B-134). */
  | 'who_has_not_checked_in'
  | 'where_am_i_needed'
  | 'what_is_stuck'
  | 'where_am_i_up_to'
  | 'what_should_we_talk_about'
  | 'what_came_of_it'
  | 'set_an_objective'
  | 'start_a_check_in'
  | 'send_me_that'
  | 'add_a_document'
  | 'add_a_to_do'
  | 'my_to_dos'
  | 'tick_off_a_to_do'
  | 'move_a_deadline'
  | 'add_a_commitment'
  | 'think_it_through'
  | 'add_context'
  | 'context_line'
  | 'lead_note'
  | 'questions_for_people'
  /** Time off said in chat: said back, and sent through the leave suite on a yes (week 20). */
  | 'ask_for_leave'
  /** Hours said in chat, for billing only: said back, and sent to the approver on a yes (week 21). */
  | 'log_hours'
  /** A request to spend said in chat, checked against the budget and the rule, sent on a yes (week 22). */
  | 'ask_to_spend'
  /** An approver deciding a leave, hours or spending request by saying so: said back, and decided on a yes (decision 82, item 1). */
  | 'decide_a_request'
  /** An admin setting a suite up by describing it (decision 85): asked only what is missing, said back, written on a yes. */
  | 'set_up_a_suite'
  /** Your own leave days left, where your own requests stand, and what waits for you to approve (read, never written). */
  | 'your_requests'
  /** Who approves your leave, your hours or your spending, in plain words. */
  | 'who_approves'
  /** What is due on your commitments and to-dos. */
  | 'what_is_due'
  /** Who is off, from approved leave, as far as this reader may know. */
  | 'who_is_away'
  /** "What can you help me with?": what this reader can do here, from what the router offers them. */
  | 'what_can_you_do'
  /** "When is my next check-in?": when each check-in of yours opens, read from your own. */
  | 'when_is_my_next_check_in'
  /** "What is my check-in for, and who reads it?": what each of your running check-ins is for, and who reads its report. */
  | 'what_my_check_in_is_for'
  /** "What are the company's priorities right now?": the Company page's priorities, as you may read them. */
  | 'company_priorities'
  /** "Is the strategy moving?": how the priorities are moving, as the Company page says it to you. */
  | 'is_the_strategy_moving'
  | 'unplaced';

export interface Routed {
  lane: Lane;
  /**
   * What the question is ABOUT, with the question words removed.
   *
   * For `who_is` it is the name. For `how_we_work` it is the topic, and there it is not a
   * convenience: retrieval scores a phrase against a card, and "how do I swap" carries no meaning
   * while dragging the score down. Searching the whole sentence failed to match "swap oncall" to a
   * card titled "The on-call rota" - found by asking it.
   */
  subject?: string;
}

const rule = (lane: Lane, patterns: RegExp[]) => ({ lane, patterns });

/**
 * Ordered, and the order is a decision. "What can you see about Naomi" is a question about Naomi,
 * not about the connection - so the more specific lane is matched first, and a rule that would
 * swallow it sits below.
 */
const RULES = [
  /* Whole-message only, and first, so "help" is never read as a handbook question. */
  rule('what_can_you_do', WHAT_YOU_CAN_HELP_WITH_PATTERNS),
  /*
   * DECISION 85: AN ADMIN SETS A SUITE UP BY SAYING SO ("Set up our employee leave process"). First,
   * because it is narrow (a word for setting up, then only the suite's name and words like "process"
   * or "rules" to the end) and because "leave", "hours" and "spending" would otherwise read as a
   * request for time off, hours or money. A check-in, a session, an objective or a target is never
   * this (a-suite-set-up-by-talking.ts).
   */
  rule('set_up_a_suite', SET_UP_A_SUITE_PATTERNS),
  /*
   * TO-DOS, FIRST, AND ON THE WORD "TO-DO" OR A SHAPE THAT IS ONLY A NOTE TO SELF.
   *
   * "Add the rota to my to-do list" names a list; "add the rota" alone does not, and goes to the
   * document lane below when it names a file. Ticking off sits above adding because "done: send the
   * rota" contains the same words as the to-do it closes.
   */
  rule('tick_off_a_to_do', [
    /\b(?:tick|cross|strike)\s+(?:off\s+)?(.{3,120}?)(?:\s+off)?\s*$/i,
    /^(?:done|finished|did)[:,]\s+(.{3,120})$/i,
    /\bmark\s+(.{3,120}?)\s+(?:as\s+)?done\s*$/i,
  ]),
  /*
   * WEEK 18: CHANGING A COMMITMENT BY TALKING. Above adding a to-do, because "push the rota back to
   * Friday" names a change to something that already has a day, and nothing here is written until
   * it has been said back and answered yes.
   */
  rule('move_a_deadline', [
    /^\s*(?:please\s+)?(?:can\s+you\s+)?(?:move|push|postpone|reschedule|delay)\s+(?:the\s+(?:deadline|due\s+date|date)\s+(?:on|for|of)\s+)?(.{3,160}?)\s+(?:back\s+)?(?:to|until|till|out\s+to)\s+.{2,60}$/i,
    /^\s*(?:please\s+)?(?:can\s+you\s+)?change\s+the\s+(?:deadline|due\s+date|date)\s+(?:on|for|of)\s+(.{3,160}?)\s+(?:to|until|till)\s+.{2,60}$/i,
  ]),
  rule('add_a_commitment', [
    /\b(?:add|record|log|write\s+down)\s+(?:a\s+)?commitment[:,]?\s+(.{3,160})$/i,
    /\bcommit\s+me\s+to\s+(.{3,160})$/i,
  ]),
  /*
   * WEEK 19: THINKING SOMETHING THROUGH. Below the three lanes that change something and above
   * everything else, because "help me think through the Q4 target" holds the word target, which the
   * objective lane would otherwise take and open a draft for. Narrow: it needs "think ... through",
   * "my options", or "brainstorm". It writes nothing.
   */
  rule('think_it_through', [
    /\b(?:help\s+(?:me|us)\s+)?think\s+(?:(?:it|this|that)\s+)?(?:through|over)\b\s*(.*)$/i,
    /\bwhat\s+(?:are|were)\s+(?:my|our|the)\s+options\b\s*(?:for|on|with|about)?\s*(.*)$/i,
    /\b(?:lay|set)\s+out\s+(?:my|our|the)\s+options\b\s*(?:for|on|with|about)?\s*(.*)$/i,
    /\bweigh\s+(?:up\s+)?(?:my|our|the)\s+options\b\s*(?:for|on|with|about)?\s*(.*)$/i,
    /\bbrainstorm\b\s*(.*)$/i,
  ]),
  rule('add_a_to_do', [
    /* A deadline may trail the list: "add the rota to my to-do list by Friday". The lane reads the whole message for when. */
    /\b(?:add|put)\s+(.{3,160}?)\s+(?:to|on|onto)\s+(?:my\s+)?(?:to[- ]?dos?|to[- ]?do\s+list|list)\b(?:\s+(?:by|on|before|this|next|for|end\s+of)\b.{0,60})?\s*$/i,
    /^\s*to[- ]?do:\s*(.{3,160})$/i,
    /\bremind\s+me\s+to\s+(.{3,160})$/i,
    /\bnote\s+to\s+self:?\s*(.{3,160})$/i,
  ]),
  rule('my_to_dos', [
    /\bwhat(?:'s| is)\s+on\s+my\s+(?:list|to[- ]?dos?)\b/i,
    /\b(?:my|the)\s+to[- ]?dos?(?:\s+list)?\s*\??$/i,
    /\bwhat\s+do\s+i\s+(?:have|need|still\s+have)\s+to\s+do\b/i,
    /\bshow\s+(?:me\s+)?my\s+(?:list|to[- ]?dos?)\b/i,
  ]),
  rule('add_a_document', [
    /*
     * ABOVE `send_me_that`, because "send me the handbook" and "add the handbook" are opposite
     * directions and the send lane owns the word "send". Narrow: it wants a word that names a FILE
     * or an act of adding one, not any mention of a document.
     */
    /*
     * "notes" (plural) still reads as a document, e.g. "share the meeting notes" - but singular
     * "note" does not, so it is free for the lead_note/context_line lanes' own "share the note ..."
     * (decision 50, piece 3, item 2), which would otherwise never be reached from here.
     */
    /\b(?:upload|attach|add|put\s+in|share)\s+(?:a|an|our|my|the|this)?\s*(?:file|document|doc|pdf|deck|handbook|policy|contract|notes)\b/i,
    /\bhere\s+is\s+(?:a|an|our|my|the)\s+(?:file|document|doc|pdf|handbook|policy|contract)\b/i,
    /\bi\s+(?:have|want\s+to\s+(?:add|upload|attach))\s+(?:a|an|our|my|the)\s+(?:file|document|doc|pdf)\b/i,
    /*
     * A PASTED LINK IS SOMEBODY PUTTING A DOCUMENT IN.
     *
     * Almost nothing a company works from lives in here, so the commonest way to
     * put a document on a check-in is to paste where it already lives. Without
     * this, a pasted Drive link fell to `unplaced` — the assistant answered "I
     * cannot answer that one yet" to the most ordinary thing anybody does with a
     * document.
     *
     * Narrow on purpose: only an http(s) address, which is the one shape that is
     * unambiguously somebody handing over a thing rather than asking about one.
     */
    /https?:\/\/\S+/i,
  ]),

  rule('send_me_that', [
    /*
     * FIRST, AND ONLY ON SHAPES THAT NAME SENDING.
     *
     * First because "email me what I am on" reads to `what_am_i_on` as a question about their work,
     * and answering it in the box is answering half of what was asked. Narrow because the cost of
     * being wrong is a confirmation somebody did not want, which is small, in exchange for never
     * missing the request, which is the point.
     */
    /\b(?:email|send|mail)\s+(?:that|this|it|me)\b/i,
    /\b(?:can|could)\s+you\s+(?:email|send|mail)\b/i,
    /\bin\s+my\s+inbox\b/i,
  ]),

  rule('start_a_check_in', [
    /*
     * ABOVE `set_an_objective`, because "set up a check-in about our objectives" is a request to
     * start a session and reads to that lane as a request to write an objective. The more specific
     * thing somebody named is the thing they asked for.
     *
     * Narrow, like the objective lane and for the same reason: it starts something. It owns the
     * shapes that name a CHECK-IN or a session, and nothing that merely mentions one.
     */
    /*
     * ASKING FOR IT IS NOT ASKING ABOUT IT, and one word separates them. "How do I run a check-in"
     * is a question about how this product works and belongs to `how_we_work`; this lane would have
     * taken it and started one instead. Caught by the guard that pins those two next to each other,
     * which is what that guard is for.
     */
    /^(?!.*\bhow\s+(?:do|does|did|to|can|should)\b).*\b(?:start|begin|open|set\s+up|kick\s+off|run)\s+(?:my|our|the|a|this)?\s*(?:check[\s-]?in|session|ground|round)\b/i,
    /^(?!.*\bhow\s+(?:do|does|did|to|can|should)\b).*\b(?:check[\s-]?in|session)\s+(?:set\s+up\s+)?for\s+me\b/i,
    /\bready\s+to\s+(?:start|begin)\s+(?:my|our|the)?\s*check[\s-]?in\b/i,
    /\bcan\s+i\s+(?:start|do|take)\s+(?:my|our|the)?\s*check[\s-]?in\b/i,
  ]),

  rule('set_an_objective', [
    /*
     * FIRST, AND NARROW.
     *
     * First because it is the only lane that starts a piece of work rather than
     * answering a question about one, and "I want to set an objective for the
     * quarter" reads to three lanes below as a question about the quarter. The
     * person is not asking what exists; they are asking to make something.
     *
     * Narrow because the cost of a false positive is high: it opens a draft and
     * starts asking questions, which is intrusive in a way that a wrong answer
     * is not. It owns the shapes that explicitly ask to SET one, and nothing
     * that merely mentions objectives.
     */
    /\b(?:set|write|create|start|draft|agree)\s+(?:up\s+)?(?:an?|our|my|the|some)?\s*(?:new\s+)?(?:objectives?|okrs?|goals?|targets?)\b/i,
    /\bhelp\s+(?:me|us)\s+(?:to\s+)?(?:set|write|agree|work\s+out)\b.*\b(?:objectives?|okrs?|goals?|targets?)\b/i,
    /\b(?:objective|okr|goal)\s+setting\b/i,
  ]),
  /*
   * YOUR OWN LEAVE AND REQUESTS, WHO APPROVES, WHAT IS DUE, AND WHO IS OFF. Questions only; nothing is
   * written. Above `what_next`, `what_should_we_talk_about` and `who_is`, because "what is waiting for me
   * to approve" and "who is off next week" hold words those lanes read as something else (the second was
   * answered by looking up a person called "off next week"). See your-own-requests-asked-about.ts.
   */
  rule('who_is_away', WHO_IS_AWAY_PATTERNS),
  rule('who_approves', WHO_APPROVES_PATTERNS),
  rule('your_requests', YOUR_REQUESTS_PATTERNS),
  rule('what_is_due', WHAT_IS_DUE_PATTERNS),
  /*
   * THE QUESTIONS ASK SUGGESTS (requests 179 and 180). Four of its own starters had no lane and were answered with a shrug. Each is narrow:
   * it needs the check-in, the company or the strategy named beside the question.
   */
  rule('when_is_my_next_check_in', [
    /\bwhen\s+(?:is|does|will)\s+my\s+next\s+check-?in\b/i,
    /\bwhen\s+(?:do|can|will)\s+i\s+(?:next\s+)?(?:have\s+to\s+)?check[\s-]?in\b/i,
  ]),
  rule('what_my_check_in_is_for', [
    /\bwhat\s+(?:is|are)\s+(?:my|this|the)\s+check-?ins?\s+for\b/i,
    /\bwho\s+(?:reads|sees|gets)\s+(?:my|this|the)\s+(?:check-?in|report)\b/i,
  ]),
  rule('company_priorities', [
    /\b(?:company|organisation|organization)(?:'s|s')?\s+(?:top\s+)?priorities\b/i,
    /\bwhat\s+(?:are|is)\s+(?:the\s+|our\s+)?(?:top\s+)?priorit(?:y|ies)\b/i,
  ]),
  rule('is_the_strategy_moving', [
    /\bis\s+(?:the|our)\s+strategy\s+(?:moving|working|on\s+track|going\s+anywhere)\b/i,
    /\bhow\s+is\s+(?:the|our)\s+strategy\s+(?:doing|going|moving)\b/i,
  ]),
  rule('what_next', [
    /*
     * "WHAT SHOULD I DO NEXT" (week 17): one thing, from the reader's own commitments, to-dos and
     * what is waiting on them. Above `where_am_i_needed`, whose "what should I do this week" is a
     * question about where to spend attention across people; this one is a single next action.
     * Narrow: it needs the word next, now or first beside "what should I do".
     */
    /\bwhat\s+(?:should|shall|do|can)\s+i\s+do\s+(?:next|now|first)\b/i,
    /\bwhat(?:'s| is)\s+next\s+for\s+me\b/i,
    /\bwhat(?:'s| is)\s+my\s+next\s+(?:step|move|thing)\b/i,
    /^\s*what\s+next\s*\??\s*$/i,
  ]),
  rule('where_am_i_up_to', [
    /*
     * Above the handoff and coaching lanes. "What am I meant to be doing" from somebody in their
     * first fortnight is a question about their onboarding, not about a stuck handoff or a coaching
     * step - and answering it with either would be answering a question they did not ask at the
     * moment they are least able to tell.
     */
    /\bwhat(?:'?s| is| are)?\s+(?:still\s+)?(?:left|outstanding)\b/i,
    /\bam\s+i\s+(?:set\s+up|onboarded|done\s+setting\s+up)\b/i,
    /\bwhere\s+am\s+i\s+up\s+to\b/i,
    /\bmy\s+onboarding\b/i,
    /\bwhat\s+is\s+my\s+role\b/i,
  ]),
  rule('what_came_of_it', [
    /*
     * ABOVE `what_did_i_commit_to`, and the distinction it turns on is "we" against "I". That lane
     * owns "what did I agree to" - a question about this person's own commitments - and this one
     * owns "what did we agree", which is a question about what a check-in produced. The two read
     * almost identically and mean different things, so the narrower pronoun wins and both patterns
     * are pinned in tests next to each other.
     */
    /\bwhat\s+came\s+(?:out\s+)?of\s+(?:the|our|that|my|it)\b/i,
    /\bwhat\s+did\s+we\s+(?:agree|decide|conclude|settle)\b/i,
    /\bwhat\s+(?:happened|came\s+out)\s+(?:in|of|from)\s+(?:the\s+|our\s+)?last\b/i,
    /\bour\s+last\s+check-?in\b/i,
    /\bwhat\s+did\s+(?:the\s+)?last\s+(?:check-?in|round|report)\b/i,
    /\bwhat\s+(?:has|have)\s+(?:we|the\s+team)\s+(?:agreed|decided)\b/i,
  ]),
  rule('how_is_the_team', [
    /*
     * "HOW IS THE TEAM DOING" (4 October 2026, the user journeys). A lead who asked it was given the fallback with
     * options. The words are narrow on purpose: the team, my team, everyone or the quarter, with "how" in front, so
     * "how am I doing" stays with the coaching lane. Above `what_should_we_talk_about`, whose "how am I doing" is the
     * first person.
     */
    /\bhow(?:'s|\s+is|\s+are)\s+(?:the|my|our)\s+(?:([\w'-]+(?:\s+[\w'-]+)?)\s+)?team(?:\s+(?:doing|going|getting\s+on|looking))?\b/i,
    /\bhow(?:'s|\s+is|\s+are)\s+(?:everyone|everybody)\s+(?:doing|going|getting\s+on)\b/i,
    /\bhow\s+are\s+(?:the\s+|my\s+|our\s+)?people\s+(?:doing|going)\b/i,
    /\bwhere\s+(?:are|do)\s+we\s+(?:stand\s+)?on\s+the\s+quarter\b/i,
  ]),
  rule('what_should_we_talk_about', [
    /*
     * ABOVE `what_is_stuck` AND `how_am_i_doing`, and the reason is the overlap rather than the
     * wording. "What should I be doing about my team" reads to the coaching lane as a request for a
     * step and to this one as a request for the pending suggestions, and the suggestions are the
     * better answer: they are addressed to this person by name, they expire, and the coaching step
     * will still be there tomorrow.
     *
     * Narrow on purpose. It owns the shapes that ask what is waiting to be decided, and nothing
     * that merely mentions a conversation - "how do I run a check-in" is a handbook question.
     */
    /\bwhat\s+(?:should|do)\s+(?:we|i)\s+(?:talk|speak)\s+about\b/i,
    /\b(?:any|my|what)\s+suggestions?\b/i,
    /\bwhat\s+(?:conversations?|check-?ins?)\s+(?:should|do)\s+i\b/i,
    /\bwhat\s+(?:is|are)\s+(?:waiting|pending)\s+(?:for|on)\s+(?:my\s+)?(?:decision|answer|me\s+to\s+decide)\b/i,
    /\bwhat\s+(?:do\s+)?you\s+(?:suggest|recommend)\b/i,
    /\bwhat\s+needs\s+(?:my\s+)?deciding\b/i,
  ]),
  rule('where_am_i_needed', [
    /*
     * ABOVE `how_am_i_doing`, WHICH IS THE ONE IT ACTUALLY COLLIDES WITH.
     *
     * I first wrote that the collision was with `what_is_stuck` - both being about handoffs - and
     * driving the assembled router said otherwise: with this lane removed, five of its six phrasings
     * fall through unplaced and only "what should I focus on this week" is claimed by anything, by
     * `how_am_i_doing`. Which makes sense read aloud. It is the same words as somebody asking after
     * their own standing, and the two want opposite answers: one is a person's own record, the other
     * is four lists of other people. So the order between THOSE two is what matters, and the note
     * saying otherwise would have sent the next person to defend the wrong boundary.
     *
     * Narrow on purpose: it owns the shapes that ask where the ASKER should spend their attention,
     * and nothing that merely asks about somebody's state.
     */
    /\bwhere\s+(?:am\s+i|should\s+i\s+be)\s+needed\b/i,
    /\bwho\s+needs\s+(?:me|my\s+(?:help|attention|time))\b/i,
    /\bwhat\s+(?:should|do)\s+i\s+(?:focus\s+on|do)\s+this\s+week\b/i,
    /\bwhere\s+(?:do\s+i|should\s+i)\s+(?:start|spend\s+my\s+time)\b/i,
    /\bmy\s+week\b/i,
  ]),
  rule('who_has_not_checked_in', [
    /*
     * "WHO HAS NOT CHECKED IN" (B-134). Above `what_is_stuck` and `who_is`, which read "who is waiting" and "who is ..." as other questions. The
     * check-in is named after "on", "in" or "for", and group one carries it. It needs "checked in", "answered" or "started" beside "not", so a
     * question about a handoff or a person stays with its lane.
     */
    /\bwho\s+(?:has|have)(?:\s+not|n'?t)\s+(?:yet\s+)?(?:checked[\s-]*in|answered|replied|responded|started)(?:\s+yet)?(?:\s+(?:on|in|for|to)\s+(.+?))?\s*[?.!]*\s*$/i,
    /\bwho\s+(?:is|are)\s+(?:yet\s+|still\s+)?(?:to|waiting\s+to|due\s+to)\s+check[\s-]*in(?:\s+(?:on|in|for)\s+(.+?))?\s*[?.!]*\s*$/i,
    /\bwho\s+(?:still\s+)?needs\s+to\s+check[\s-]*in(?:\s+(?:on|in|for)\s+(.+?))?\s*[?.!]*\s*$/i,
  ]),
  rule('what_is_stuck', [
    /*
     * ABOVE BOTH `who_is` AND THE COACHING LANE, and driving it is how that was found. "Who is
     * waiting on me" begins with "who is", so the directory lane matched it first and answered a
     * question about a handoff by looking somebody up. Unit tests did not catch it because each
     * lane's own patterns were right - only the order between them was wrong, which is a thing
     * only the assembled router can be asked about.
     *
     * It also sits above coaching, because "I'm stuck" and "what am I waiting on" want different
     * answers - the first a step, the second a name and a number of days.
     */
    /\bwhat\s+(?:am\s+i|are\s+we)\s+waiting\s+on\b/i,
    /\bwho\s+is\s+waiting\s+on\s+me\b/i,
    /\bwhat'?s?\s+(?:blocked|stuck|held\s+up)\b/i,
    /\bwhat\s+is\s+(?:blocked|stuck)\b/i,
    /* "Who is blocked right now?" is about handoffs, not a person called "blocked right now" (B-135). */
    /\bwho(?:'s|\s+is|\s+are)\s+(?:blocked|stuck|held\s+up|waiting)\b/i,
  ]),
  rule('who_is', [
    /\bwho(?:'s| is)\s+(.+?)\s*\??$/i,
    /\bwho\s+does\s+(.+?)\s+report\s+to\s*\??$/i,
    /\bwho\s+reports\s+to\s+(.+?)\s*\??$/i,
  ]),
  /*
   * LAST OF THE MATCHERS, ON PURPOSE. "How do we..." is the broadest shape here and would otherwise
   * swallow questions the specific lanes own. Its own rules stay narrow for the same reason.
   */
  rule('how_am_i_doing', [
    /* "How are things going for me" went nowhere. Found by declaring what this
       capability owns and running it through the router — which is the registry
       doing the one job it exists for. */
    /\bhow\s+(?:are\s+)?things\s+going\s+for\s+me\b/i,
    /*
     * Above the recall lane, because "how am I doing" is not a question about what they said. Both
     * shapes go here - the flat question and the stuck one - since the coach's answer to either is
     * the same single step.
     */
    /\bhow\s+am\s+i\s+doing\b/i,
    /\bi'?m\s+stuck\b/i,
    /\bhow\s+do\s+i\s+get\s+better\b/i,
    /\bwhat\s+should\s+i\s+(?:work on|focus on)\b/i,
  ]),
  rule('what_did_they_say', [
    /*
     * WHAT SOMEBODY ELSE SAID (week 17). Above `what_did_i_say`, which owns the first person; the
     * name is refused the pronouns so "what did I say" and "what did we agree" never land here. The
     * name is one or two words. It is answered only from what the asker may already read.
     */
    /\bwhat\s+(?:did|has|have|does)\s+(?!(?:i|we|you|they|he|she|it|the|our|my|everyone|everybody|anyone|anybody|people|someone|somebody)\b)([A-Za-z][\w'’-]*(?:\s+[A-Za-z][\w'’-]*)?)\s+(?:say|said|tell|told|mention(?:ed)?|write|wrote|report(?:ed)?)\b/i,
  ]),
  rule('what_did_i_say', [
    /*
     * Above the commitment lane, because "what did I say about the vendor" is a question about the
     * conversation and "what did I say I would do" is a question about commitments - and the second
     * rule would take both if it went first.
     */
    /\bwhat\s+did\s+i\s+say\s+about\s+(.+)/i,
    /\bdid\s+i\s+(?:mention|tell you about|say anything about)\s+(.+)/i,
    /\bhave\s+we\s+(?:talked|spoken)\s+about\s+(.+)/i,
    /\bremind\s+me\s+(?:what|about)\s+(.+)/i,
  ]),
  rule('what_did_i_commit_to', [
    /* Ordered above `what_am_i_on` because "what did I commit to" contains "what did I" and the
       objectives rule would otherwise take it. */
    /\bwhat\s+did\s+i\s+(?:commit|say|promise)\b/i,
    /\bmy\s+commitments?\b/i,
    /\bwhat\s+have\s+i\s+committed\b/i,
    /\bwhat\s+did\s+i\s+agree\s+to\b/i,
  ]),
  rule('what_am_i_on', [
    /\bwhat\s+am\s+i\s+(?:on|working on|assigned)\b/i,
    /\bwhat(?:'s| is)\s+(?:on\s+)?my\s+(?:plate|work|objectives?)\b/i,
    /\bmy\s+objectives?\b/i,
    /\bwhat\s+do\s+i\s+owe\b/i,
  ]),
  rule('what_you_can_see', [
    /* Same finding, same run: somebody asking what it is connected to says "what
       data do you have" as readily as "what can you see". */
    /\bwhat\s+(?:data|information|records)\s+(?:do\s+you\s+)?(?:have|hold|see)\b/i,
    /\bwhat\s+(?:can\s+you|do\s+you)\s+see\b/i,
    /* The label of the option the shrug itself offers: choosing it must not bring the same shrug back (request 179). */
    /\btell\s+me\s+what\s+you\s+can\s+see\b/i,
    /\bwhat(?:'s| is)\s+connected\b/i,
    /\bhow\s+current\b/i,
    /\bwhat\s+would\s+you\s+connect\b/i,
  ]),
  rule('context_line', [
    /*
     * TYPING A LINE DIRECTLY, WITH NO CHAT (decision 50, item 17). Anchored on the WHOLE message so
     * "strategy" or "decision" said in passing, anywhere else, never lands here by accident - the
     * lead has to name the kind and put the line straight after it, the same shape the Context and
     * resources page's own "type it in" box already asks for.
     */
    /^\s*strategy\s*[:\-]\s*.{2,400}$/i,
    /^\s*way\s+of\s+working\s*[:\-]\s*.{2,400}$/i,
    /^\s*decision\s*[:\-]\s*.{2,400}$/i,
    /^\s*unsettled\s*[:\-]\s*.{2,400}$/i,
    /^\s*context\s+note\s*[:\-]\s*.{2,400}$/i,
    /*
     * CHANGING A LINE ALREADY ON THE RECORD (decision 50, piece 3, item 2: `changeContextLine`).
     * "the line" keeps this apart from changing an objective, a commitment or a to-do, each of which
     * has its own lane and its own words for the same action.
     */
    /\b(?:reword|change)\s+the\s+line\b/i,
    /\bshare\s+the\s+line\b/i,
    /* Both word orders: "make the line private" and "make the line 'X' private". */
    /\bmake\s+the\s+line\b[\s\S]*\bprivate\b/i,
    /\bretire\s+the\s+line\b/i,
  ]),
  rule('lead_note', [
    /*
     * A NOTE ONLY THE LEAD SEES (decision 50, item 9). Narrow, on the word "private" or "privately" -
     * an ordinary "note:" alone is ambiguous with a shared context note (above) and is left unplaced
     * rather than guessed onto either.
     */
    /\b(?:private|personal)\s+note\b/i,
    /\bnote\s+(?:privately|only\s+for\s+me|just\s+for\s+me)\b/i,
    /*
     * SHARING A PRIVATE NOTE WITH EVERYBODY (decision 50, piece 3, item 2: `shareLeadContext`).
     */
    /\bshare\s+(?:the|my|this)\s+note\b/i,
  ]),
  rule('questions_for_people', [
    /*
     * THE LEAD'S EXACT QUESTIONS FOR PEOPLE (decision 34; decision 50 item 8). Lists what is waiting,
     * and a name after "confirm"/"decline"/"leave out" acts on one of them - never a bare yes or no
     * without saying which, since more than one could be waiting at once.
     */
    /\bquestions?\s+for\s+(?:people|someone|somebody|him|her|them)\b/i,
    /\b(?:confirm|decline|leave\s+out)\s+(?:the\s+)?question\s+for\s+.+/i,
    /*
     * CONFIRMING WITH THE LEAD'S OWN CHANGED WORDING (decision 34; decision 50, piece 3, item 3).
     * "ask Ben 'how are the Lagos numbers looking?' instead" - a name, then the lead's own sentence in
     * quotes, replacing whatever question was waiting for that person.
     */
    /\bask\s+\S.*["'“].+["'”]\s*(?:instead)?\s*[.!]?\s*$/i,
    /*
     * A QUESTION FOR ONE PERSON, IN ONE SENTENCE (request 92, point 11): "I want to ask Amani whether
     * the Kilimani shops have paid". The same lane, because what happens next is the same: the exact
     * question is said back and the lead confirms it. See `parseAskAPerson`.
     */
    ASKS_A_PERSON,
  ]),
  rule('add_context', [
    /*
     * THE SETUP CONVERSATION, REACHED FROM HERE RATHER THAN A SEPARATE CHAT (decision 50).
     *
     * Narrow, and on the word "context" or an explicit statement of what a check-in still needs to
     * run - not "objectives" or "targets", which the drafting lane above already owns for a
     * different kind of writing (a draft the team agrees together, not a lead's own setup). Placed
     * above `how_we_work` only, so a genuine handbook question never lands here first, and below
     * everything more specific for the same reason every lane here stays narrow.
     */
    /\b(?:add|put|note)\s+(?:this|that|it)\s+(?:as\s+|to\s+|into\s+|for\s+)?(?:the\s+)?context\b/i,
    /\b(?:the\s+)?context\s+(?:for|on|about)\s+(.+)/i,
    /\bset(?:ting)?\s+up\s+(?:the\s+)?context\b/i,
    /\b(?:add|give)\s+(?:some\s+)?context\s+(?:for|to|on)\s+(?:the|this|our|my)\s+check[-\s]?in\b/i,
    /\bwhat(?:'s| is)\s+missing\s+(?:from|on)\s+(?:the|this|our)\s+check[-\s]?in\b/i,
  ]),
  /*
   * LAST, ON PURPOSE. "How do we..." is the broadest shape here, and above the others it would
   * swallow questions they own - "how do I get on with my objectives" is not a handbook question.
   * Its own patterns stay narrow for the same reason.
   */
  rule('how_we_work', [
    /\bhow\s+do\s+(?:we|i)\s+(.{3,})/i,
    /*
     * "HOW DOES THE FREEZE WORK" WENT NOWHERE.
     *
     * The lane owned `how do we` and `how do I` and neither shape covers a question about a THING
     * rather than about doing something. Found the day the company's own decisions were first pushed
     * in: four cards landed, retrieval found them, and two of the three questions anybody would
     * actually ask were routed to the default.
     *
     * Deliberately not a bare `how` — that would take "how am I doing", which is somebody's own
     * standing and a different question with a lane of its own sitting below this one.
     */
    /\bhow\s+(?:does|do)\s+(?:the|our|a|an|this)\s+(.{3,})/i,
    /*
     * "What do I do if I am locked out" reached no lane at all, and the handbook had a section
     * headed exactly that. Found by uploading a real handbook and asking it the questions the
     * handbook answers, which is a different exercise from reading the patterns.
     *
     * Safe this low: the lanes that own the near neighbours all sit above it - "I'm stuck" is
     * coaching, "what am I waiting on" is the handoff lane - so what reaches here is a question
     * about a situation rather than about this person's own work.
     */
    /\bwhat\s+(?:do|should)\s+i\s+do\s+(?:if|when|about)\s+(.{3,})/i,
    /\bwho\s+do\s+i\s+(?:ask|tell|contact)\s+(?:about\s+)?(.{3,})/i,
    /\bwhat(?:'s| is)\s+(?:our|the)\s+(?:policy|process|rule)\b/i,
    /\bwhere\s+do\s+i\s+(?:find|go|put)\b/i,
    /\bam\s+i\s+allowed\s+to\b/i,
  ]),
];

export function route(input: string): Routed {
  const text = (input ?? '').trim();
  if (!text) return { lane: 'unplaced' };

  /* An option sends its key: the key of an option the shrug offered is the lane it names. */
  const asAKey = OPTIONS_THE_SHRUG_OFFERS.find((o) => o.key === text);
  if (asAKey) return { lane: asAKey.key };

  for (const r of RULES) {
    for (const p of r.patterns) {
      const m = p.exec(text);
      if (m) {
        /* Group one is the topic wherever a pattern captures it; lanes that need no subject ignore it. */
        const subject = (m[1] ?? '').trim().replace(/[?.!]+$/, '');
        return subject ? { lane: r.lane, subject } : { lane: r.lane };
      }
    }
  }
  return { lane: 'unplaced' };
}

/**
 * NEVER FAIL INTO A SHRUG.
 *
 * "I did not understand that" is where somebody stops coming back. An unplaced input is still
 * information, and discarding it teaches people to stop typing - so the answer says what CAN be
 * done with what they said rather than reporting a failure to parse it.
 *
 * Deliberately not an apology. The person did nothing wrong; the tool is young.
 */
/** What the shrug offers. Every one is a lane that answers, and its label routes to the same lane as its key does. */
export const OPTIONS_THE_SHRUG_OFFERS: { key: Lane; label: string }[] = [
  { key: 'what_you_can_see', label: 'Tell me what you can see' },
  { key: 'what_am_i_on', label: 'What am I on?' },
  { key: 'my_to_dos', label: 'What is on my list?' },
  { key: 'what_can_you_do', label: 'What can you help me with?' },
];

export function whatICanDoWith(input: string): { line: string; options: { key: string; label: string }[] } {
  const trimmed = (input ?? '').trim();
  /* A greeting is not a failed question (B-106). */
  if (/^\s*((hi|hello|hey|hiya|yo)(\s+there)?|good\s+(morning|afternoon|evening))\s*[.!]*\s*$/i.test(trimmed)) {
    return { line: 'Hello. Ask me something, or pick one of these.', options: OPTIONS_THE_SHRUG_OFFERS.map((o) => ({ key: o.key as string, label: o.label })) };
  }
  const short = trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 57)}…`;
  return {
    line: trimmed
      ? `I cannot answer that one yet. Here is what I can do with ${quotedThenEnding(short)}`
      : 'Ask me something, or pick one of these.',
    options: OPTIONS_THE_SHRUG_OFFERS.map((o) => ({ key: o.key as string, label: o.label })),
  };
}
