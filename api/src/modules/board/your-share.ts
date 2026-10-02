import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';

/** Said to a person who checks in and has no number of their own on the board (request 110 a). */
export const YOU_HAVE_NO_SHARE_YET = 'There is no number of yours on this board yet, so there is no share to show.';

/**
 * YOUR SHARE, IN SENTENCES (request 107 c). The aim is already named for the reader ("You are aiming
 * for 3 shops in Kilimani."); this adds where it stands, in the reader's own words:
 *   an aim to reach:      "You are aiming for 3 shops in Kilimani. You have 1 of the 3 so far."
 *   a limit not to pass:  "You are keeping field visits to no more than 180,000. You are at 120,000 so far."
 *   nothing counted yet:  "... Nothing has been counted against it yet."
 */
export function theShareSays(name: string, count: number | null | undefined, target: number, direction?: string | null): string {
  const aim = /[.!?]$/.test((name ?? '').trim()) ? name.trim() : `${(name ?? '').trim()}.`;
  if (direction === 'ZERO' && (count == null || count === 0)) return `${aim} There have been none so far, which is where it should stay.`;
  if (direction === 'DEADLINE' && (count == null || count === 0)) return `${aim} It is not done yet.`;
  if (count == null || count === 0) return `${aim} Nothing has been counted against it yet.`;
  if (direction === 'LIMIT') return `${aim} You are at ${aNumberPeopleCanRead(count)} so far.`;
  /* The other kinds, each in its own words (decision 75, item 17). */
  if (direction === 'RATE') return `${aim} You are at ${aNumberPeopleCanRead(count)}% so far.`;
  if (direction === 'ZERO') return `${aim} There ${count === 1 ? 'has been 1' : `have been ${aNumberPeopleCanRead(count)}`} so far, and any at all is a breach.`;
  if (direction === 'DEADLINE') return `${aim} ${count >= (target > 0 ? target : 1) ? 'It is done.' : 'It is not done yet.'}`;
  return `${aim} You have ${aNumberPeopleCanRead(count)} of the ${aNumberPeopleCanRead(target)} so far.`;
}
