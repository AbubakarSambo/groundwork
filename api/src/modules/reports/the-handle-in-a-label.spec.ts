import { handleOf, withNames } from './party-labels';

/** 20 Sep 2026: Tunde's own report called him "the Engagement Director" and captioned Funmi's side with her whole self-description, in capitals. */
describe('the handle in a label', () => {
  const funmi = 'Managing Partner of Sable Behavioural, a behavioural science firm working across Africa. I hired the new Engagement Director.';
  const tunde = 'Engagement Director at Sable Behavioural. I bring in research projects and interventions and build relationships.';

  it('is the role phrase, not the paragraph', () => {
    expect(handleOf(funmi)).toBe('Managing Partner');
    expect(handleOf(tunde)).toBe('Engagement Director');
    expect(handleOf('Trader in Kano. I took a loan for a cold store for tomatoes and pepper.')).toBe('Trader');
    expect(handleOf('I am the loan officer at Tijara Finance')).toBe('loan officer');
  });

  it("the reader's own role, as the model shortened it, becomes you", () => {
    const out = withNames(
      "Both accounts describe the Engagement Director's time as spent on panels. The Engagement Director has not followed up the telco.",
      new Map(),
      [funmi, tunde],
      { viewerLabel: tunde },
    );
    expect(out).toBe('Both accounts describe your time as spent on panels. You have not followed up the telco.');
  });

  it('a paragraph-long label the reader may not resolve prints as its handle', () => {
    const out = withNames(`${funmi} expects two large projects.`, new Map(), [funmi, tunde], { viewerLabel: tunde });
    expect(out).toBe('Managing Partner expects two large projects.');
  });
});

/**
 * A LABEL THAT ENDS IN A FULL STOP. The Harvestline sales manager's role read "...some on 60-day
 * credit." and the resolver's word boundary never matched after the stop, so her whole role stood
 * in her own report where "you" belonged (smoke run 7, 21 Sep 2026).
 */
describe('a label that ends in a full stop still resolves', () => {
  const { withNames } = require('./party-labels');
  const label = 'Sales manager for Harvestline, an agri-inputs distributor. My team of four sells fertiliser to agro-dealers, some on 60-day credit.';
  const stripped = label.replace(/\.$/, '');
  it('to a name for a reader who may see it', () => {
    expect(withNames(`${stripped} said this was for: N180m.`, new Map([[label, 'Ngozi Okafor']]), [label])).toBe('Ngozi Okafor said this was for: N180m.');
  });
  it('and to "you" for the reader themselves', () => {
    expect(withNames(`${stripped} said this was for: N180m.`, new Map(), [label], { viewerLabel: label })).toBe('You said this was for: N180m.');
  });
});
