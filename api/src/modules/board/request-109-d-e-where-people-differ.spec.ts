import { boardAs, AMINA, RUKIA, JUMA, SETUP_ADMIN, A_RELEASED_REPORT, PEOPLE, person } from './the-switchboards-sections-harness';
import { labelsForParties } from '../reports/party-labels';

/**
 * SCREENS REQUEST 109 (d, e), "WHERE PEOPLE DIFFER" ON THE SALES BOARD, 2 OCTOBER 2026.
 *
 * (d) Rukia's side of a difference had an empty `view`, so her name was drawn with no words under it.
 * (e) "You and Rukia Otieno see this differently." was said of a difference four people held: the screen
 *     named the first two sides only.
 * Each difference now serves only the sides somebody said something for, and `whoSeesIt`, one sentence
 * naming every side once, in the names this reader is served.
 */
const MORE = [
  ...PEOPLE,
  person('p-neema', 'u-neema', 'Neema', 'Achieng'),
  person('p-amani', 'u-amani', 'Amani', 'Wekesa'),
];
const L = labelsForParties(MORE as any);
const REPORT = {
  ...A_RELEASED_REPORT,
  divergences: [{
    topic: 'Which shops to sign first',
    positions: [
      { participantLabel: L.get('p-amina')!, view: 'Supermarkets first, because they buy in bulk.' },
      { participantLabel: L.get('p-rukia')!, view: '' },
      { participantLabel: L.get('p-baraka')!, view: 'Hardware shops first, because they decide fast.' },
      { participantLabel: L.get('p-neema')!, view: 'Shops near the warehouse first.' },
      { participantLabel: L.get('p-amani')!, view: 'Kilimani shops first.' },
    ],
  }],
};
const setup = { people: MORE, report: REPORT, createdByUserId: 'u-setup' };

describe('where people differ', () => {
  it.each([['Amina, who runs it', AMINA], ['the admin who set it up', SETUP_ADMIN]])('%s reads no side with nothing in it, and everybody named once', async (_w, [u, r]) => {
    const b = await boardAs(setup, u, r);
    const item = b.divergence.items[0];
    expect(item.positions.map((p: any) => p.view)).not.toContain('');
    expect(item.positions).toHaveLength(4);
    expect(item.whoSeesIt).toMatch(/ and .* said different things about this\.$/);
    expect(item.whoSeesIt.split(',').length + 1).toBeGreaterThanOrEqual(4);
    expect(item.whoSeesIt).not.toMatch(/Rukia/);
  });

  it('Amina reads herself first, as "You"', async () => {
    const b = await boardAs(setup, ...AMINA);
    expect(b.divergence.items[0].whoSeesIt).toBe('You, Baraka Otieno, Neema Achieng and Amani Wekesa said different things about this.');
  });

  it('Juma, an admin who only reads, gets the same sides, with no empty one', async () => {
    const b = await boardAs(setup, ...JUMA);
    const items = b.divergence?.items ?? [];
    for (const it of items) expect(it.positions.map((p: any) => p.view)).not.toContain('');
  });

  it('Rukia, once the picture is shared, reads no empty side either', async () => {
    const b = await boardAs(setup, ...RUKIA);
    for (const it of b.divergence?.items ?? []) expect((it.positions ?? []).map((p: any) => p.view)).not.toContain('');
  });
});
