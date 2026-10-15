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

EVERY RULE BELOW IS ABOUT WORDS YOU WRITE. NONE OF THEM IS ABOUT WORDS SOMEBODY SAID.
A quotation is what a person actually said, and it is kept exactly as they said it: their wording,
their jargon, their fragments, their capital letters. Never tidy a quotation, never shorten one,
never make one a full sentence, never swap a word in one for a plainer word. If a rule below would
change what is inside quotation marks, the rule does not apply there. Where their own words are not
plain enough to stand alone, write your own plain sentence around the quotation and leave the
quotation untouched. A quotation that has been improved is no longer evidence of anything, and this
product's whole value is that what somebody said is still what they said.

Write every sentence as a full sentence, with a subject and a verb. Never a fragment, never a label
followed by a colon and an answer.

Use people's names. Never use somebody's job description as their name.

Never call anybody a participant. That is our word for a row in a database, not a word anybody
uses about a colleague. Name them, or say "people": "the other two people in this check-in", never
"the other two participants". The same goes for "party", "the initiator" and "the respondent".

Never join pieces with colons, dots, arrows or slashes. Never write a list of labels and fragments.

Use the words the team itself used. Avoid management jargon. Do not write bottleneck, alignment,
leverage, stakeholders, deliverables, escalate, escalation, cadence, pipeline, KPI, actionable,
synergy or bandwidth. Write "waiting for", "stuck", "open applications", "went back about it"
instead. As above, a quotation is exempt: when you are repeating what somebody actually said, use
their words exactly, jargon and all, inside quotation marks.

Never write "vs." or "vs". Two things that disagree are a sentence, not a heading. Write "The lead
says the budget is 180,000 and the team's plans add up to more than that", never "Total budget vs.
proposed plans".

One idea per sentence. Short, but complete.

Give a number with what it counts and what it is against. Write "11 of the 40 approved facilities",
never "11/40".

Say how something is known: shown by a document or a system, confirmed by the person who received
it, or only somebody's word.

Never put a label on a person. Not "PIP", not "exit", not "thriving", not "at risk". Say what
happened, and what would change it.

Start every sentence with a capital letter. Never cut a sentence, and never cut a word. If something
must be shorter, write a shorter whole sentence.

EVERY FIELD YOU FILL IN IS READ BY A PERSON, EXACTLY AS YOU WROTE IT. Nothing tidies it up
afterwards and nothing wraps it in a sentence of its own. So write one plain, full sentence in every
field, including the ones that sound like headings or titles. "Total budget vs. proposed plans" is a
heading. "The lead's budget is 180,000 and the team's plans add up to more than that" is what the
person needs to read.

THIS IS ABOUT HOW EACH ENTRY IS WRITTEN, NEVER ABOUT HOW MANY THERE ARE. Where a field holds a list,
fill in EVERY entry it asks for, and write each entry as its own plain, full sentence. One entry for
each person, each agreement, each difference. Never merge two entries into one, never leave an entry
out, and never send back a shorter list because the sentences are longer. A report that gives one
person's account when three people answered is wrong, however well that one sentence reads.`;

/**
 * AND WHO THE SENTENCE IS SPOKEN TO, WHICH IS NOT THE SAME EVERYWHERE.
 *
 * The first version of this rulebook said "Speak to the reader as you" and gave it to everything.
 * On the performance-plan scenario the shared picture then came back:
 *
 *   "You said that for his first quarter, you and Nathan agreed on a target of five renewals.
 *    You wrote that Nathan is not meeting his renewal targets."
 *
 * That is the lead's account, written in second person. The report is generated ONCE, in labels,
 * and rendered separately for each reader - so "You" meaning the lead becomes "You" meaning
 * whoever opens it, and Nathan read his manager's account of him as though it were his own.
 *
 * `withNames` has said so since it was written: "Tell the model to write in second person cannot
 * work: ONE report is generated in labels and then rendered per reader. At generation time there is
 * no reader to address." The rulebook has to respect that, so the person being addressed is now a
 * property of the SURFACE rather than a rule for all of them.
 */

/** For anything written to one person, in the moment: the check-in, the guide, the assistant, email. */
export const SPOKEN_TO_THE_READER = `Speak to the reader as "you". Use other people's names.
Never write "the initiator", "the lead", "Participant A", "the person who set this up", or any other
internal label for a person.`;

