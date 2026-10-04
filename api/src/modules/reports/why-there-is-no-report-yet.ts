/**
 * WHY THERE IS NO REPORT YET.
 *
 * "Report not found" was the answer to every one of these, and 64 of the hundred journeys hit it
 * seconds after finishing a session — the person had just spent ten minutes answering and was told
 * the thing they were promised does not exist. It exists; it is being written, or it is waiting on
 * somebody. Those are different sentences and the person can act on two of the three.
 *
 * Still a 404, deliberately: the shape of the answer is what keeps a stranger from learning that a
 * check-in exists (see privacy-isolation.spec.ts). Only the sentence changes, and only for somebody
 * who is already entitled to be here.
 */

export interface WhereEverybodyIs {
  /** One entry per party, with how far their own check-in has got. */
  parties: { completed: boolean; started: boolean }[];
}

export function whyThereIsNoReportYet(where: WhereEverybodyIs): string {
  const { parties } = where;
  if (!parties.length) return 'Report not found';

  const done = parties.filter((p) => p.completed).length;
  const waiting = parties.length - done;

  if (done === 0) {
    return 'There is no report yet. Nobody has completed their check-in.';
  }
  if (waiting > 0) {
    const words = ['Nobody', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
    const how = waiting <= 10 ? words[waiting] : String(waiting);
    const who = waiting === 1 ? 'One person has' : `${how} people have`;
    return `The report is written once everybody has answered. ${who} not finished yet. You will be emailed when it is ready.`;
  }
  /*
   * Everybody is done and there is still no row: the report is being written. This is the one
   * people met most often, pressing straight through from the end of their own session.
   */
  return 'Everybody has answered, and the report is being written. This takes up to a minute. You will be emailed when it is ready.';
}
