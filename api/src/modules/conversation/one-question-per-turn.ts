/**
 * "THE CHAT READS LIKE A COURT ROOM. DOES IT ACTUALLY TAP INTO THE ENGINE?"
 *
 * It does. `forHumans` runs on both the streamed and the non-streamed path, the scenario pack is
 * loaded, and the opener is written by the model rather than a canned string. Nothing is bypassed.
 *
 * What produces the courtroom is the SHAPE of a turn, and nothing was checking the shape. Read off
 * a live session:
 *
 *   "That's a clea[r]... 'prescribe' can mean different things to different people, so let's get
 *    your version down. What does 'overhaul the tech' look like in practice? Are you rebuilding
 *    something that exists, replacing it entirely, or something else?"
 *
 * Two questions, the second a multiple choice. A person answers the last thing they were asked, so
 * the first question goes unanswered and the reply that follows is a narrowed pick from a list
 * somebody else wrote. Do that four times and it is a cross-examination.
 *
 * THE RULE ALREADY EXISTS AND HAS NO TEETH. prompt-library.ts: "Ask one question per response.
 * Always. The most important one... Not two questions. Not three. One." It is prose, in a document
 * competing with several thousand words of other prose, and it loses - the same way the closer rule
 * lost to the extraction gate in the entry chat. An instruction is a request; this is the door.
 *
 * WHICH QUESTION SURVIVES: the first. Not because it is the better question - often the second is
 * sharper - but because keeping the first is the only choice that cannot change what the turn is
 * about. Dropping the opening ask and keeping a narrowing follow-up would leave a reply that
 * refines a question nobody was asked, which is worse than the fault being fixed.
 *
 * THE PROMPT'S OWN EXCEPTION SURVIVES UNTOUCHED, and by construction rather than by a special case.
 * It allows two asks "only where the two are halves of one fact and neither is usable alone", and
 * requires them "in one sentence". This rule counts SENTENCES, so a legitimate double ask is one
 * sentence with one question mark and passes. A rhetorical tag inside a sentence passes for the same
 * reason. What cannot pass is a second question standing on its own, which is exactly the shape the
 * prompt describes as being "answered as a list, which means one half gets answered and the other
 * looks avoided".
 */

/**
 * Does this sentence ask something? A question mark inside quotation marks is somebody's own words
 * said back to them, not a question put to them, so it is not counted.
 */
export function isAQuestion(sentence: string): boolean {
  return (sentence ?? '').replace(/"[^"\n]*"|\u201C[^\u201D\n]*\u201D/g, '').includes('?');
}

/**
 * WHETHER A REPLY IS STILL ASKING SOMETHING: its last sentence ends in a question mark. Used to hold
 * the completion signal back on a turn that closes and asks in the same breath - the person has a
 * question in front of them, and a "Complete session" button under it loses the answer.
 */
export function stillAsking(reply: string): boolean {
  const said = (reply ?? '').trim();
  if (!said) return false;
  const last = said.split(/(?<=[.!?])\s+/).filter(Boolean).pop() ?? said;
  return last.trim().endsWith('?');
}

/**
 * Tracks, across one reply, whether a question has gone out yet.
 *
 * Stateful because the streamed path emits a sentence at a time and has no view of the whole reply
 * when it decides on each one. One of these per reply, never shared between them.
 */
export class OneQuestionPerTurn {
  private asked = false;

  /** True when this sentence is a second question and must not go out. */
  isASecondQuestion(sentence: string): boolean {
    if (!isAQuestion(sentence)) return false;
    if (!this.asked) {
      this.asked = true;
      return false;
    }
    return true;
  }
}

/**
 * The whole-reply form, for the path that has the text in hand.
 *
 * Deliberately not implemented by splitting and rejoining in the caller: the streamed and unstreamed
 * paths differing by a line is how the two drift, and the drift is invisible because one of them is
 * only reachable when streaming fails.
 */
export function onlyTheFirstQuestion(sentences: string[]): { kept: string[]; dropped: string[] } {
  const rule = new OneQuestionPerTurn();
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const s of sentences) {
    if (rule.isASecondQuestion(s)) dropped.push(s);
    else kept.push(s);
  }
  return { kept, dropped };
}