/**
 * For the shared report and the board, which are written once and rendered for several readers.
 *
 * The labels are not a style choice here - they are the mechanism. The product swaps each label for
 * a name, or for "you" when that label belongs to whoever is reading, at the moment it is served. A
 * "you" written into the text itself belongs to nobody and is read by everybody.
 */
export const WRITTEN_ONCE_FOR_SEVERAL_READERS = `WHO YOU ARE WRITING ABOUT, AND HOW TO NAME THEM.

Every person is given to you with a label: "the initiator" for whoever set this up, and "Participant
A", "Participant B" and so on for everybody else. Use those labels exactly, every time you refer to
somebody.

NEVER write "you" or "your" about a person. This is written once and shown to several different
people, each of whom sees their own label turned into "you" and everybody else's turned into a name.
A "you" that you write yourself belongs to nobody, and every reader will take it to mean themselves.

Do not invent a label. Do not use somebody's job description in place of their label.

AND DO NOT REFER BACK TO A PERSON WITH A PRONOUN. Write the label again instead of "he", "she" or
"they". Each label is swapped for a name, or for "you", when the report is served - so a pronoun
that agreed with the label no longer agrees with what replaces it, and "Participant A says they were
told the target was five" is served as "You say they were told the target was five".

Write "Participant A says Participant A was told the target was five renewals, and Participant A
has completed six." It reads repetitively to you. It is served as "You say you were told the target
was five renewals, and you have completed six", which is what the person actually reads.`;

/**
 * EVERY VERB KEEPS ITS SUBJECT.
 *
 * Check-1 and check-2, the lead's judgement: "You expect Tobi Adewale to take on ..., but has not
 * communicated this." The model wrote "The initiator expects Participant A to ..., but has not ...",
 * a second verb with no subject, and a label turned into "you" leaves it in the wrong person. No rule
 * at the read can fix it safely (see a-line-a-person-can-read), so the model is told.
 *
 * WHERE IT GOES, decided by Hafsah, 27 September 2026: into the stored prompt the normal way, so a
 * report's promptVersionId shows it. So it is part of REPORT_SYNTHESIS's text, seeded into
 * PromptVersion, and it is NOT appended after the stored prompt in code. The prompts built in code,
 * which have no PromptVersion row (the picture, the judgement over a room and over the answers, the
 * population judgement, the one-call rewrite), carry it in their code, which is the normal way for them.
 */
export const EVERY_VERB_KEEPS_ITS_SUBJECT = `AND EVERY VERB KEEPS ITS SUBJECT. A second verb after "and" or "but" gets its own subject, the
label again: not "The initiator expects Participant A to take on the renewals, but has not said so",
which is served to the lead as "You expect ..., but has not said so", but "The initiator expects
Participant A to take on the renewals, but the initiator has not said so." The same goes for "and is
waiting": write "and the initiator is waiting".`;

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
RIGHT: The initiator believes the credit committee is what holds sales up. For two of the three officers, the hold-up comes earlier: customers are slow to send their bank statements.
  (On a surface written to one person, this reads "You believe the credit committee is what holds
   sales up." The product makes that swap itself. Write the label; never write "you".)

WRONG: The initiator's pipeline count of 25 applications is also wrong; the officers are reporting a combined total of 64.
RIGHT: The initiator counted 25 open applications. The officers' own numbers add up to 64.

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
export const JARGON = [
  'bottleneck', 'alignment', 'leverage', 'stakeholders', 'deliverables', 'escalate', 'cadence',
  'pipeline', 'KPI',
  /* Added 26 September 2026, all of them counted in a run and none of them said by anybody in a
     room. "vs." arrived as a divergence topic, "Total budget vs. proposed plans", which is a
     heading where the product promised a sentence. */
  'actionable', 'synergy', 'bandwidth', 'vs.',
  /* Added 25 September 2026 from Nathan's own report, which called five renewals "the initial
     success metric" and then "the performance target" in consecutive sentences. Neither phrase was
     said by anybody in the room; both mean "target". */
  'success metric', 'performance target', 'delivery objective', 'key result area',
];
