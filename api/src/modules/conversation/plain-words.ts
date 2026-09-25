/**
 * ONE WORDING RULEBOOK, FOR EVERYTHING A PERSON READS.
 *
 * The scenario run of 25 September 2026 - all twenty-four situations, 73 people, 1,407 turns -
 * counted 734 answers dropped into fixed slots, 542 internal labels shown to people, 974 lines of
 * the engine's own table on screen, 201 sentences starting in lower case. Ten of the twelve problems
 * were the product's own code gluing pieces together, and this file is the other half of the
 * repair: where the model writes, it is told how.
 *
 * WHY ONE CONSTANT AND NOT A PARAGRAPH IN EACH PROMPT. There were already two places that said
 * something about wording - `VOCABULARY_RULE` (what to call things) and `houseStyle` (punctuation on
 * the way out). A third, fourth and fifth copy in the report, board and guide prompts is how three
 * surfaces come to disagree about whether a person may be called "the initiator". This is imported,
 * never retyped.
 *
 * WHAT IT IS NOT. It is not a style preference. Every rule below is a defect that reached a person's
 * screen, and the examples are real lines from that run, with the rewrite using only facts the
 * product already held.
 */

/**
 * The rules themselves. Given to every prompt that writes something a person will read.
 *
 * Kept short on purpose. A rulebook nobody can hold in their head is one the model skims, and the
 * base prompt is already long enough that blocks get trimmed for room.
 */
export const PLAIN_WORDS = `HOW TO WRITE ANYTHING A PERSON WILL READ

Write every sentence as a full sentence, with a subject and a verb. Never a fragment, never a label
followed by a colon and an answer.

Use people's names. Speak to the reader as "you". Never write "the initiator", "the lead",
"Participant A", "the person who set this up", or any other internal label for a person. Never use
somebody's job description as their name.

Never join pieces with colons, dots, arrows or slashes. Never write a list of labels and fragments.

Use the words the team itself used. Avoid management jargon. Do not write bottleneck, alignment,
leverage, stakeholders, deliverables, escalate, cadence, pipeline, or KPI. Write "waiting for",
"stuck", "open applications" instead.

One idea per sentence. Short, but complete.

Give a number with what it counts and what it is against. Write "11 of the 40 approved facilities",
never "11/40".

Say how something is known: shown by a document or a system, confirmed by the person who received
it, or only somebody's word.

Never put a label on a person. Not "PIP", not "exit", not "thriving", not "at risk". Say what
happened, and what would change it.

Start every sentence with a capital letter. Never cut a sentence, and never cut a word. If something
must be shorter, write a shorter whole sentence.`;

/**
 * THE BEFORE SET, from the run of 25 September 2026.
 *
 * Real lines the product wrote, each with how it should read. The rewrites invent nothing: every one
 * uses only facts the product already held when it wrote the bad line.
 *
 * Given to the model as examples because a rule stated abstractly ("write full sentences") and a
 * rule shown ("this, not this") are not equally followed, and these are the exact shapes that came
 * out twenty-four times out of twenty-four.
 */
export const PLAIN_WORDS_EXAMPLES = `EXAMPLES. The left column is what this product actually wrote. The right is how it should have read.

WRONG: 4 of 4 people have given an account, and nothing in any single account contradicts what that person said it was for. The accounts differ on 2 things, below.
RIGHT: All four people have checked in. They disagree on two things: where the work is stuck, and how many applications are open.

WRONG: Femi Okonkwo said this was for: I'll know when they tell me they have the statements ready. Where they say they stand now: I have visited many businesses, 46 in total. What they say is in the way: Many of them are still trying to get the statements from their banks.
RIGHT: Femi has visited 46 businesses. Most of his applications are waiting for customers to send their bank statements.

WRONG: Where they say they stand now: I sent it at 10:00 AM on Friday. What they say is in the way: I am waiting for a response.
RIGHT: Ngozi sent her file to the credit committee on Friday morning, and is waiting for their answer.

WRONG: Apply the checklist from the Relationship officer, Surulere. Target 14 approved facilities this quarter. to the work of the other officers.
RIGHT: Kwame made a checklist that gets customers' documents in faster. Share it with Femi and Ngozi.

WRONG: The initiator believes the problem is the credit committee, but for two of the three officers, the bottleneck is customers not providing documents.
RIGHT: You believe the credit committee is what holds sales up. For two of your three officers, the hold-up comes earlier: customers are slow to send their bank statements.

WRONG: The initiator's pipeline count of 25 applications is also wrong; the officers are reporting a combined total of 64.
RIGHT: You counted 25 open applications. Your officers' own numbers add up to 64.

WRONG: standing: THIN - only 3 people answered, which is too few to rank. asked 4 . answered 3 . said they cannot 0 . never reached 1
RIGHT: Three of the four people answered this question. That is too few to compare.

WRONG: 1 people answered this check-in.
RIGHT: One person has answered so far.

WRONG: We are tracking credit sales against the target for this quarter. the person who set this up said your target is 12 approved facilities.
RIGHT: Bisi says your target this quarter is 12 approved facilities. Is that right?

WRONG: the "why" behind certain decisions that aren't e....
RIGHT: Never cut a sentence in the middle of a word. Write a shorter whole sentence instead.

WRONG: 4 of 4 people have given an account. the initiator said this was for: We're aiming for 40 approved facilities and N120 million disbursed.
RIGHT: The team has 11 approved facilities so far, against a target of 40.`;

/** Both halves, for a prompt that has room for the examples. Most do. */
export const PLAIN_WORDS_WITH_EXAMPLES = `${PLAIN_WORDS}\n\n${PLAIN_WORDS_EXAMPLES}`;

/**
 * THE WORDS AND SHAPES THAT MUST NEVER REACH A PERSON, as data rather than as prose.
 *
 * The rulebook above tells the model. This tells the checker (see a-line-a-person-can-read.ts): the
 * same rule, in the form something can test, so a line that breaks it is caught before it is saved
 * rather than found in a run three weeks later.
 */
export const NEVER_IN_ANYTHING_A_PERSON_READS: { what: string; pattern: RegExp }[] = [
  { what: 'a slot name glued to an answer', pattern: /\b(said this was for|What they report|Where they say they stand now|What they say is in the way)\s*:/i },
  { what: 'an internal label for a person', pattern: /\b(the initiator|the person who set this up|Participant [A-Z]\b)/i },
  { what: "the engine's own table", pattern: /\b(FIELD:|standing:\s*(THIN|THICK|ENOUGH)|asked \d+ · answered \d+|by kind -)/ },
  { what: 'a sentence cut in the middle of a word', pattern: /\w{2,}\.{3,}/ },
  { what: 'a stray full stop inside a name', pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\.\s+(?=[a-z])/ },
  { what: 'a plural used for one', pattern: /\b1 people\b|\b1 of 1 people\b/i },
];

/** Management words the rulebook bans, for the same checker. Word-boundaried, case-insensitive. */
export const JARGON = ['bottleneck', 'alignment', 'leverage', 'stakeholders', 'deliverables', 'escalate', 'cadence', 'pipeline', 'KPI'];
