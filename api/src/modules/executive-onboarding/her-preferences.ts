/**
 * "STOP" AND "SLOW DOWN" (Fatima, increment 5; plan section 6 and the brief's item 6). She changes how Groundwork treats her by saying so, in
 * her own words on any channel, and what she said holds from then on:
 *
 *   "Stop"        nothing is sent to her by Groundwork until she says "carry on". What she sends is still kept.
 *   "Slow down"   nothing for three days, and after that only what really needs her.
 *   "Carry on"    back to normal.
 *
 * Those words are fixed because they control what is sent to her (the product's rule: fixed where something is sent or seen). Her quiet hours are the
 * hours in the one place quiet hours live (the email preference row), set to sensible hours when she is added and moved by that same row.
 * The hold is read by every sender of routine notes to her: the year-end owner and the answers to a batch.
 */
import { OK_I_AM_BACK, OK_I_HAVE_STOPPED, OK_I_WILL_SLOW_DOWN } from './the-words';

export const A_STOP = /^\s*(?:please\s+)?(?:stop|stop\s+(?:messaging|writing(?:\s+to)?|emailing)\s+me|that'?s\s+enough)\s*[.!]*\s*$/i;
export const A_SLOW_DOWN = /^\s*(?:please\s+)?(?:slow\s+down|too\s+many\s+messages|fewer\s+messages)\s*[.!]*\s*$/i;
export const A_CARRY_ON = /^\s*(?:carry\s+on|start\s+again|you\s+can\s+start\s+again|resume|back\s+to\s+normal)\s*[.!]*\s*$/i;

const THREE_DAYS = 3 * 86_400_000;

/** Whether she has asked for quiet, and it still holds. */
export function isHeldByHer(preferences: any, now: Date): boolean {
  if (preferences?.paused) return true;
  const until = preferences?.pausedUntil ? new Date(preferences.pausedUntil).getTime() : 0;
  return until > now.getTime();
}

export const isAboutHerQuiet = (message: string): boolean => A_STOP.test(message) || A_SLOW_DOWN.test(message) || A_CARRY_ON.test(message);

/** Applies what she said. Only she can change it, never the person who acts for her. Returns the reply, or null when it is not about this. */
export async function hearHerAboutQuiet(prisma: any, a: { organizationId: string; principalUserId: string; byPrincipal: boolean; first: string; message: string; now: Date }): Promise<string | null> {
  const stop = A_STOP.test(a.message);
  const slow = A_SLOW_DOWN.test(a.message);
  const back = A_CARRY_ON.test(a.message);
  if (!stop && !slow && !back) return null;
  if (!a.byPrincipal) return null;
  const setup: any = await prisma.principalSetup.findFirst({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } });
  if (!setup) return null;
  const preferences = { ...(setup.preferences ?? {}) };
  if (stop) { preferences.paused = true; preferences.pausedUntil = null; }
  else if (slow) { preferences.paused = false; preferences.pausedUntil = new Date(a.now.getTime() + THREE_DAYS).toISOString(); }
  else { preferences.paused = false; preferences.pausedUntil = null; }
  await prisma.principalSetup.update({ where: { id: setup.id }, data: { preferences } });
  return stop ? OK_I_HAVE_STOPPED(a.first) : slow ? OK_I_WILL_SLOW_DOWN(a.first) : OK_I_AM_BACK(a.first);
}

/** True when this person has asked for quiet. Read by the senders of routine notes. */
export async function hasSheAskedForQuiet(prisma: any, organizationId: string, principalUserId: string, now: Date): Promise<boolean> {
  const setup: any = await prisma.principalSetup?.findFirst?.({ where: { organizationId, principalUserId } }).catch(() => null);
  return !!setup && isHeldByHer(setup.preferences, now);
}
