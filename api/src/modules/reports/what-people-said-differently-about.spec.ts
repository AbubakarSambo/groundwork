import { peopleSaidDifferentThingsAbout } from './what-people-said-differently-about';
import { atAGlanceTiles } from './what-this-session-holds';

/** The Differences tile, as every reader of re-d (sales) read it in sessions 1 to 3. */
describe('the Differences tile says what people differed about in a sentence', () => {
  const base = { agreed: 0, movedOnTargets: null, blocked: 0, waiting: 0, backedPct: null, numberWasSaid: false };
  const differences = (topic: string, stillOpen: number) => atAGlanceTiles({ ...base, stillOpen, theDifference: topic } as any).find((t) => t.label === 'Differences')!.sub;

  it.each([
    ['The team is not aligned on the primary reason that applications are being held up.', 1,
      'People said different things. The team is not aligned on the primary reason that applications are being held up.'],
    ['The accounts differ on the primary cause of delays in the application process.', 2,
      'People said different things. The accounts differ on the primary cause of delays in the application process. 1 more difference is still open.'],
    ['The sum of the targets described in individual records is higher than the overall team target.', 2,
      'People said different things. The sum of the targets described in individual records is higher than the overall team target. 1 more difference is still open.'],
  ])('%s', (topic, open, says) => {
    expect(differences(topic, open)).toBe(says);
    expect(differences(topic, open)).not.toMatch(/about the (?:team|accounts|sum) /);
  });

  it('a topic that is a noun phrase still follows "about"', () => {
    expect(peopleSaidDifferentThingsAbout('Whether a price range counts as a budget')).toBe('People said different things about whether a price range counts as a budget.');
    expect(peopleSaidDifferentThingsAbout('The price list')).toBe('People said different things about the price list.');
  });
});
