import { theFirstNameFrom } from '../reports/a-title-is-not-a-first-name';

/**
 * THE PERSON SPEAKING, BY NAME, AT THE TOP OF A TRANSCRIPT AN EXTRACTION READS (review of 1 October 2026).
 *
 * The transcript says only "PERSON:", so the extraction of the lead's aims wrote them as the lead said
 * them ("I'm aiming for N120 million") or about "the person" and "the speaker". With the name given,
 * EXPECTATION_PROMPT writes each aim about them by name ("Bisi is aiming for ..."), and the board then
 * serves that name as "you" to Bisi, through the same naming every report goes through.
 */
export function theSpeakerLine(p: { user?: { firstName?: string | null; lastName?: string | null } | null } | null | undefined): string {
  const first = theFirstNameFrom(p?.user?.firstName, p?.user?.lastName);
  return first
    ? `THE PERSON SPEAKING: ${first}`
    : 'THE PERSON SPEAKING: their name is not known, so call them "the lead".';
}
