/**
 * WHETHER A PERSON'S ROUND CAN BE CHECKED (pilots after fixes, A5).
 *
 * Brian sent his draft as a PDF and a photo, and Aisha her registry receipt; both were on the record, backing their lines,
 * and the board still read "Nothing Brian Kiptoo said this round can be checked yet ... Ask Brian Kiptoo for a photo",
 * because the conversation's own read of the session said "vague". A document or a photo on the record that backs a line
 * this round makes the round checkable, first. Otherwise the check-in's own read decides, and where it has none, whether
 * the record holds a number, a date or a document.
 */
export function aRoundCanBeChecked(
  checkIn: { specificityDimensions?: unknown; specificityLevel?: string | null } | null | undefined,
  recordHasSomething: boolean,
  aDocumentBacksALine: boolean,
): boolean {
  if (aDocumentBacksALine) return true;
  if ((checkIn?.specificityDimensions as any)?.checkable === 'specific') return true;
  if (checkIn?.specificityLevel) return !['vague', 'managed'].includes(String(checkIn.specificityLevel).toLowerCase());
  return recordHasSomething;
}
