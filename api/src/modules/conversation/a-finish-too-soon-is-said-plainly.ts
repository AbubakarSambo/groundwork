import { WANTS_OUT } from './close-readiness';

/** Leaving with nothing said yet: nothing is closed, and nothing is asked. A person may finish at any point once anything is said. */
export const NOTHING_KEPT_YET_COME_BACK = 'Thanks. That is not quite enough to keep this check-in yet, so it stays open, and you can add more whenever you are ready.';

/** Nothing at all was said: every message is only the leaving words, or a few characters ("I am done", "ok"). */
export function nothingRealWasSaid(theirTurns: string[]): boolean {
  const g = new RegExp(WANTS_OUT.source, WANTS_OUT.flags.includes('g') ? WANTS_OUT.flags : `${WANTS_OUT.flags}g`);
  return theirTurns.every((t) => (t ?? '').replace(g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().length < 12);
}
