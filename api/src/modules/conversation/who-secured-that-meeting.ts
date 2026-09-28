/**
 * A MEETING HAPPENED. WHO GOT IT?
 *
 * Live run, 24 September 2026. A consultant hired to secure government meetings reported this in
 * fortnight four: "A meeting was held with the Permanent Secretary's office, which was a good step
 * forward." His client's programme manager had found the contact, arranged the meeting and prepared
 * the brief; he attended. Across fifty-seven questions in three months the product never once asked
 * who arranged anything.
 *
 * So the fact that decided the engagement never entered the record, and everything downstream
 * inherited the hole. The report's closing question asked him "what was the single most useful
 * action that led to the meeting with the Permanent Secretary's office" - crediting him with it. His
 * contribution read "11 of these were independently named by someone else, which is worth more than
 * the count of what was said": her sentences about the work she had done became evidence for him.
 *
 * ONE QUESTION FIXES ALL OF THAT, and it is the ordinary question a person would ask: who set it up.
 * It is not an accusation and it is not a trap - most of the time the answer is "I did", which is
 * worth having on record too, and that is the shape this asks in.
 *
 * WHY IT IS DETECTED IN CODE AND ASKED BY THE MODEL. The prompt is enormous and a rule added to it
 * is one more imperative among hundreds; whether a meeting has been reported with nobody named as
 * having arranged it is a fact about the text, so code decides whether the question is owed. The
 * words are the model's, as every question in this product is.
 *
 * AND THE PASSIVE VOICE IS THE TELL, not proof of anything. "A meeting was held" is how everybody
 * writes about meetings, including people who arranged them. It raises the question; it never
 * answers it.
 */

/**
 * Something that only happens because somebody made it happen.
 *
 * "introduction" is NOT on this list on its own, and that is the one worth explaining: "I sent the
 * introduction letter" is a letter, not access to a person, and it was the commonest sentence in the
 * run this came from. Only an introduction TO somebody counts.
 */
const ACCESS_HAPPENED = /\b(meeting|meetings|meet with|met with|a call|the call|call with|call to|introduced (me|us|them) to|introduction to|audience with|session with|sat down with|workshop with|presentation to|pitch to|interview with|site visit)\b/i;

/**
 * Anybody saying, in any voice, who brought it about.
 *
 * Deliberately loose about word order: "I set that one up myself" is the same claim as "I set up the
 * meeting", and a pattern that only catches the tidy version asks people a question they answered.
 */
const SOMEBODY_GOT_IT =
  /\b(i\s+(?:\w+\s+){0,3}(?:arranged|organised|organized|secured|booked|convened|scheduled|initiated)|i\s+(?:\w+\s+){0,3}set\s+(?:\w+\s+){0,3}up|i\s+(?:\w+\s+){0,2}got\s+(?:us|me|them|the)|i managed to|i requested|i asked for|through my|i reached out|i introduced|my own contact|(?:she|he|they|we)\s+(?:\w+\s+){0,3}(?:arranged|secured|organised|organized)|(?:arranged|set up|organised|organized|secured|booked|scheduled) by\b|via my|on my initiative)/i;

/** Said about it in a way that names nobody: the shape that leaves the question open. */
const NOBODY_NAMED = /\b(a meeting was|the meeting was|meetings were|a call was|it was held|was held|was arranged|was set up|we had a meeting|there was a meeting|a session was|took place)\b/i;

export interface WhatTheySaid {
  text: string;
  session: number;
}

export interface AMeetingWithNobodyOnIt {
  /** Their sentence, so the question can be about the thing they actually said. */
  said: string;
  session: number;
}

/**
 * The reported meetings nothing in the record credits to anybody.
 *
 * Latest first, because the one they just mentioned is the one worth asking about.
 */
export function meetingsWithNobodyOnThem(said: WhatTheySaid[]): AMeetingWithNobodyOnIt[] {
  const all = (said ?? []).filter((s) => (s?.text ?? '').trim());
  /* Credit given anywhere in their record counts: they may have said who got it two turns later. */
  const out: AMeetingWithNobodyOnIt[] = [];
  for (const s of all) {
    const text = s.text.trim();
    if (!ACCESS_HAPPENED.test(text)) continue;
    if (SOMEBODY_GOT_IT.test(text)) continue;
    /* A meeting they are only proposing has not happened, so there is nobody to credit yet. */
    if (/\b(will|going to|hope to|plan to|want to|trying to|should|would like to|need to) \w*\s?(meet|arrange|set up|secure|get)\b/i.test(text)) continue;
    if (!NOBODY_NAMED.test(text) && !/\b(met|meeting|meetings|call)\b/i.test(text)) continue;
    out.push({ said: text.slice(0, 240), session: s.session });
  }
  return out.reverse().slice(0, 2);
}

/** Has anybody, anywhere in this person's record, said who arranged anything? */
export function nobodyHasSaidWhoArrangedAnything(said: WhatTheySaid[]): boolean {
  return !(said ?? []).some((s) => SOMEBODY_GOT_IT.test(s?.text ?? ''));
}

export const ASK_WHO_GOT_IT = 'WHO SECURED THIS';

/**
 * The block, or nothing.
 *
 * Nothing is the common case and the right one: where they have already said who arranged it, or
 * where no access has been reported, there is no question owed.
 */
export function askWhoSecuredIt(said: WhatTheySaid[]): string {
  const open = meetingsWithNobodyOnThem(said);
  if (!open.length) return '';
  if (!nobodyHasSaidWhoArrangedAnything(said)) return '';
  return [
    ASK_WHO_GOT_IT,
    '',
    'They have reported access to somebody without saying who got it:',
    ...open.map((m) => `  "${m.said}"`),
    '',
    'Ask who arranged it. Plainly, once, as a person would: who set that up, or how did that meeting come about.',
    '',
    'This is not a challenge and it must not sound like one. Most of the time the answer is that they',
    'arranged it themselves, and that belongs on the record as much as any other answer does. What is',
    'being closed is a hole: a record that says a meeting happened and does not say who made it happen',
    'credits it to whoever is in the room, and the report is then built on that.',
    '',
    'Take their answer as given. Do not weigh it, do not follow it with a second question about the',
    'same meeting, and never suggest that somebody else arranged it.',
  ].join('\n');
}
