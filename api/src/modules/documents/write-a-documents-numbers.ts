/**
 * THE ONE PLACE A DOCUMENT'S WAITING NUMBERS ARE ACTUALLY WRITTEN.
 *
 * `DocumentsService.whatItHolds` reads a document and keeps what it found as `holds.waiting`,
 * with the owner already resolved - see a-document-is-read-not-agreed. Nothing is written until a
 * person says yes, and three places take that yes: the lead setting a check-in up
 * (GroundsService.whatASheetIsWaitingFor), a person inside a live check-in
 * (ConversationService.whatTheDocumentWaitsFor), and now Ask Groundwork
 * (AssistantService.resolveParkedDocumentNumbers). Each recognises its own "yes" in its own words -
 * that stays theirs - but the write itself was two copies of the same thing before this file
 * existed, and a third copy is exactly how two of them come to disagree without anybody noticing.
 * This is that write, in one place, called by all three.
 */
import { ContextItemKind, ContextNoteAudience } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { whatWasRecordedFromADocument } from './what-was-recorded-from-a-document';
import { theNameWeUseFor } from './what-a-document-holds';
import { theNoteAboutWhereTheNumbersCameFrom } from './the-note-about-where-numbers-came-from';

export interface ADocumentsWaitingRow {
  name: string;
  target: number;
  ownerParticipantId: string | null;
}

export interface WriteADocumentsNumbersInput {
  groundId: string;
  documentId: string;
  fileName: string;
  /** Only used to word the note: an OPEN document is named, a private one is not (request 46). */
  documentVisibility?: string | null;
  /** The rows to write, already deduped against nothing - this does that against the record. */
  waiting: ADocumentsWaitingRow[];
  /** The document's current `holds` JSON, so `takenAt` is stamped without losing the rest of it. */
  holds: Record<string, unknown>;
  setByParticipantId: string;
  /** Kept apart per caller so two callers writing the same moment never collide on sortOrder. */
  sortOrderBase: number;
  /**
   * A visible line on the Context page saying where the numbers came from. The setup chat and Ask
   * Groundwork both write this; a check-in in progress does not, because it already says the same
   * thing in the conversation itself, to the one person having it.
   */
  addNote: boolean;
  authorUserId?: string | null;
  /** 'setup': the page is named and marked as set by you. 'check-in': said inside a check-in. */
  reader: 'check-in' | 'setup';
  /** When the person gave their own number instead of the document's, on one line. */
  corrected?: { name: string; theirs: number; documents: number } | null;
}

/**
 * Writes whichever of `waiting` is not already on the record, stamps the document as taken, and
 * says back what was done, in the product's one wording for it (`whatWasRecordedFromADocument`).
 *
 * DEDUPED AGAINST THE RECORD, NOT AGAINST ITSELF, and read fresh here rather than trusted from the
 * caller: two people confirming the same document a moment apart must not both write it.
 */
export const ONLY_WHO_ADDED_IT_CAN_SHARE_IT = 'Only the person who added this document can share what is in it, so nothing was shared.';

export async function writeADocumentsNumbers(prisma: PrismaService, input: WriteADocumentsNumbersInput): Promise<string> {
  /*
   * ONLY THE PERSON WHO ADDED A DOCUMENT CAN MAKE ITS CONTENTS SHARED (decision 92). Its numbers go on
   * the board and a note goes up for everyone, so the yes has to be the adder's. Read from the document
   * itself, here, where every way of saying yes arrives; a caller that picked the wrong document is
   * stopped too. Nothing is written and the document stays waiting.
   */
  const doc = await Promise.resolve(prisma.groundDocument?.findUnique?.({ where: { id: input.documentId }, select: { participantId: true } })).catch(() => null);
  if (doc && doc.participantId !== input.setByParticipantId) return ONLY_WHO_ADDED_IT_CAN_SHARE_IT;

  const already = await prisma.groundObjective.findMany({
    where: { groundId: input.groundId },
    select: { name: true, ownerParticipantId: true },
  });
  const held = new Set(already.map((o) => `${o.ownerParticipantId ?? 'team'}::${(o.name ?? '').trim().toLowerCase()}`));
  const rows = input.waiting.filter((w) => !held.has(`${w.ownerParticipantId ?? 'team'}::${(w.name ?? '').trim().toLowerCase()}`));

  if (rows.length) {
    await prisma.groundObjective.createMany({
      data: rows.map((w, i) => ({
        groundId: input.groundId,
        name: w.name.slice(0, 120),
        target: w.target,
        ownerParticipantId: w.ownerParticipantId,
        setByParticipantId: input.setByParticipantId,
        sortOrder: input.sortOrderBase + already.length + i,
      })) as any,
    }).catch(() => undefined);
  }

  if (input.addNote) {
    await prisma.groundContextItem?.create?.({
      data: {
        groundId: input.groundId,
        kind: ContextItemKind.NOTE,
        text: theNoteAboutWhereTheNumbersCameFrom(input.fileName, input.documentVisibility),
        audience: ContextNoteAudience.EVERYONE,
        source: 'PASTE',
        authorUserId: input.authorUserId ?? undefined,
      },
    }).catch(() => undefined);
  }

  await prisma.groundDocument.update({
    where: { id: input.documentId },
    data: { holds: { ...input.holds, takenAt: new Date().toISOString() } as any },
  }).catch(() => undefined);

  const mine = rows.filter((r) => r.ownerParticipantId).length;
  const team = rows.length - mine;
  /* WHOSE EACH NUMBER IS, by first name, and "you" for the reader's own: the sentence used to say
     "the person it belongs to" and leave the lead to work out who that was. */
  let owners: string[] | null = null;
  try {
    const ids = [...new Set(rows.map((r) => r.ownerParticipantId).filter((x): x is string => !!x))];
    if (ids.length) {
      const people = await prisma.groundParticipant.findMany({
        where: { id: { in: ids } },
        select: { id: true, email: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } },
      });
      const called = new Map(people.map((p) => [p.id, (theNameWeUseFor(p as any) ?? '').split(/\s+/)[0]]));
      const named = rows.filter((r) => r.ownerParticipantId).map((r) => (r.ownerParticipantId === input.setByParticipantId ? 'you' : called.get(r.ownerParticipantId as string) ?? ''));
      owners = named.every(Boolean) ? named : null;
    }
  } catch {
    owners = null;
  }
  return whatWasRecordedFromADocument({
    owners,
    fileName: input.fileName,
    forAPerson: mine,
    forEveryone: team,
    corrected: input.corrected ?? null,
    reader: input.reader,
  });
}
