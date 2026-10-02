/**
 * WHO A WAIT IS ON, WHEN THE PERSON NAMED THEM IN THEIR OWN WORDS (item 18, the onboarding board, 2 October 2026).
 *
 * Tobi said he was waiting on "my direct reports" for three dates for a meeting, and the holder was kept as he said it.
 * So Tobi read "You are waiting on my direct reports ..." and "My direct reports holds it.", and Amina, who runs it,
 * read "Tobi Adewale is waiting on my direct reports ...", as if they were hers.
 *
 * A holder that starts with "my" or "our" is said from the reader's side: "your direct reports" to the person who is
 * waiting, and "their own direct reports" to everybody else. No name is added, so a reader who may not see who is
 * waiting learns nothing new.
 */
const MINE = /^\s*(my|our)\s+(.+)$/i;

export function aHolderInTheirOwnWords(onLabel: string | null | undefined, readerIsTheOneWaiting: boolean): string | null | undefined {
  if (typeof onLabel !== 'string') return onLabel;
  const m = onLabel.match(MINE);
  if (!m) return onLabel;
  const rest = m[2].trim();
  return readerIsTheOneWaiting ? `your ${rest}` : `their own ${rest}`;
}
