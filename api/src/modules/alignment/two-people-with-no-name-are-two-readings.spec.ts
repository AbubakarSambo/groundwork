import { AgreementsService } from './agreements.service';

/**
 * TWO PEOPLE WITH NO NAME ARE TWO READINGS, NOT ONE SAID TWICE (review of 1678157c).
 * The reading is recorded under the person's name, and a person with no name is "Someone" now rather than their address. The check "said twice by the same
 * person" compared names, so the second nameless person's reading of a clause was dropped as a repeat of the first. It compares their rows now.
 */
function aService() {
  const term: any = { id: 't1', versionId: 'v1', reads: 'Payment within 30 days.', readDifferently: null };
  const prisma: any = {
    agreementVersion: { findFirst: jest.fn(async () => ({ id: 'v1' })) },
    agreementTerm: {
      findFirst: jest.fn(async () => term),
      update: jest.fn(async (a: any) => { Object.assign(term, a.data); return term; }),
    },
  };
  return { service: new AgreementsService(prisma), term };
}
const said = (reads: string) => ({ differences: [{ about: 'payment', reads, termId: 't1' }], notInTheDocument: [] });

describe('two people with no name, each reading a clause their own way', () => {
  it('keeps both readings', async () => {
    const { service, term } = aService();
    await service.whatTheyUnderstandItToBe('o', 'g', 'v1', 'Someone', said('Payment within 60 days.'), 'p1');
    await service.whatTheyUnderstandItToBe('o', 'g', 'v1', 'Someone', said('Payment on delivery.'), 'p2');
    expect(term.readDifferently.map((r: any) => r.reads)).toEqual(['Payment within 30 days.', 'Payment within 60 days.', 'Payment on delivery.']);
  });
  it('and the same person saying it twice is still one', async () => {
    const { service, term } = aService();
    await service.whatTheyUnderstandItToBe('o', 'g', 'v1', 'Someone', said('Payment within 60 days.'), 'p1');
    await service.whatTheyUnderstandItToBe('o', 'g', 'v1', 'Someone', said('Payment within 60 days, I think.'), 'p1');
    expect(term.readDifferently).toHaveLength(2);
  });
});
