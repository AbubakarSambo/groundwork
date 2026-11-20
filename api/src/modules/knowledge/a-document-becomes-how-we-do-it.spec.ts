import { HowWeDoItService } from './how-we-do-it.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * A DOCUMENT BECOMING "HOW WE DO IT HERE".
 *
 * The last gap in reading somebody's account against the company's own process: the process had to
 * exist as a card, and the only way to make one was the machine API - so the whole thing worked for
 * a customer who had pushed their handbook in programmatically and for nobody else.
 */
const doc = {
  id: 'd1',
  fileName: 'How contracting works.pdf',
  content: 'Legal signs every contract.',
  ground: { id: 'g1', initiatorId: 'ceo', participants: [{ userId: 'ed' }] },
};

const svc = (over: { doc?: any; open?: any; proposal?: any } = {}) => {
  const written: any[] = [];
  const cards: any[] = [];
  const s = Object.create(HowWeDoItService.prototype) as any;
  s.logger = { log: () => {} };
  /* Approving goes through ingestDocument now (S7, 20 November): the one way a document is read, summarised and put on
     the Desk. It went through put, as one whole card with no summary. */
  s.knowledge = { ingestDocument: async (_o: string, c: any) => { cards.push(c); return {}; } };
  s.prisma = {
    groundDocument: { findFirst: async () => (over.doc === undefined ? doc : over.doc) },
    knowledgeProposal: {
      findFirst: async () => over.open ?? over.proposal ?? null,
      create: async (a: any) => { written.push(a.data); return { id: 'p1', createdAt: new Date() }; },
      update: async (a: any) => { written.push(a.data); return {}; },
      updateMany: async (a: any) => { written.push(a.data); return { count: over.proposal === null ? 0 : 1 }; },
      /* A real pending item, so the guard is what keeps it out of a non-admin's answer and not an
         empty queue. Without one this test passed against a service with no guard at all. */
      findMany: async () => [{ id: 'p9', createdAt: new Date(), document: { fileName: 'Pricing.pdf', content: 'x'.repeat(600) } }],
    },
    knowledgeCard: { findMany: async () => [{ key: 'k', title: 'T', body: 'B' }] },
  };
  return { s, written, cards };
};

describe('proposing', () => {
  it('a lead may, and it is recorded against them', async () => {
    const { s, written } = svc();
    await s.propose('org1', 'ed', 'LEAD', 'd1');
    expect(written[0].proposedById).toBe('ed');
    expect(written[0].documentId).toBe('d1');
  });

  it('somebody who only takes part may not', async () => {
    const { s } = svc();
    await expect(s.propose('org1', 'ed', 'MEMBER', 'd1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('and nobody may propose a document from a check-in they are not in', async () => {
    /* Otherwise proposing is a way to read a document you were never shown. */
    const { s } = svc();
    await expect(s.propose('org1', 'a-stranger', 'LEAD', 'd1')).rejects.toThrow(/not part of/);
  });

  it('asking twice does not open a second one', async () => {
    const { s, written } = svc({ open: { id: 'p0', createdAt: new Date('2026-01-01') } });
    const out = await s.propose('org1', 'ed', 'LEAD', 'd1');
    expect(out.alreadyOpen).toBe(true);
    expect(written).toHaveLength(0);
  });

  it('and a document with nothing readable in it is refused', async () => {
    const { s } = svc({ doc: { ...doc, content: '  ' } });
    await expect(s.propose('org1', 'ed', 'LEAD', 'd1')).rejects.toThrow(/nothing readable/);
  });
});

describe('deciding', () => {
  it('is the admin\'s, not the lead\'s', async () => {
    const { s } = svc({ proposal: { id: 'p1', document: doc } });
    await expect(s.approve('org1', 'ed', 'LEAD', 'p1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('approving makes a card through the same door the machine API uses', async () => {
    /* Two ways to make a card that behaved differently would be the drift this repository keeps
       fixing elsewhere. */
    const { s, cards } = svc({ proposal: { id: 'p1', document: doc } });
    const out = await s.approve('org1', 'admin', 'ADMIN', 'p1');
    expect(cards[0].text).toBe('Legal signs every contract.');
    expect(cards[0].key).toBe('how-contracting-works');
    expect(out.key).toBe('how-contracting-works');
  });

  it('declining keeps the reason, because a decision with no reason reads as a loss', async () => {
    const { s, written } = svc({ proposal: { id: 'p1' } });
    await s.decline('org1', 'admin', 'ADMIN', 'p1', 'This is a draft, not the process.');
    expect(written[0].declineReason).toBe('This is a draft, not the process.');
    expect(written[0].status).toBe('DECLINED');
  });
});

describe('reading', () => {
  it('everybody sees what the company says it does', async () => {
    /* A process people are held up against but cannot read is a hidden file, moved from the person
       to the document. */
    const { s } = svc();
    const out = await s.list('org1', 'MEMBER');
    expect(out.cards).toHaveLength(1);
  });

  it('and only an admin sees what is waiting on them', async () => {
    const { s } = svc();
    expect((await s.list('org1', 'MEMBER')).waiting).toEqual([]);
    expect((await s.list('org1', 'LEAD')).waiting).toEqual([]);
    expect((await s.list('org1', 'ADMIN')).waiting).toHaveLength(1);
  });

  it('and a waiting item shows enough to decide on, never the whole document', async () => {
    const { s } = svc();
    const [waiting] = (await s.list('org1', 'ADMIN')).waiting;
    expect(waiting.fileName).toBe('Pricing.pdf');
    expect(waiting.preview.length).toBeLessThanOrEqual(400);
  });
});
