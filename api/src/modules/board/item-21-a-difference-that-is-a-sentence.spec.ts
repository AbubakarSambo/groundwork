import { boardAs, answered, A_RELEASED_REPORT, AMINA, RUKIA, JUMA } from './the-switchboards-sections-harness';

/**
 * ITEM 21, THE GOVERNMENT PROGRAMME BOARD: A DIFFERENCE THAT IS A WHOLE SENTENCE IS SAID AS ONE.
 *
 * "The rollout across four branches" (local test database, 927dc43a): Stephen, who runs it, read on the
 * Differences tile "People said different things about Your reporting shows full system adoption, but
 * both branch leads describe that their teams still rely on the old system for certain tasks." and the
 * same after "about" among what needs deciding. "shows", "describe" and "rely" were not counted as verbs.
 */
const TOPIC = 'The reporting shows full system adoption, but both branch leads describe that their teams still rely on the old system for certain tasks';
const report = { ...A_RELEASED_REPORT, divergences: [{ topic: TOPIC, atStake: null, evidence: [], positions: [] }] };
const setup = { checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)], report };
const SAID = `People said different things. ${TOPIC}.`;

/* Expectations updated (Hafsah, 30 October 2026: plain language for an impatient first-time lead; a difference is said as what people said, with no "needs settling".) */
describe('a difference that is a whole sentence, as each reader reads it', () => {
  /*
   * Changed 24 November (page audit, row 6, approved by Hafsah): each finding is said once. The difference is said whole, as its
   * own sentence, where it stands with both sides; the Differences tile counts it and does not say it again.
   */
  it.each([['Amina, who runs it', AMINA], ['Rukia, who checks in, once it is shared', RUKIA], ['Juma, an admin', JUMA]])('%s reads it once, as its own sentence, and the tile does not repeat it', async (_w, reader) => {
    const b = await boardAs(setup as any, ...(reader as readonly [string, string]));
    const t = (b.quickRead ?? []).find((x: any) => x.label === 'Differences');
    expect(t.value).toBe('1');
    expect(t.sub).toBe('It has not been settled yet.');
    expect(t.sub).not.toContain(TOPIC);
    expect(JSON.stringify(b.quickRead)).not.toContain(SAID);
    expect(JSON.stringify(b.divergence ?? b)).toContain(TOPIC);
  });
  it('Amina reads it the same way among what needs deciding', async () => {
    const d = ((await boardAs(setup as any, ...AMINA)).decisions ?? []).find((x: any) => x.source === 'divergence');
    expect(d.question).toBe(`People in this check-in said different things. ${TOPIC}.`);
  });
});
