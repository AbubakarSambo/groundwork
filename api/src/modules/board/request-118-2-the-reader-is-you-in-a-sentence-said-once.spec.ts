import { boardAs } from './the-switchboards-sections-harness';
import { review5, REVIEW_5_PEOPLE, RUKIA_RUNS_IT, AMANI, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';
import { eachRepeatedSentenceSaidOnce } from './each-repeated-sentence-said-once';

/**
 * REQUEST 118 (2): A SENTENCE SAID ONCE FOR SEVERAL PEOPLE SAYS "YOU" FOR THE READER.
 *
 * On "Sales team, Q3" Rukia read, about herself, "No position is shown for Rukia Otieno, Baraka Mwangi, a
 * colleague, Amani Wekesa or Neema Achieng ..." (`contributionSaysOnce`) and "... This is true of Rukia Otieno,
 * Baraka Mwangi, Amani Wekesa and Neema Achieng." (`coverage.saysOnce`). She now reads "you" in both. Anybody
 * who is not in the list, such as an admin who only reads, still reads her name.
 */
const NO_ROLES = review5({ people: REVIEW_5_PEOPLE.map((p) => ({ ...p, roleAsDescribed: null })) });

describe('request 118 (2): the reader is "you" in a sentence said once', () => {
  it('Rukia, who runs it, reads "you" and never her own name', async () => {
    const b = await boardAs(NO_ROLES, ...RUKIA_RUNS_IT);
    expect(b.contributionSaysOnce).toMatch(/^No position is shown for you, Amani Wekesa, /);
    expect(JSON.stringify([b.contributionSaysOnce, b.coverage?.saysOnce])).not.toMatch(/Rukia/);
  });

  it('Amani, who checks in, reads "you" for herself wherever she is in such a sentence', async () => {
    const b = await boardAs(NO_ROLES, ...AMANI);
    expect(JSON.stringify([b.contributionSaysOnce ?? null, b.coverage?.saysOnce ?? null])).not.toMatch(/Amani/);
  });

  it.each([['Juma, an admin who only reads', JUMA_READS], ['Grace, the admin who set it up', GRACE_SET_IT_UP]])('%s reads every name, and no "you"', async (_who, reader) => {
    const b = await boardAs(NO_ROLES, reader[0], reader[1]);
    expect(JSON.stringify([b.contributionSaysOnce ?? null, b.coverage?.saysOnce ?? null])).not.toMatch(/\byou\b/);
  });

  it('the "This is true of" form, built from the rows a reader is served', () => {
    const rows = [
      { participantId: 'p-rukia', name: 'Rukia Otieno', what: 'Nothing on record says what was handed over.', reasonText: 'So there is nothing to read into.' },
      { participantId: 'p-baraka', name: 'Baraka Mwangi', what: 'Nothing on record says what was handed over.', reasonText: 'So there is nothing to read into.' },
    ];
    const b = eachRepeatedSentenceSaidOnce({ myParticipantId: 'p-rukia', coverage: { reads: rows } } as any);
    expect(b.coverage.saysOnce).toEqual(['Nothing on record says what was handed over. This is true of you and Baraka Mwangi.', 'So there is nothing to read into.']);
  });
});
