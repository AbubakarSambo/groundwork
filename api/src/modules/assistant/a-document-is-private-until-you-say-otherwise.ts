/**
 * PUTTING A DOCUMENT IN, AND SAYING WHO IT IS FOR.
 *
 * A chat cannot carry a file, which is why this was on the list of things not
 * offered. What a chat CAN do is start it, ask the one question that matters,
 * and make the answer stick — and the panel it lives in already has a file
 * picker's worth of surface.
 *
 * THE ONE QUESTION IS WHO IT IS FOR, AND THERE ARE THREE ANSWERS, NOT TWO.
 * "Private or not" sounds binary and is not: a document can be for everybody in
 * the check-in, for the lead alone, or for the person who uploaded it. Those are
 * three different intentions and collapsing them loses the middle one, which is
 * the one people most often mean — something the lead should see and the rest of
 * the team should not.
 *
 * IT ARRIVES PRIVATE AND IS OPENED BY SAYING SO, never the other way round. The
 * question is asked after the file is in, because that is when somebody is
 * actually looking at it — and a conversation abandoned halfway leaves the file
 * seen by nobody but its owner. A document that became visible to a team because
 * somebody walked away mid-sentence is not a mistake anybody can take back.
 */

export type WhoFor = 'OPEN' | 'CLOSED' | 'OWN';

/** In the words a person would use, because these are read out and answered. */
export const WHO_IT_COULD_BE_FOR: { value: WhoFor; label: string; said: string }[] = [
  { value: 'OPEN', label: 'everyone in this check-in', said: 'Everyone in this check-in can read it.' },
  { value: 'CLOSED', label: 'just the person leading it', said: 'Only the person leading this check-in can read it.' },
  { value: 'OWN', label: 'just you', said: 'Only you can read it. Nobody else on the check-in sees it at all.' },
];

/** What the assistant asks once a file is in. */
export function askWhoItIsFor(fileName: string): string {
  return (
    `"${fileName}" is in, and for now only you can see it. Who is it for — `
    + WHO_IT_COULD_BE_FOR.map((o) => o.label).join(', ')
    + '?'
  );
}

/**
 * Reading their answer, and refusing to guess.
 *
 * Null when it is not clear. Getting this wrong in the permissive direction
 * publishes somebody's document to their team, so anything ambiguous is a
 * question rather than a decision — "the team" is clear, "share it" is not,
 * because share with whom.
 */
export function whoTheyMeant(said: string): WhoFor | null {
  const s = said.toLowerCase().trim();

  if (/\b(everyone|everybody|the (whole )?team|all of (us|them)|open)\b/.test(s)) return 'OPEN';
  if (/\b(lead|manager|just (the|my) (lead|manager)|only the lead)\b/.test(s)) return 'CLOSED';
  if (/\b(just me|only me|me only|private|myself|nobody|no one)\b/.test(s)) return 'OWN';

  return null;
}

/** What to say when the answer was not clear enough to act on. */
export function askAgain(): string {
  return (
    'I did not want to guess, because opening it to the wrong people is not something I can undo. '
    + 'Say "everyone", "just the lead", or "just me".'
  );
}

/** What to say once it is set, so somebody knows exactly what happened. */
export function whatWasDone(fileName: string, who: WhoFor): string {
  const chosen = WHO_IT_COULD_BE_FOR.find((o) => o.value === who)!;
  return `"${fileName}" — ${chosen.said}`;
}

/**
 * Why a document cannot be added right now.
 *
 * A document belongs to a check-in: it is evidence for something being
 * discussed, not a filing cabinet. Somebody with no check-in open has nowhere
 * to put one, and saying that is more useful than a file picker that leads
 * nowhere.
 */
export function whyThereIsNowhereToPutIt(openCheckIns: number): string | null {
  if (openCheckIns > 0) return null;
  return (
    'A document goes with a check-in — it is evidence for something being discussed rather than a filing cabinet. '
    + 'You have none open, so there is nowhere to put one yet. '
    + 'If it is something the whole organisation should know, that is a different thing and whoever set Groundwork up can add it.'
  );
}
