import { boardAs } from './the-switchboards-sections-harness';
import { review5, REVIEW_5_COMMITMENTS, RUKIA_RUNS_IT, NEEMA, BARAKA_M, JUMA_READS, GRACE_SET_IT_UP } from './__fixtures__/sales-board-review-5';

/**
 * SCREENS REQUEST 130 (b): "WHO OWNS WHAT" SENT AISHA AN EMPTY LIST, though she committed in her check-in
 * to a photo of the delivery sheets. A promise said in a check-in is stored as its own row (GroundCommitment,
 * source CHECK_IN), and the panel read only record lines. Here Neema promises a photo in her check-in and has
 * no record line for it.
 */
const PHOTO = {
  ...REVIEW_5_COMMITMENTS[0], id: 'k-neema', participantId: 'p-neema',
  text: 'I will send a photo of the delivery sheets on Friday.', whenSaid: 'on Friday',
};
const withPhoto = (over: Record<string, any> = {}, more: Record<string, any> = {}) =>
  review5({ commitments: [...REVIEW_5_COMMITMENTS, { ...PHOTO, ...over }], ...more } as any);
const rowOf = (b: any, id: string) => ((b.whoOwnsWhat ?? []) as any[]).find((r) => r.participantId === id);
const texts = (row: any) => ((row?.items ?? []) as any[]).map((i) => i.text);

describe('request 130 (b): a promise made in a check-in is in "Who owns what"', () => {
  it.each([
    ['Rukia, who runs it', RUKIA_RUNS_IT],
    ['Grace, the admin who set it up', GRACE_SET_IT_UP],
    ['Juma, an admin who only reads', JUMA_READS],
  ])('%s reads Neema\'s promise in her words, after her name', async (_who, reader) => {
    const b = await boardAs(withPhoto(), reader[0], reader[1]);
    expect(texts(rowOf(b, 'p-neema'))).toContain('Neema Achieng said, "I will send a photo of the delivery sheets on Friday."');
  });

  it('Neema reads it as hers', async () => {
    const b = await boardAs(withPhoto(), NEEMA[0], NEEMA[1]);
    expect(texts(rowOf(b, 'p-neema'))).toContain('You said, "I will send a photo of the delivery sheets on Friday."');
  });

  it('where people do not see each other, Baraka is not sent Neema\'s promise', async () => {
    const b = await boardAs(withPhoto({}, { peersVisibleToEachOther: false }), BARAKA_M[0], BARAKA_M[1]);
    expect(JSON.stringify(b.whoOwnsWhat ?? [])).not.toContain('delivery sheets');
  });

  it('a promise not kept word for word is said without her words', async () => {
    const b = await boardAs(withPhoto({ saidWordForWord: false }), RUKIA_RUNS_IT[0], RUKIA_RUNS_IT[1]);
    expect(texts(rowOf(b, 'p-neema'))).toContain('Neema Achieng has made a commitment here.');
    expect(JSON.stringify(rowOf(b, 'p-neema'))).not.toContain('delivery sheets');
  });

  it('a dropped promise is not sent, and one already on record in the same words is not sent twice', async () => {
    const b = await boardAs(withPhoto({ status: 'DROPPED' }), RUKIA_RUNS_IT[0], RUKIA_RUNS_IT[1]);
    expect(JSON.stringify(rowOf(b, 'p-neema'))).not.toContain('delivery sheets');
    expect(texts(rowOf(b, 'p-amani')).filter((t: string) => t.includes('Tuskys cookers'))).toHaveLength(1);
  });
});
