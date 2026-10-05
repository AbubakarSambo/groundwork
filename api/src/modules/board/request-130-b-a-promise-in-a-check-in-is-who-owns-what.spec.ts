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

  /* Changed after review: a promise not kept word for word is said in our voice, never as an empty "has made a commitment here". */
  it('a promise not kept word for word is said in our voice, to the lead and to Neema', async () => {
    const lead = await boardAs(withPhoto({ saidWordForWord: false }), RUKIA_RUNS_IT[0], RUKIA_RUNS_IT[1]);
    expect(texts(rowOf(lead, 'p-neema'))).toContain('Neema Achieng committed to send a photo of the delivery sheets on Friday.');
    expect(JSON.stringify(rowOf(lead, 'p-neema'))).not.toMatch(/has made a commitment here|"I will send/);
    const neema = await boardAs(withPhoto({ saidWordForWord: false }), NEEMA[0], NEEMA[1]);
    expect(texts(rowOf(neema, 'p-neema'))).toContain('You committed to send a photo of the delivery sheets on Friday.');
  });

  it('a promise not said in the person\'s own name (explicit false) is not sent', async () => {
    const b = await boardAs(withPhoto({ explicit: false }), RUKIA_RUNS_IT[0], RUKIA_RUNS_IT[1]);
    expect(JSON.stringify(rowOf(b, 'p-neema') ?? {})).not.toContain('delivery sheets');
  });

  it('Amani\'s promise stored in other words than her record line is one line, not two', async () => {
    const commitments = REVIEW_5_COMMITMENTS.map((c: any) => (c.id === 'k-amani' ? { ...c, text: 'Deliver the Tuskys cookers on 9 October.', saidWordForWord: false } : c));
    for (const reader of [RUKIA_RUNS_IT, GRACE_SET_IT_UP, JUMA_READS]) {
      const b = await boardAs(review5({ commitments } as any), reader[0], reader[1]);
      const row = texts(rowOf(b, 'p-amani'));
      expect(row.filter((t: string) => /Tuskys cookers|has made a commitment here/.test(t))).toEqual(['Amani Wekesa said, "I will deliver the Tuskys cookers on 9 October."']);
    }
  });

  it('a dropped promise is not sent, and one already on record in the same words is not sent twice', async () => {
    const b = await boardAs(withPhoto({ status: 'DROPPED' }), RUKIA_RUNS_IT[0], RUKIA_RUNS_IT[1]);
    expect(JSON.stringify(rowOf(b, 'p-neema'))).not.toContain('delivery sheets');
    expect(texts(rowOf(b, 'p-amani')).filter((t: string) => t.includes('Tuskys cookers'))).toHaveLength(1);
  });
});
