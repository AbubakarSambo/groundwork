/**
 * A FAILED OPEN SAYS THE RIGHT THING TO EACH READER (request 225, item b).
 *
 * When the conversation could not be reached, everybody read "if it keeps happening tell the person who
 * set this check-in up". The lead IS that person, so she was told to tell herself. A participant was told
 * about a label when the lead has a name they already read in the check-in (see the-lead-has-a-name).
 *
 * The lead is told to try again, and that the fault is ours. A participant is told to tell the lead, by
 * first name where there is one, and "the person who set this check-in up" only where there is none.
 */
export const THE_ENGINE_COULD_NOT_BE_REACHED =
  'The conversation could not be reached just now, so this check-in cannot continue this minute. Nothing you have already said has been lost. Please try again shortly, and if it keeps happening tell the person who set this check-in up, because it is a problem on my side and not anything you did.';

export function whenTheConversationCannotBeReached(reader: { isTheLead: boolean; leadFirstName?: string | null }): string {
  const start = 'The conversation could not be reached just now, so this check-in cannot continue this minute. Nothing you have already said has been lost.';
  if (reader.isTheLead) {
    return `${start} Please try again in a few minutes. If it keeps happening, it is a problem on my side and not anything you did, and I am looking into it.`;
  }
  const lead = (reader.leadFirstName ?? '').trim();
  return `${start} Please try again shortly, and if it keeps happening tell ${lead || 'the person who set this check-in up'}, because it is a problem on my side and not anything you did.`;
}
