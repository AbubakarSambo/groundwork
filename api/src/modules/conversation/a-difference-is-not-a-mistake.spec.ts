import { ConversationService } from './conversation.service';

/**
 * WHERE SOMEBODY'S ACCOUNT OF A PROCESS AND THE COMPANY'S WRITTEN ONE DIFFER.
 *
 * The durable half of asking somebody to walk you through something. Without it the difference is
 * noticed in the moment and gone - buried in a transcript the next session reads six entries of.
 *
 * The thing this must never become is a mark. A written process nobody has updated since March is
 * at least as likely to be the wrong one, and where nobody ever told them, the finding belongs to
 * whoever should have.
 */
const cards = [{ key: 'contracting', title: 'How contracting works', body: 'Legal signs every contract.' }];

const svc = (over: { differences?: any[]; cards?: any[]; said?: string } = {}) => {
  const written: any[] = [];
  const s = Object.create(ConversationService.prototype) as any;
  s.logger = { warn: () => {} };
  /* `covering` rather than `retrieve`: a conversational turn needs the card-side match, not the
     query-side one the assistant uses. See `what-they-said-touches-this.spec.ts`. */
  s.knowledge = { covering: async () => over.cards ?? cards };
  s.anthropic = { extract: async () => ({ differences: over.differences ?? [] }) };
  s.prisma = {
    conversationTurn: { findMany: async () => [{ content: over.said ?? 'x'.repeat(400) }] },
    ground: { findUnique: async () => ({ organizationId: 'org1' }) },
    recordEntry: { create: async (a: any) => { written.push(a.data); return {}; } },
  };
  return { s, written };
};

const difference = (over: any = {}) => ({
  about: 'contracting',
  theirAccount: 'I send the contract to the client myself',
  whatIsWritten: 'Legal signs every contract',
  ...over,
});

describe('what gets written down', () => {
  it('both sides of the difference, in one entry', async () => {
    /* One side alone reads as a quote or as a correction. The difference is the thing. */
    const { s, written } = svc({ differences: [difference()] });
    await s.extractOperatingDifferences('c1', 'ed', 'g1');
    expect(written[0].text).toContain('I send the contract to the client myself');
    expect(written[0].text).toContain('Legal signs every contract');
  });

  it('and says the written one may be the wrong one', async () => {
    const { s, written } = svc({ differences: [difference()] });
    await s.extractOperatingDifferences('c1', 'ed', 'g1');
    expect(written[0].text).toContain('may be out of date');
    expect(written[0].text).not.toMatch(/\b(wrong|incorrect|does not understand|gap in)\b/i);
  });

  /*
   * AND IT IS READ AS SENTENCES, NOT AS A ROW JOINED WITH COLONS. (Task 1.4, 26 September 2026.)
   *
   * What a person used to read here: "On contracting, they described: I send the contract to the
   * client myself. What is written here: Legal signs every contract." Two colon joins and a
   * fragment in front. The tests above all passed on that, because they check that both halves are
   * present and that nothing accuses anybody - which was true. This one checks the shape of the
   * sentence a person actually reads.
   */
  it('reads as whole sentences, with nothing joined by a colon', async () => {
    const { s, written } = svc({ differences: [difference({ about: 'This is about how a contract gets signed.' })] });
    await s.extractOperatingDifferences('c1', 'ed', 'g1');
    const text: string = written[0].text;
    expect(text).not.toContain(':');
    expect(text.startsWith('This is about how a contract gets signed.')).toBe(true);
    expect(text).toContain('This is what they described.');
    expect(text).toContain('This is what the written process says.');
    /* Every sentence starts with a capital letter, which a fragment after a colon does not. */
    for (const sentence of text.split(/(?<=\.)\s+/).filter(Boolean)) {
      expect(sentence[0]).toBe(sentence[0].toUpperCase());
    }
  });

  it('points a never-told difference at whoever should have told them', async () => {
    const { s, written } = svc({ differences: [difference({ neverTold: true })] });
    await s.extractOperatingDifferences('c1', 'ed', 'g1');
    expect(written[0].text).toContain('who should have');
  });

  it('groups the theme across sessions by the card it came from', async () => {
    /* `dimensionThreadKey` was built for exactly this and nothing has ever written to it. */
    const { s, written } = svc({ differences: [difference()] });
    await s.extractOperatingDifferences('c1', 'ed', 'g1');
    expect(written[0].dimensionThreadKey).toBe('contracting');
  });

  it('into the person\'s own record, like every other entry', async () => {
    const { s, written } = svc({ differences: [difference()] });
    await s.extractOperatingDifferences('c1', 'ed', 'g1');
    expect(written[0].participantId).toBe('ed');
    expect(written[0].type).toBe('OPERATING_DIFFERENCE');
  });
});

describe('when it does not run at all', () => {
  it('when the company has written nothing down', async () => {
    const { s, written } = svc({ cards: [], differences: [difference()] });
    await s.extractOperatingDifferences('c1', 'ed', 'g1');
    expect(written).toHaveLength(0);
  });

  it('when barely anything was said', async () => {
    const { s, written } = svc({ said: 'Yes, fine.', differences: [difference()] });
    await s.extractOperatingDifferences('c1', 'ed', 'g1');
    expect(written).toHaveLength(0);
  });

  it('when nothing differed, which is the usual answer', async () => {
    const { s, written } = svc({ differences: [] });
    await s.extractOperatingDifferences('c1', 'ed', 'g1');
    expect(written).toHaveLength(0);
  });

  it('and when a difference is missing half of itself', async () => {
    const { s, written } = svc({ differences: [difference({ whatIsWritten: '' })] });
    await s.extractOperatingDifferences('c1', 'ed', 'g1');
    expect(written).toHaveLength(0);
  });
});
