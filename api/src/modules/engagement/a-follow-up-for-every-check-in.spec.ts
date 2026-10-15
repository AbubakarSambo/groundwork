import { theNudgeLineFor, theirPromiseToFollowUp } from './a-follow-up-from-their-own-record';
import { itFollowsUpTheirPromise } from '../whatsapp/what-goes-to-a-phone';
import { ENGAGEMENT_MOMENT_KEY as RELEASE_MOMENT_KEY } from './the-engagement-release-moment';

/**
 * THE FOLLOW-UP FOR EVERY CHECK-IN (decision 109 item 10), AS VERA READS IT.
 *
 * Vera is in "Sales team, Q4", an ordinary check-in, not the anchor's. She said she would send her manager the deck.
 * Omar, in the same check-in, said he would call the client; the lead wrote a promise of her own. The release was on
 * 1 October. A session that began after it follows Vera up with her own words, and only hers. A session that began
 * before the release, which is what the existing clients have, is left exactly as it was.
 */
const RELEASE = new Date('2026-10-01T00:00:00Z');
const BEFORE = new Date('2026-09-20T00:00:00Z');
const AFTER = new Date('2026-10-05T00:00:00Z');

function world() {
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async ({ where }: any) => (where.key === RELEASE_MOMENT_KEY ? { value: { at: RELEASE.toISOString() } } : null)) },
    groundCommitment: {
      findMany: jest.fn(async () => [
        { text: 'The lead wants the pricing deck sent.', explicit: true, participantId: 'p-vera', source: 'LEAD_NOTE', status: 'UNKNOWN' },
        { text: 'I will call the client on Friday', explicit: true, participantId: 'p-omar', source: 'CHECK_IN', status: 'UNKNOWN' },
        { text: 'I will send my manager the deck', explicit: true, participantId: 'p-vera', source: 'CHECK_IN', status: 'UNKNOWN' },
      ]),
    },
  };
  return prisma;
}
const ground = { id: 'g1', startedFrom: null };

describe('Vera, in an ordinary check-in that began after the release', () => {
  it('is followed up in her own words, by email', async () => {
    const line = await theNudgeLineFor(world(), ground, AFTER, 'p-vera');
    expect(line).toBe("You mentioned you would send your manager the deck. I'd love to hear how it went.");
  });

  it('and on WhatsApp, with the template, saying only her promise', async () => {
    const promise = await theirPromiseToFollowUp(world(), ground, AFTER, 'p-vera');
    const m = itFollowsUpTheirPromise({ firstName: 'Vera', label: 'Sales team, Q4' }, promise!);
    expect(m.text).toBe("Hi Vera, last time you said you would send your manager the deck. I'd love to hear how it went. Your check-in for Sales team, Q4 is open, and you can answer here.");
    expect(m.text).not.toMatch(/Omar|call the client|pricing deck|lead wants/i);
  });

  it('never reads anybody else\'s promise, and a person with none gets the ordinary chase', async () => {
    const none = world();
    none.groundCommitment.findMany = jest.fn(async () => [{ text: 'I will call the client', explicit: true, participantId: 'p-omar', source: 'CHECK_IN', status: 'UNKNOWN' }]);
    expect(await theirPromiseToFollowUp(none, ground, AFTER, 'p-vera')).toBeNull();
    expect(await theNudgeLineFor(none, ground, AFTER, 'p-vera')).toBeNull();
  });
});

describe('an existing client, whose session began before the release', () => {
  it('is not followed up, by email or on WhatsApp', async () => {
    expect(await theNudgeLineFor(world(), ground, BEFORE, 'p-vera')).toBeNull();
    expect(await theirPromiseToFollowUp(world(), ground, BEFORE, 'p-vera')).toBeNull();
  });
  it('and a session with no known start is left alone', async () => {
    expect(await theirPromiseToFollowUp(world(), ground, null, 'p-vera')).toBeNull();
  });
});
