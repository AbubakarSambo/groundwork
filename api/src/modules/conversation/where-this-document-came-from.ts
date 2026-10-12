import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

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
 * A COLLEAGUE'S PROOF, AS THE RECORD HOLDS IT (night quality run 1, problem 1).
 *
 * Amina sent a location pin from a shop in Rangwe with her own check-in. It was shared with everyone
 * in the check-in, which is right (Hafsah, 12 October 2026), so it reached Collins's session too. The
 * session then told him "Amina shared a location pin on Monday for a Rangwe stockist shop, and
 * Rangwe said Rangwe asked you to check it out." Nobody asked anybody anything. Seeing the pin is
 * allowed; the story is not.
 *
 * So a photo or a pin somebody else sent reaches another person's session as the facts the record
 * holds and nothing more: who sent it, when, the pin's own name and address, and whatever words the
 * sender wrote with it. A photo's machine reading is not one of those facts; it stays in the sender's
 * own session and on the page. The line above it says what may not be said about it.
 */
export interface AColleaguesFile {
  fileName: string;
  content: string;
  uploaderNote?: string | null;
  mimeType?: string | null;
  createdAt?: Date | string | null;
}

/** A pin kept from WhatsApp is named this way by a-location-pin.ts. */
const isAPin = (f: AColleaguesFile) => /^Location pin shared at /.test(f.fileName ?? '');
const isAPhoto = (f: AColleaguesFile) => /^image\//i.test(f.mimeType ?? '');

/** True for the proof a colleague sent: a photo or a location pin. A brief or a spreadsheet is not this. */
export function isAColleaguesProof(f: AColleaguesFile): boolean {
  return isAPin(f) || isAPhoto(f);
}

/**
 * A COLLEAGUE'S PROOF IS NEVER HANDED TO ANOTHER PERSON'S SESSION (Hafsah, 12 October, step 3: "A colleague's proof is never put to
 * another person in their session; proof goes into the person's own check-in").
 *
 * Commit 1fc4e4183 handed Amina's pin to Collins's session as the record holds it, with a rule against a story. Run 2 still put it to
 * him: "Amina shared a location pin on Monday for a Rangwe stockist shop. Do you know about that one?" A rule in the prompt is not a
 * guard, so the pin and the photo no longer reach his session at all. They stay exactly where they are on the shared pages, for
 * everybody who sees them today: this decides only what one session is handed. The lead's documents and every brief are untouched, and
 * the person's own proof always goes in.
 */
export function withoutAColleaguesProof<T extends AColleaguesFile & { origin?: string | null; participant?: { userId?: string | null } | null }>(
  docs: readonly T[],
  reader: { userId: string | null | undefined; leadUserId: string | null | undefined },
): T[] {
  return docs.filter((d) => {
    const from = d.participant?.userId ?? null;
    if (from && from === reader.userId) return true;
    if (from && from === reader.leadUserId) return true;
    return !(isAColleaguesProof(d) || d.origin === 'photo');
  });
}

/** The line above a colleague's photo or pin, in place of the ordinary one. */
export function whatMayBeSaidAboutAColleaguesProof(who: string | null | undefined): string {
  const name = who?.trim() || 'Somebody else in this check-in';
  return `${name} sent this with their own check-in, and it is shared with everyone here. `
    + `The record holds only who sent it, when, the pin's name and address if it has them, and any words ${name} wrote with it. `
    + `Never say who asked anybody to go there, why it was sent, or what it shows, unless ${name} said so in those words. `
    + `Never put it to the person you are talking to as something they did, were asked to do, or know about. `
    + `If it bears on what they say, say only that ${name} sent it and when, and ask what they know.`;
}

/** The colleague's photo or pin as the session reads it: the record's facts, the sender's own words. */
export function aColleaguesProofAsTheRecordHoldsIt(f: AColleaguesFile, who: string | null | undefined, zone?: string): { fileName: string; content: string; uploaderNote: null } {
  const name = who?.trim() || 'Somebody else in this check-in';
  const theirWords = f.uploaderNote?.trim() ? ` ${name} wrote with it: "${f.uploaderNote.trim()}"` : '';
  if (isAPin(f)) return { fileName: f.fileName, content: `${f.content.trim()}${theirWords}`, uploaderNote: null };
  const when = f.createdAt ? whenItWas(f.createdAt, 'weekdayAndDay', zone) : '';
  return {
    fileName: f.fileName,
    content: `A photo ${name} sent with their own check-in${when ? ` on ${when}` : ''}.${theirWords}`,
    uploaderNote: null,
  };
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

A COLLEAGUE'S PHOTO OR PIN. It holds only who sent it, when, and the pin's name. Never tell a story
about it: not who asked whom, not why it was sent, not what it shows, unless the person who sent it
said so in words. Never put it to somebody else as something they did or were asked to do.

AND NEVER TREAT A DOCUMENT AS THE TRUTH ABOUT WHAT HAPPENED. It is what somebody wrote down. Their
account is what you are here for, and where the two differ, that difference is the finding.`;
