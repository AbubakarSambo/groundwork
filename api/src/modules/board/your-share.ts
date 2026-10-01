import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';

/**
 * YOUR SHARE, IN SENTENCES (request 107 c). The aim is already named for the reader ("You are aiming
 * for 3 shops in Kilimani."); this adds where it stands, in the reader's own words:
 *   an aim to reach:      "You are aiming for 3 shops in Kilimani. You have 1 of the 3 so far."
 *   a limit not to pass:  "You are keeping field visits to no more than 180,000. You are at 120,000 so far."
 *   nothing counted yet:  "... Nothing has been counted against it yet."
 */
export function theShareSays(name: string, count: number | null | undefined, target: number, direction?: string | null): string {
  const aim = /[.!?]$/.test((name ?? '').trim()) ? name.trim() : `${(name ?? '').trim()}.`;
  if (count == null || count === 0) return `${aim} Nothing has been counted against it yet.`;
  if (direction === 'LIMIT') return `${aim} You are at ${aNumberPeopleCanRead(count)} so far.`;
  return `${aim} You have ${aNumberPeopleCanRead(count)} of the ${aNumberPeopleCanRead(target)} so far.`;
}
