/**
 * WHAT THIS RECORD RESTS ON.
 *
 * The hundred-journey audit attached sixteen documents across the run and found that one report of
 * a hundred and forty-five mentioned a document at all. The synthesis prompt is handed a COUNT —
 * `docStatus.total` — and nothing else, so somebody who attached a contract, said "the offer
 * letter is attached", and answered questions about it could not tell from the record that it had
 * ever been read.
 *
 * This is deliberately not a prompt instruction. A model asked to mention the documents will
 * sometimes mention them; a list computed from the rows is on every report or the code is wrong.
 * It names them and says nothing about what is in them — the reading is the report's job, and the
 * assessment is per-party material that the reveal gate already governs.
 *
 * WHO SEES WHICH NAME is not decided here. `canSeeDocument` already owns that question for the
 * documents list, and a second implementation of a visibility rule is how two answers to "who can
 * see this" come about.
 */
import { DocumentVisibility } from '@prisma/client';
import { canSeeDocument, type DocumentReader } from '../documents/who-can-see-a-document';

export interface ADocumentOnTheRecord {
  id: string;
  fileName: string;
  participantId: string | null;
  visibility: DocumentVisibility;
  /** Whether the engine produced a read of it. */
  assessed: boolean;
}

export interface RestsOn {
  /** One line per document this reader may know about. */
  documents: { fileName: string; whose: string; read: boolean }[];
  /** Documents on this check-in that this reader may not see, as a number only. */
  otherPartiesHave: number;
}

export function whatThisRecordRestsOn(
  documents: readonly ADocumentOnTheRecord[],
  reader: DocumentReader,
  labels: Map<string, string>,
  contextEnabled: boolean,
): RestsOn {
  const visible = documents.filter((d) => canSeeDocument(d, reader, contextEnabled));
  return {
    documents: visible.map((d) => ({
      fileName: d.fileName,
      whose:
        d.participantId === reader.participantId
          ? 'you attached this'
          : `${labels.get(d.participantId ?? '') ?? 'A party'} attached this`,
      /*
       * "Read" means the engine produced an assessment of it. Said plainly because the opposite —
       * a document sitting on a check-in that nothing ever looked at — is a real state, and one
       * the person who attached it is entitled to know about.
       */
      read: d.assessed,
    })),
    otherPartiesHave: documents.length - visible.length,
  };
}

/** The sentence for a reader with nothing to show, so the section is never a bare empty list. */
export function nothingRestsOnADocument(): string {
  return 'No documents were attached to this check-in. Everything here comes from what people said.';
}
