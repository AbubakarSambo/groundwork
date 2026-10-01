/**
 * WHILE THE REPORT IS BEING WRITTEN, THE LEAD IS TOLD SO, PLAINLY (week 25).
 *
 * For nine people the report takes minutes after the last check-in to include everyone. In that time
 * the lead opened a report that looked finished and was missing people. So the lead's read of the
 * report carries `beingWritten`, with when it began and one plain sentence saying who is in it so far,
 * for as long as a synthesis of that check-in is running or waiting, and not a moment longer.
 *
 * The sentence is written here with each person's label. It is served through the same wrapper that
 * turns every label into a name for each reader (whatTheLeadHasNotShared), so a person the lead may
 * not see named reads as "a colleague", exactly as everywhere else. Opening a report never starts a
 * build: this only reads whether one is already out.
 */
export type BeingWritten = { since: string; sentence: string };

/** How many names are listed before the rest are "others". Three reads as a list; more reads as a crowd. */
const NAMES_LISTED = 3;

export function theSentenceWhileItIsWritten(labelsOfWhoAnswered: readonly string[]): string {
  const who = [...new Set(labelsOfWhoAnswered.filter((l) => l && l.trim()))];
  const tail = 'It will include everyone in a few minutes.';
  if (!who.length) return `The report is being written. ${tail}`;
  const list = who.length <= NAMES_LISTED + 1
    ? who.length === 1 ? who[0] : `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]}`
    : `${who.slice(0, NAMES_LISTED).join(', ')} and others`;
  return `The report is being written with what ${list} said. ${tail}`;
}

/** Which check-ins have a synthesis out or waiting, and since when. One entry per check-in, present only while it runs. */
export class Syntheses {
  private readonly open = new Map<string, { since: Date; count: number }>();
  begin(groundId: string, now: Date = new Date()): void {
    const at = this.open.get(groundId);
    if (at) at.count++;
    else this.open.set(groundId, { since: now, count: 1 });
  }
  end(groundId: string): void {
    const at = this.open.get(groundId);
    if (!at) return;
    if (--at.count <= 0) this.open.delete(groundId);
  }
  since(groundId: string): Date | null {
    return this.open.get(groundId)?.since ?? null;
  }
}
