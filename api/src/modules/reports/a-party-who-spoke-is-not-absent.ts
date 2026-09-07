/**
 * SOMEBODY ANSWERED, AND THE RECORD TOLD THEM THEY DID NOT.
 *
 * The corpus handed to synthesis is built from RECORD ENTRIES - extracted, distinct
 * claims - not from raw turns. Extraction can legitimately produce nothing: somebody
 * finishes a check-in having said "it has been a bit slow lately" and "nothing else
 * comes to mind", which is a real contribution and contains no distinct claim to pull
 * out of it.
 *
 * The roster then described that person the same way it described somebody who never
 * opened their check-in - "checked in but has no record entries" - and the synthesis
 * did the reasonable thing with it and wrote:
 *
 *     "One person's record is not present. The synthesis below reflects what is
 *      available from the single record provided."
 *
 * Observed live on a two-party ground where BOTH parties completed and both said 123
 * characters. The engagement payload in the same response said contributed: true for
 * both, so the report contradicted itself in one document, and the half a person reads
 * is the half that was wrong.
 *
 * Telling somebody who answered that they did not take part is worse than a thin
 * record. A thin record is honest about a thin round; this one denies the round
 * happened. So the roster now separates the two cases it had collapsed, and forbids
 * the wording that caused it.
 *
 * What it deliberately does NOT do: put their raw turns into the shared corpus to
 * bulk it out. Extracted claims are what crosses between parties; their own sentences
 * are theirs. The fix is to describe the absence of a CLAIM accurately, not to widen
 * what is shared.
 */
export type PartyOnTheRoster = {
  label: string;
  /** Leads the ground - the leadership rules need this to have anything to match. */
  leads: boolean;
  /** Distinct claims extracted from what they said. */
  recordEntries: number;
  /** Characters they actually typed across their check-ins. The discriminator. */
  charsSaid: number;
};

export function whatTheRosterSaysAbout(party: PartyOnTheRoster): string {
  const label = `- ${party.label}${party.leads ? ' [leads this ground and the other parties on it]' : ''}`;

  if (party.recordEntries > 0) {
    const n = party.recordEntries;
    return `${label}: contributed ${n} record entr${n === 1 ? 'y' : 'ies'} (shown below)`;
  }

  /*
   * THEY SPOKE. There is simply no distinct claim to compare. Say exactly that, and
   * name the sentences the synthesis must not write - the failure was not a missing
   * rule but a roster line that invited the wrong one.
   */
  if (party.charsSaid > 0) {
    return (
      `${label}: took part in this round and answered, but nothing they said was specific` +
      ` enough to extract as a distinct claim - their account is too brief to compare.` +
      ` NEVER write that their record is missing, absent, not present or not provided,` +
      ` and never write that they did not take part or have not checked in. Say their` +
      ` account is too brief to compare, or say nothing about them at all.`
    );
  }

  /* And this one genuinely has not been heard from. There is already a sentence for it. */
  return (
    `${label}: has not checked in yet - nothing from them is in this corpus.` +
    ` Do not describe their views, role, or affiliation beyond this exact label`
  );
}
