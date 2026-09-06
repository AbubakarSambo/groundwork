/**
 * HOW A COMPANY REACHED US, FROM A LIST RATHER THAN A TEXT BOX.
 *
 * `sourceType` was free text, so "Google for Startups", "google for startups
 * network" and "GFS" are three sources and the question that matters — did that
 * network produce anything — cannot be asked. A network is worth attributing to
 * precisely because it produces MORE THAN ONE company, and counting is the whole
 * evidence for that.
 *
 * A NETWORK IS NOT A PERSON, AND BOTH ARE RECORDED. Somebody brought the
 * relationship with the network; the network brought the companies. Keeping
 * them apart is what lets "Google for Startups produced four" and "she opened
 * that door" both be true without either swallowing the other.
 *
 * Free text stays possible through `OTHER`, with the detail beside it. A closed
 * list that refuses reality just gets everything filed under whichever option is
 * nearest, which is worse than free text because it looks like data.
 */
export const WHERE_COMPANIES_COME_FROM = [
  { key: 'INTRODUCTION', label: 'A personal introduction' },
  { key: 'NETWORK_GOOGLE_FOR_STARTUPS', label: 'Google for Startups network' },
  { key: 'NETWORK_OTHER', label: 'Another network or programme' },
  { key: 'INBOUND', label: 'They came to us' },
  { key: 'OUTBOUND', label: 'We went to them' },
  { key: 'EVENT', label: 'An event' },
  { key: 'EXISTING_CLIENT', label: 'Someone we already work with' },
  { key: 'OTHER', label: 'Something else — say what' },
] as const;

export type WhereFrom = (typeof WHERE_COMPANIES_COME_FROM)[number]['key'];

export function isAKnownSource(key: string): boolean {
  return WHERE_COMPANIES_COME_FROM.some((s) => s.key === key);
}

/**
 * A network needs its detail, because a network with no detail is a shrug.
 *
 * "Another network" and "Something else" are the two options that carry no
 * meaning on their own — one of them is literally named for not being on the
 * list. Recorded without a sentence they produce a count of things nobody can
 * name, which reads as evidence and is not.
 */
export function whyThisSourceIsNotEnough(sourceType: string, sourceDetail?: string | null): string | null {
  const needsSaying = ['NETWORK_OTHER', 'OTHER'];
  if (needsSaying.includes(sourceType) && !sourceDetail?.trim()) {
    return 'Say which one. A network nobody can name is a count, not a source.';
  }
  return null;
}
