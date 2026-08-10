import { DocumentVisibility } from '@prisma/client';

/**
 * WHO CAN SEE A DOCUMENT. (Wave 2, step 1)
 *
 * THE CURRENT BEHAVIOUR WAS NEVER DECIDED. documents.list filters on
 * `participantId: participant.id`, so every document is private to whoever
 * uploaded it. That is a participant guard applied to a list query, not a policy,
 * and it is right for one of the three real cases and backwards for another:
 *
 *   a participant's own evidence      private is correct
 *   the lead's brief, plan, terms     reaches nobody, which is the opposite of
 *                                     what it is for
 *
 * On the marketing page's Kaya Labs example the grant's terms ARE the finding.
 * In the product as it stands, the chief executive could not have been given
 * them, because the person who had them uploaded them and that was that.
 *
 * So visibility becomes a property with three values instead of an accident with
 * one. OPEN is everyone in the ground, CLOSED is the lead only, OWN is the
 * uploader only and is the default - which is what makes the flag honest.
 *
 * WHY THE FLAG LIVES INSIDE THIS FUNCTION rather than at the call site: with
 * CONTEXT_ENABLED off, every document must be treated as OWN whatever its column
 * says. A row could have been written as OPEN while the flag was on and the flag
 * then turned off, and the wrong answer in that moment is a document reaching
 * somebody it should not. Reading the column and ignoring the flag is the shape
 * of a kill switch that does not actually kill anything.
 */

export interface DocumentReader {
  /** The reader's participant id on this ground, or null if they are not a party. */
  participantId: string | null;
  /** Whether the reader leads this ground. Org admins read with the lead's eyes. */
  isLead: boolean;
}

export interface VisibleDocument {
  participantId: string | null;
  visibility: DocumentVisibility;
}

/**
 * @param contextEnabled the CONTEXT_ENABLED flag. FALSE means the old product:
 *   every document is private to its uploader, whatever the column says.
 */
export function canSeeDocument(
  doc: VisibleDocument,
  reader: DocumentReader,
  contextEnabled: boolean,
): boolean {
  const isMine = !!doc.participantId && doc.participantId === reader.participantId;

  // Flag off: exactly the behaviour before any of this existed.
  if (!contextEnabled) return isMine;

  switch (doc.visibility) {
    // Everyone in the ground works from the same brief.
    case DocumentVisibility.OPEN:
      return !!reader.participantId || reader.isLead;

    // The lead's own material. Theirs, and only theirs - including when they are
    // not the uploader, because an org admin reads with the lead's eyes.
    case DocumentVisibility.CLOSED:
      return reader.isLead || isMine;

    // A participant's evidence for their own account. Unchanged, and the default.
    case DocumentVisibility.OWN:
    default:
      return isMine;
  }
}

/**
 * The Prisma `where` for a reader's document list.
 *
 * Kept next to canSeeDocument on purpose: a query and a predicate that are
 * supposed to agree and live in different files eventually stop agreeing. The
 * test asserts they give the same answer for every combination.
 */
export function documentWhereFor(
  groundId: string,
  reader: DocumentReader,
  contextEnabled: boolean,
): Record<string, unknown> {
  /**
   * A READER WITH NO PARTICIPANT ID OWNS NOTHING, and saying so takes a clause
   * of its own because of how SQL treats null.
   *
   * `participantId: null` in a Prisma where does not mean "nothing". It matches
   * every row whose participantId IS null - and those exist: the relation is
   * onDelete SetNull, so removing somebody from a ground orphans their documents
   * rather than deleting them. So a reader with no participant id was matching
   * every orphaned document on the ground.
   *
   * Guarded upstream today, because assertParticipant throws for a non-party
   * before this query runs. Relying on that is how the next caller reintroduces
   * it, and the query is the thing that will get reused.
   *
   * Found by the property test below, which compares this against canSeeDocument
   * for every combination rather than against a hand-written expectation. The
   * rule had it right and the query did not.
   */
  const nothing = { groundId, id: { in: [] as string[] } };

  if (!contextEnabled) {
    return reader.participantId ? { groundId, participantId: reader.participantId } : nothing;
  }

  const clauses: Record<string, unknown>[] = [];
  // OPEN is for the people IN the ground, so a non-party gets nothing at all.
  if (reader.participantId || reader.isLead) {
    clauses.push({ visibility: DocumentVisibility.OPEN });
  }
  if (reader.participantId) {
    clauses.push({ participantId: reader.participantId });
  }
  if (reader.isLead) {
    clauses.push({ visibility: DocumentVisibility.CLOSED });
  }
  return clauses.length ? { groundId, OR: clauses } : nothing;
}
