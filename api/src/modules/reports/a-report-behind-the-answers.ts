/**
 * A REPORT THAT IS OLDER THAN THE ANSWERS SAYS SO.
 *
 * Live run, 24 September 2026. Ten agribusinesses answered one open link over ten minutes. The
 * report the lead opened said "2 of 2 people have given an account", and its table opened "4 people
 * answered this check-in". Both numbers were true of the last synthesis that SUCCEEDED: two later
 * ones failed to parse and a third was refused by a guard, and a failed synthesis keeps the report
 * that is already there.
 *
 * Keeping it is right. Saying nothing is not. A lead reading "4 people answered" on a check-in ten
 * people answered has no way to tell a thin response rate from a stale page, and those call for
 * opposite decisions - one means chase the network, the other means wait ten minutes.
 *
 * ONE SENTENCE, COUNTED, NEVER AN APOLOGY. It says how many answered, how many this read, and that
 * the rest are coming. It does not say something went wrong, because usually nothing has: on an
 * open link somebody finishes every few minutes and the report is a minute behind by design.
 */

export interface HowFarBehind {
  /** People with a completed check-in right now. */
  answered: number;
  /** People the stored report actually read. Null on reports written before this was recorded. */
  read: number | null;
  behindBy: number;
  /** The line for the reader, or null when the report is level with the answers. */
  say: string | null;
}

export function howFarBehind(answered: number, read: number | null | undefined): HowFarBehind {
  const wasRead = read === null || read === undefined ? null : Number(read);
  if (wasRead === null || !Number.isFinite(wasRead)) {
    return { answered, read: null, behindBy: 0, say: null };
  }
  const behindBy = Math.max(0, answered - wasRead);
  if (behindBy === 0) return { answered, read: wasRead, behindBy: 0, say: null };
  return {
    answered,
    read: wasRead,
    behindBy,
    say: `${answered} ${answered === 1 ? 'person has' : 'people have'} answered, and this was written from ${wasRead}. ` +
      `The ${behindBy === 1 ? 'other one is' : `other ${behindBy} are`} not in these numbers yet.`,
  };
}
