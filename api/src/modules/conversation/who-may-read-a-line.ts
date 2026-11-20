/**
 * WHO MAY READ A RECORD LINE, THE ONE PLACE EVERY READER OF COLLEAGUES' LINES TAKES (Hafsah, batch 2, item 1: "Anything a lead says about
 * a named person's work, figures or performance, in setup or in her own check-ins, is seen only by the lead and that person, never by
 * the rest of the team. This holds in reports, the board, My work and Ask.").
 *
 * Whom a line is about is decided once, by the assessment (whoMaySee in the-assessment.ts), and written on the line by its one writer
 * (`aboutParticipantId`, the-record-from-the-assessment.ts). Every read of record_entries that serves lines to somebody other than the
 * lead and the person who said them narrows its where-clause here, so no page decides it for itself:
 *   - the lead (and an admin who runs the check-in) reads every line;
 *   - a person reads the lines everybody may read, and the ones about them;
 *   - what is shared with everybody in the check-in (the team report, the team's picture, a colleague's check-in) holds no line about
 *     anybody.
 * And a line the assessment read as cannot be true as said (`standing`, theStandingOf) is read by the lead alone, as what was said
 * (Hafsah, 4 November 2026; round 52, I4a and M1a), never offered to anybody else as fact.
 * The same rule for the assessments' facts is mayRead in the-facts-on-record.ts.
 */
const CANNOT_BE_TRUE = 'cannot be true';
export type ALineReader = { kind: 'the lead' } | { kind: 'the person'; participantId: string } | { kind: 'everybody in the check-in' };

export const EVERYBODY: ALineReader = { kind: 'everybody in the check-in' };
export const THE_LEAD: ALineReader = { kind: 'the lead' };
export const thePerson = (participantId: string | null | undefined): ALineReader => (participantId ? { kind: 'the person', participantId } : EVERYBODY);
/** The lead when they run the check-in, otherwise the person reading (or everybody, when the reader is on no check-in). */
export const theReader = (runsIt: boolean, participantId?: string | null): ALineReader => (runsIt ? THE_LEAD : thePerson(participantId));

/**
 * The where-clause fragment on record_entries for what this reader may read, spread into the reader's own clause. It holds both parts of
 * the one rule: no line about somebody else, and, where each person sees only their own target (`whoSeesTargets` THEIR_OWN, Hafsah,
 * 4 November 2026), no colleague's words about their target.
 */
export function theLinesThisReaderMayRead(reader: ALineReader, whoSeesTargets?: string | null): { NOT?: object[] } {
  if (reader.kind === 'the lead') return {};
  const pid = reader.kind === 'the person' ? reader.participantId : null;
  return {
    NOT: [
      { standing: { not: null, equals: CANNOT_BE_TRUE } },
      pid ? { aboutParticipantId: { not: null, notIn: [pid] }, participantId: { not: pid } } : { aboutParticipantId: { not: null } },
      ...(whoSeesTargets === 'EVERYBODY' ? [] : [{ type: 'SUCCESS_DEFINITION', ...(pid ? { participantId: { not: pid } } : {}) }]),
    ],
  };
}

/**
 * The same rule over rows already read: the lead, the person who said it and the person it is about read a line about somebody.
 * And, where each person sees only their own target (the default), a person's own aim (`SUCCESS_DEFINITION`) is read by them and the lead
 * alone, the same as `theLinesThisReaderMayRead` says for a where-clause: it is ONE rule, so a report written for the whole check-in never
 * held "Mary Wanjiku has stated a personal sales target higher than the team's" (run 7). A row read without its `type` is not narrowed.
 */
export function mayReadTheLine(line: { aboutParticipantId?: string | null; participantId?: string | null; standing?: string | null; type?: string | null }, reader: ALineReader, whoSeesTargets?: string | null): boolean {
  if (reader.kind === 'the lead') return true;
  if (line.standing === CANNOT_BE_TRUE) return false;
  if (line.type === 'SUCCESS_DEFINITION' && whoSeesTargets !== 'EVERYBODY' && !(reader.kind === 'the person' && reader.participantId === line.participantId)) return false;
  if (!line.aboutParticipantId) return true;
  return reader.kind === 'the person' && (reader.participantId === line.aboutParticipantId || reader.participantId === line.participantId);
}
