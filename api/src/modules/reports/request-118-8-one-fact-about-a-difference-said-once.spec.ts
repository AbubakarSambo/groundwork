import { peopleSaidDifferentThingsAbout } from './what-people-said-differently-about';

/**
 * REQUEST 118, FROM REQUEST 117 (8): "PEOPLE SEE TWO THINGS DIFFERENTLY. PEOPLE SAID DIFFERENT THINGS."
 *
 * The Differences sentence (the quick read's `sub`, a session's Differences tile, the drafted picture) is built by
 * `peopleSaidDifferentThingsAbout` from the topic the report wrote. Where that topic only says people differ, the
 * fact was said twice. It is now said once. A topic with something in it reads as before.
 */
describe('request 118 (8): one fact about a difference is said once', () => {
  it.each([
    'People see two things differently.',
    'people see two things differently',
    'They see this differently',
    'The team said different things',
  ])('"%s" is said as one sentence', (topic) => {
    expect(peopleSaidDifferentThingsAbout(topic)).toBe('People said different things.');
  });

  it('a topic with something in it reads as before', () => {
    expect(peopleSaidDifferentThingsAbout('the price list')).toBe('People said different things about the price list.');
    expect(peopleSaidDifferentThingsAbout('The accounts differ on the primary cause of delays.')).toBe('People said different things. The accounts differ on the primary cause of delays.');
  });
});

import { boardAs, A_RELEASED_REPORT, AMINA, RUKIA, JUMA } from '../board/the-switchboards-sections-harness';

describe('request 118 (8): on the board, as each reader', () => {
  const report = { ...A_RELEASED_REPORT, sharedPicture: 'They disagree on people see two things differently.', divergences: [{ topic: 'People see two things differently.', positions: [] }] };
  it.each([['Amina, who runs it', AMINA], ['Rukia, who checks in', RUKIA], ['Juma, an admin who only reads', JUMA]])('%s never reads the fact twice', async (_who, [user, role]) => {
    const b = await boardAs({ report }, user, role);
    const served = JSON.stringify(b.quickRead ?? null);
    expect(served).not.toMatch(/People said different things\.? (about )?people see two things differently/i);
  });
});
