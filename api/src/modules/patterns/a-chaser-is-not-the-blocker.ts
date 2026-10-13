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

/*
 * ONLY A WAIT THE COLLEAGUE CONFIRMS HOLDS A CODE BACK (decision 137; decision 139, must-fix 4).
 *
 * Evaluation profile 5, October 2026. Kevin blamed a colleague in every one of his four sessions:
 * Fatuma for the final prices (she had sent them the same morning), Imani for photos (she had sent
 * them and asked him which were missing), Juma for shops (nobody had asked him). Each sentence was
 * kept as a `GroundDependency` row naming the colleague, uncleared, and this rule read those rows
 * and held B5, B11 and K3 back from him every week, as "a chaser". Blame Shifting could never be
 * written about the person shifting the blame, because the blame itself was the excuse the gate
 * accepted. So the rule now counts a wait only where the colleague it names has said, in their own
 * promise in this check-in, that the thing is theirs to give. The consultant who promised the same
 * meeting for three months is still a confirmed wait, and his client is still not read as all talk.
 */
import { theWaitIsConfirmed, TheirOwnPromise } from '../grounds/a-wait-is-the-speakers-account';

/** The codes whose whole signal is "you keep talking and it has not moved". */
export const NOT_ABOUT_THE_ONE_WAITING = new Set(['B5', 'B11', 'K3']);

export interface ADependencyOnSomebodyHere {
  /** The participant this person is waiting on. Only rows naming somebody IN this check-in count. */
  onParticipantId: string | null;
  groundId?: string | null;
  status: string;
  what: string;
  /** What they said they did to unblock it: an attempt on record confirms the wait. */
  triedSaid?: string | null;
}

/**
 * Is this person waiting on another participant here, with nothing on record clearing it?
 *
 * CLEARED is the only status that ends it. WAITING and BLOCKING are both still in the way, and the
 * difference between them is how hard, not whether.
 */
export function waitingOnSomebodyHere(rows: ADependencyOnSomebodyHere[], theirOwnPromises: TheirOwnPromise[] = []): ADependencyOnSomebodyHere[] {
  return (rows ?? []).filter((d) => !!d.onParticipantId && String(d.status).toUpperCase() !== 'CLEARED' && theWaitIsConfirmed(d, theirOwnPromises));
}

export interface WhetherToWriteIt {
  keep: boolean;
  /** Why not, for the log. Never shown to anybody: a refusal is not a finding either. */
  because?: string;
}

export function shouldThisCodeBeAboutThem(
  code: string,
  theirDependencies: ADependencyOnSomebodyHere[],
  /** The promises of the colleagues they wait on, in their own check-ins. Only these confirm a wait. */
  theColleaguesOwnPromises: TheirOwnPromise[] = [],
): WhetherToWriteIt {
  if (!NOT_ABOUT_THE_ONE_WAITING.has(code)) return { keep: true };
  const waiting = waitingOnSomebodyHere(theirDependencies, theColleaguesOwnPromises);
  if (!waiting.length) return { keep: true };
  const names = waiting.slice(0, 3).map((d) => d.what).filter(Boolean).join(', ');
  return {
    keep: false,
    because: `they are waiting on another person here${names ? ` for ${names}` : ''}, that person has said it is theirs to give, and ${code} is a read about carrying your own work`,
  };
}
