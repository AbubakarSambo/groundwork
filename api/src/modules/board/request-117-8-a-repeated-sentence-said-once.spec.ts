import { boardAs } from './the-switchboards-sections-harness';
import { review5, REVIEW_5_PEOPLE, RUKIA_RUNS_IT, AMANI, BARAKA_M, NEEMA, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';
import { theNoteSaidOnce } from './each-repeated-sentence-said-once';

/**
 * SCREENS REQUEST 117 (8): EACH REPEATED SENTENCE IN THE FOLD IS SAID ONCE.
 *
 * Nobody's role was written down on "Sales team, Q3", so Rukia read "No position shown, because the role was never
 * clearly defined. ..." five times, and under "Where work is landing" the same two sentences four times. Each is now
 * said once for its section, with the people it is about named, and those rows carry it no more.
 */
const NO_ROLES = review5({ people: REVIEW_5_PEOPLE.map((p) => ({ ...p, roleAsDescribed: null })) });
const count = (served: string, sentence: RegExp) => (served.match(new RegExp(sentence.source, 'g')) ?? []).length;

describe('request 117 (8): a repeated sentence is said once', () => {
  it.each([['Rukia, who runs it', RUKIA_RUNS_IT], ['Grace, the admin who set it up', GRACE_SET_IT_UP]])('%s reads why no position is shown once, naming everybody', async (_who, reader) => {
    const b = await boardAs(NO_ROLES, reader[0], reader[1]);
    const served = JSON.stringify(b);
    expect(count(served, /the role was never clearly defined/)).toBe(0);
    expect(count(served, /because nobody's role was clearly defined/)).toBe(1);
    /* Rukia's own row is "you" (request 118, part 2); Grace, who does not check in, reads Rukia's name. */
    const rukia = reader[0] === RUKIA_RUNS_IT[0] ? 'you' : 'Rukia Otieno';
    expect(b.contributionSaysOnce).toBe(`No position is shown for ${rukia}, Amani Wekesa, Baraka Mwangi, Neema Achieng or Faraji Odhiambo, because nobody's role was clearly defined. Define what each role is responsible for before assessing anyone against it. An undefined role is often the real problem, not the person.`);
    expect((b.contribution as any[]).every((r) => r.note === null)).toBe(true);
  });

  it('Rukia reads where work is landing once, not once a person', async () => {
    const b = await boardAs(review5(), ...RUKIA_RUNS_IT);
    const served = JSON.stringify(b.coverage);
    expect(count(served, /Their responsibilities are staying with them/)).toBe(1);
    /* Her own work is "your work" (request 118, part 2). */
    expect(b.coverage.saysOnce[0]).toBe('Nobody has said anything about your work and the work of Amani Wekesa, Baraka Mwangi and Neema Achieng moving elsewhere.');
    expect((b.coverage.reads as any[]).every((r) => r.what === null && r.reasonText === null)).toBe(true);
  });

  it.each([['Amani', AMANI], ['Baraka', BARAKA_M], ['Neema', NEEMA], ['Juma, an admin who only reads', JUMA_READS]])('%s reads no sentence twice in these sections', async (_who, reader) => {
    for (const peersVisibleToEachOther of [true, false]) {
      const b = await boardAs({ ...NO_ROLES, peersVisibleToEachOther }, reader[0], reader[1]);
      const sentences = [...(b.contribution ?? []).map((r: any) => r.note), ...((b.coverage?.reads ?? []) as any[]).flatMap((r) => [r.what, r.reasonText])].filter(Boolean);
      expect(new Set(sentences).size).toBe(sentences.length);
    }
  });

  it('a line that is not their words says its kind, so the screen need not say it again', async () => {
    const b = await boardAs(review5({ turns: [] }), ...RUKIA_RUNS_IT);
    const items = (b.whoOwnsWhat as any[]).flatMap((r) => r.items ?? []);
    const progress = items.find((i: any) => /reported progress\.$/.test(i.text ?? ''));
    expect(progress?.itsKindIsSaid).toBe(true);
  });

  it('the sentence for one situation with no roles at all', () => {
    expect(theNoteSaidOnce('No position shown. This situation does not run against a role, so there is nothing to read anyone against.', ['A', 'B']))
      .toBe('No position is shown for anybody. This situation does not run against a role, so there is nothing to read anyone against.');
  });
});
