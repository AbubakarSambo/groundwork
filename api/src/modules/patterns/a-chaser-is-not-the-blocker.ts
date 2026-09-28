/**
 * THE PERSON DOING THE CHASING IS NOT THE PERSON THE WORK IS STUCK ON.
 *
 * Live run, 24 September 2026. A chief executive hired a consultant to move a government approval
 * forward. He worked one contact she had introduced him to, wrote letters instead of meeting anybody,
 * and promised the same meeting for three months. Six fortnights of private check-ins produced these
 * findings - and they were about HER:
 *
 *   B5  SURFACED  "Coordination delegated to a direct report has not resulted in progress on key
 *                  blockers."
 *   B11 CANDIDATE "Lack of progress is attributed to a direct report's failure to execute delegated
 *                  tasks."
 *
 * Then her own coaching told her: "Heavy communication, no reduction in blockers. This came up in 3
 * of your sessions, not once." The only pattern that surfaced about this engagement in three months
 * accused the person who was chasing, and the product's advice to her was to communicate better.
 *
 * WHY IT HAPPENS, AND WHY IT IS NOT THE MODEL'S FAULT. B5, B11 and K3 read one person's transcript
 * for the shape "a lot of talking about a problem, and the problem is still there". A lead whose
 * consultant is not delivering produces that shape exactly, session after session, and the detector
 * has no way to know that the reason the problem is still there is sitting in the next check-in.
 * From inside her transcript alone, both labels are a fair reading of the words.
 *
 * SO THE FACT THAT SETTLES IT IS ALREADY ON RECORD, and it is not a judgement: `GroundDependency`
 * rows say who is waiting on whom, by name, for what, and whether it cleared. Where this person is
 * waiting on ANOTHER PARTICIPANT in this same check-in and that dependency has not cleared, these
 * three codes are not written about them. The work is not stuck because of how they communicate.
 *
 * WHAT IT DOES NOT DO. It does not move the code onto the other person. A machine inferring a
 * finding about somebody from somebody else's sentences is the accusation this product refuses to
 * make, and it is not needed: the dependency row names them already, and the report says so in
 * plain words. This only stops the wrong name being on it.
 *
 * AND IT IS NARROW ON PURPOSE. Three codes, and only while a named, uncleared dependency on another
 * participant is on record. A lead who really is all talk, with nothing in the way from anybody
 * here, still gets read the same as before.
 */

/** The codes whose whole signal is "you keep talking and it has not moved". */
export const NOT_ABOUT_THE_ONE_WAITING = new Set(['B5', 'B11', 'K3']);

export interface ADependencyOnSomebodyHere {
  /** The participant this person is waiting on. Only rows naming somebody IN this check-in count. */
  onParticipantId: string | null;
  status: string;
  what: string;
}

/**
 * Is this person waiting on another participant here, with nothing on record clearing it?
 *
 * CLEARED is the only status that ends it. WAITING and BLOCKING are both still in the way, and the
 * difference between them is how hard, not whether.
 */
export function waitingOnSomebodyHere(rows: ADependencyOnSomebodyHere[]): ADependencyOnSomebodyHere[] {
  return (rows ?? []).filter((d) => !!d.onParticipantId && String(d.status).toUpperCase() !== 'CLEARED');
}

export interface WhetherToWriteIt {
  keep: boolean;
  /** Why not, for the log. Never shown to anybody: a refusal is not a finding either. */
  because?: string;
}

export function shouldThisCodeBeAboutThem(
  code: string,
  theirDependencies: ADependencyOnSomebodyHere[],
): WhetherToWriteIt {
  if (!NOT_ABOUT_THE_ONE_WAITING.has(code)) return { keep: true };
  const waiting = waitingOnSomebodyHere(theirDependencies);
  if (!waiting.length) return { keep: true };
  const names = waiting.slice(0, 3).map((d) => d.what).filter(Boolean).join(', ');
  return {
    keep: false,
    because: `they are waiting on another person here${names ? ` for ${names}` : ''}, and ${code} is a read about carrying your own work`,
  };
}
