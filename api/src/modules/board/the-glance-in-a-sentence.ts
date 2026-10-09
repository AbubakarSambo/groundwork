/**
 * WHAT IS IN THE WAY, IN FULL SENTENCES (request 134 item 6). The header put a count and a name together in the screen
 * ("1 thing is in the way, the oldest being the tax view, waiting since 29 September."), which said "the oldest" of one
 * thing and did not say who waits. The engine says it, to this reader, from the Blockers list they are served:
 *   "One thing is in the way. You have been waiting for the tax view since 29 September."
 *   "Amani Wekesa has been waiting for the tax view since 29 September."
 *   "2 things are in the way. The one waiting longest is the tax view, since 29 September."
 */
export interface AListedBlocker { who?: string | null; name?: string | null; raised?: { firstRaisedAt?: string | null } | null }

const bare = (s: string) => s.trim().replace(/^["“](.*)["”]$/, '$1').replace(/[.!?]+$/, '');

/**
 * A WORRY ON RECORD IS NOT "NOTHING IS IN THE WAY" (B-165). Esther said three shops were waiting on a credit decision and she could not
 * move them until it came back; the worry was on record, no wait row was, and the board read "Nothing is in the way." Where there are
 * no listed blockers but worries are on record, the sentence says both facts.
 */
export function theGlanceInASentence(blockers: AListedBlocker[], dayOf: (iso: string) => string | null, worries = 0): string {
  const n = blockers.length;
  if (n === 0 && worries > 0) return `No wait is listed against a named person, but ${worries === 1 ? '1 worry is' : `${worries} worries are`} on record.`;
  if (n === 0) return 'Nothing is in the way.';
  const dated = [...blockers].filter((b) => b.raised?.firstRaisedAt).sort((a, b) => String(a.raised!.firstRaisedAt).localeCompare(String(b.raised!.firstRaisedAt)));
  const oldest = dated[0] ?? blockers[0];
  const thing = oldest.name ? bare(String(oldest.name)) : '';
  const since = oldest.raised?.firstRaisedAt ? dayOf(String(oldest.raised.firstRaisedAt)) : null;
  if (n === 1) {
    if (!thing) return 'One thing is in the way.';
    const who = (oldest.who ?? '').trim();
    const subject = who === 'You' ? 'You have' : who ? `${who} has` : 'Somebody has';
    return `One thing is in the way. ${subject} been waiting for ${thing}${since ? ` since ${since}` : ''}.`;
  }
  if (!thing) return `${n} things are in the way.`;
  return `${n} things are in the way. The one waiting longest is ${thing}${since ? `, since ${since}` : ''}.`;
}
