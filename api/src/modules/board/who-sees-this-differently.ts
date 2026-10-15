/**
 * WHO SEES A DIFFERENCE DIFFERENTLY, EVERYBODY NAMED ONCE (screens request 109 e).
 *
 * The screen wrote "You and Rukia Otieno see this differently." from the first two sides only, of a
 * difference four people held. This says it for every side, with the reader first as "you", in the
 * names this reader is already served. Where any side is a colleague the reader may not name, nobody is
 * listed, because two hidden people would both be "a colleague": "People see this differently."
 */
export function whoSeesThisDifferently(sides: (string | null | undefined)[], myName: string | null): string {
  const isMe = (w: string) => w === 'You' || (!!myName && w === myName);
  const named = [...new Set(sides.map((w) => (w ?? '').trim()).filter(Boolean))];
  if (named.length < 2) return 'This is seen differently.';
  if (named.some((w) => /colleague/i.test(w))) return 'People see this differently.';
  const ordered = [...named.filter(isMe).slice(0, 1).map(() => 'You'), ...named.filter((w) => !isMe(w))];
  const list = ordered.length === 2 ? `${ordered[0]} and ${ordered[1]}` : `${ordered.slice(0, -1).join(', ')} and ${ordered[ordered.length - 1]}`;
  return `${list} see this differently.`;
}
