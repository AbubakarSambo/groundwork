/**
 * WHOSE DOCUMENT THIS IS, AND WHO ELSE CAN SEE IT.
 *
 * The session already reads every document the person can see, including the OPEN ones anybody in
 * the check-in has shared - that was fixed when `documentWhereFor` was shared with the list. What it
 * was never told is WHERE ANY OF THEM CAME FROM. The block went in under one heading, "SUPPORTING
 * DOCUMENTS (uploaded by this party before the session)", which is false about every document
 * somebody else shared: the lead's brief, a grant's terms, an admin's policy. The session believed
 * the person it was interviewing had written all of it.
 *
 * That is what stopped it doing the useful thing. Her words: "I should also be able to ask questions
 * in the checkin based on documents admin uploads, the lead uploads or i upload that is available to
 * everyone ... the chat can help me understand or fill in blanks i am missing by stating this is
 * context from x that is available to you if i seem to say something misaligned with the context or
 * ask it a question."
 *
 * You cannot say "this is from the brief your lead shared with everyone" if you were told the person
 * wrote it themselves. So every document now carries one line saying who provided it and who can
 * read it, and the session is told what it may do with that.
 *
 * WHAT IT DOES NOT CHANGE. Which documents reach the session - that is `documentWhereFor` and stays
 * exactly where it is. This describes what already arrived; it never widens it. A private document
 * is still labelled private, and the instruction that goes with the block is explicit that a private
 * one must never be quoted at anybody but its owner.
 */

/** Who provided a document, from the reader's side. */
export interface WhoProvidedIt {
  /** True when the reader uploaded it themselves. */
  mine: boolean;
  /** Their name, when somebody else provided it and the reader may be told who. */
  who?: string | null;
  /** Whether they lead this check-in, which is what makes a brief a brief. */
  fromTheLead?: boolean;
  /** OPEN: everybody in the check-in reads it. Anything else is not shared. */
  sharedWithEveryone: boolean;
}

/**
 * The one line that goes above a document's text.
 *
 * Written as a statement of fact rather than a permission, because the session is not deciding
 * anything here - the query already did - and a line that reads like a rule invites the model to
 * reason about the rule instead of using the document.
 */
export function whereThisCameFrom(p: WhoProvidedIt): string {
  if (p.mine) {
    return p.sharedWithEveryone
      ? 'Provided by the person you are talking to. They have shared it with everyone in this check-in.'
      : 'Provided by the person you are talking to. Private to them.';
  }
  const name = p.who?.trim();
  const source = p.fromTheLead
    ? name ? `${name}, who runs this check-in` : 'the person who runs this check-in'
    : name || 'somebody else in this check-in';
  return p.sharedWithEveryone
    ? `Provided by ${source}, and shared with everyone here - the person you are talking to can read it too.`
    : `Provided by ${source}.`;
}

/**
 * WHAT THE SESSION MAY DO WITH A SHARED DOCUMENT, which is the whole point of knowing where it came
 * from. Three uses, and one hard limit.
 *
 * The limit first, because it is the one that matters: a document nobody shared is not something to
 * quote at anybody. The query only ever hands over the reader's own private documents, so the only
 * way to break that here is to quote somebody's private file back at them as though it were common
 * ground - which is not a privacy leak so much as a lie about what the other person has seen.
 *
 * And the three uses are deliberately not "summarise the document". Nobody wants their brief read
 * back to them. They want it used at the moment it bears on what they just said.
 */
export const WHAT_TO_DO_WITH_THESE = `WHAT THESE DOCUMENTS ARE FOR.

Each one says who provided it and who can read it. That line is not decoration - it is what lets you
name a source, and you should.

1. WHEN THEY ASK YOU SOMETHING and a document answers it, answer from the document and say where the
   answer came from: "the plan your lead shared with everyone says the handover finishes on the
   19th". Do not make them go and find it.

2. WHEN WHAT THEY SAY DOES NOT MATCH A SHARED DOCUMENT, say so, plainly, once - and SAY WHAT THE
   DOCUMENT SAYS AND WHOSE IT IS, in the same breath. Not "which one is right?", which asks somebody
   to guess what you are looking at. Say: "The handover plan your lead shared with everyone puts
   that at 19 September - you have said August. Which is right?" Name the file or what it is, name
   who provided it, and quote the part that differs. A person cannot answer a discrepancy you have
   not shown them.
   You are not correcting them: a document can be out of date and the person is often the one who
   knows it is. Ask, and record what they say.

3. WHEN THEY ARE PLAINLY MISSING SOMETHING THAT IS SITTING IN A SHARED DOCUMENT, tell them it is
   there rather than interrogating them about it. Somebody who has not read the brief is not hiding
   anything; they have not read the brief.

THE LIMIT. A document marked private is private to the person you are talking to. Never quote it,
refer to it, or hint at it as though anybody else has seen it - to them it is theirs, and to anybody
else it does not exist. Only a document that says it is shared with everyone may be spoken about as
common ground.

AND NEVER TREAT A DOCUMENT AS THE TRUTH ABOUT WHAT HAPPENED. It is what somebody wrote down. Their
account is what you are here for, and where the two differ, that difference is the finding.`;
