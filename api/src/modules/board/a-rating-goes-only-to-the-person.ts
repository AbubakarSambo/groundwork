import type { ContributionRead } from './reads';

/**
 * A RATING GOES ONLY TO THE PERSON IT IS ABOUT (decisions 38, 40 and 43).
 *
 * "Contribution against role" was built from the engine's count of how specific and checkable a
 * person's lines were, and the lead read it as that count: "3 check-ins on record. 37 lines taken
 * from what they said, 10 with a name, a number or a date in them, 5 of those specific enough for
 * somebody else to go and check. ... Read against Management: on track here means ...". That is how
 * a person's answers were rated, served to the lead as a rating.
 *
 * The person may read their own row as it is. Anybody else, the lead and an admin included, gets
 * only the prototype's plain form, "Nothing checkable" beside the name with what would change it,
 * and nothing else from the rating: no counts, no confidence, no yardstick, no basis. The row itself
 * stays, so the role the lead gave and whether it was defined still show.
 */
export function contributionAsThisReaderMayRead(
  rows: ContributionRead[] | undefined,
  meParticipantId: string | null,
): ContributionRead[] | undefined {
  if (!rows) return rows;
  return rows.map((r) => {
    /* The person's own row keeps the words of their own read (decision 38), never a number: the
       confidence and the count of evidence are the engine's, and are not served (request 111 a). */
    if (meParticipantId && r.participantId === meParticipantId) {
      const { confidence: _c, evidenceCount: _e, ...own } = r as ContributionRead & { confidence?: number; evidenceCount?: number };
      /* Nobody is read on answers they never gave (request 116 c); to themselves, "you". */
      if (r.notCheckedInYet) return { ...own, reason: 'You have not checked in yet.' } as ContributionRead;
      return own as ContributionRead;
    }
    const who = r.name || 'this person';
    /* With no check-in there is nothing to read, so the lead reads that, never "nothing checkable" (request 116 c). */
    if (r.notCheckedInYet) {
      return {
        participantId: r.participantId,
        name: r.name,
        remit: r.remit,
        remitDefined: r.remitDefined,
        position: null,
        positionLabel: null,
        reason: `${r.name || 'This person'} has not checked in yet.`,
        nothingCheckable: false,
        notCheckedInYet: true,
        isBlocked: r.isBlocked,
        ownVoice: null,
        shown: true,
        guard: r.guard,
      };
    }
    return {
      participantId: r.participantId,
      name: r.name,
      remit: r.remit,
      remitDefined: r.remitDefined,
      position: null,
      positionLabel: null,
      ...(r.note ? { note: r.note } : {}),
      reason: r.remitDefined && r.nothingCheckable
        ? `Nothing ${who} has said so far is checkable, because nobody else can check it yet. A number, a date or a document for what moved would change that.`
        : null,
      nothingCheckable: !!r.nothingCheckable,
      isBlocked: r.isBlocked,
      ownVoice: null,
      shown: true,
      guard: r.guard,
    };
  });
}
