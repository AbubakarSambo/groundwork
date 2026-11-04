import { AssistantService } from './assistant.service';

/**
 * DECISION 50, TASK A: A DOCUMENT'S NUMBERS, SAID BACK AND SAVED ONLY ON A YES, THROUGH ASK
 * GROUNDWORK.
 *
 * The gap (found 30 Sep 2026): `DocumentsService.whatItHolds` reads a document and keeps what it
 * found on `holds.waiting`, with the owner already resolved, and writes nothing - see
 * a-document-is-read-not-agreed. The old context chat and the check-in conversation each have their
 * own moment to say that back and ask; through Ask Groundwork nothing ever said the numbers back, so
 * they could never be confirmed and never be written.
 *
 * Same discipline as the other decision-50 specs: the write itself is tested through
 * `write-a-documents-numbers.spec.ts`'s own unit; what is tested HERE is that Ask Groundwork parks
 * the right proposal, says the numbers back by name before anything is written, and that a yes and a
 * no do exactly what they say - through the real prisma calls, faked rather than the database
 * underneath them.
 */
function svc(opts: {
  person?: any;
  parked?: any;
  participants?: any[];
  docs?: any[];
  objectives?: any[];
  createMany?: jest.Mock;
  docFindFirst?: any;
} = {}) {
  const proposals: any[] = [];
  const created: any[] = [];
  const participants = opts.participants ?? [{ id: 'part-me', groundId: 'g1' }];
  const docs = opts.docs ?? [];

  const createMany = opts.createMany ?? jest.fn(async ({ data }: any) => { created.push(...data); return { count: data.length }; });

  const prisma: any = {
    person: {
      findFirst: jest.fn(async () => ({ id: 'p1', externalId: 'u-1', active: true, linkedUserId: 'lead-1', ...(opts.person ?? {}) })),
    },
    groundParticipant: {
      findMany: jest.fn(async () => participants),
      findFirst: jest.fn(async () => participants[0] ?? null),
    },
    groundDocument: {
      findMany: jest.fn(async () => docs),
      findFirst: jest.fn(async () => (opts.docFindFirst !== undefined ? opts.docFindFirst : docs[0] ?? null)),
      update: jest.fn(async () => ({})),
    },
    groundObjective: {
      findMany: jest.fn(async () => opts.objectives ?? []),
      createMany,
    },
    groundContextItem: { create: jest.fn(async () => ({})) },
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })) },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: 'pr1', state: 'PARKED', ...data }; proposals.push(p); return p; }),
      update: jest.fn(async ({ where, data }: any) => { proposals.push({ id: where.id, ...data }); return data; }),
    },
    commitment: { create: jest.fn(async () => ({})), findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const knowledge: any = { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) };
  const engine: any = { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) };
  const groundsService: any = {
    addContextLine: jest.fn(), addLeadContext: jest.fn(),
    questionsForPeople: jest.fn(async () => []), confirmQuestionForPerson: jest.fn(), declineQuestionForPerson: jest.fn(),
    shareLeadContext: jest.fn(), changeContextLine: jest.fn(),
    contextChat: jest.fn(), applyContextProposal: jest.fn(),
  };

  const service = new AssistantService(
    prisma,
    engine,
    knowledge,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('no suggestions in these tests'); } } as any,
    { start: async () => { throw new Error('no drafting in these tests'); } } as any,
    { forPerson: async () => { throw new Error('no assembly in these tests'); } } as any,
    { read: async () => ({ read: false, because: 'no reading in these tests' }) } as any,
    { sendRoundDigest: async () => { throw new Error('no mail in these tests'); } } as any,
    groundsService,
  );
  return { service, prisma, proposals, created };
}

const A_DOC = {
  id: 'doc-1',
  fileName: 'Q4 targets.xlsx',
  groundId: 'g1',
  visibility: 'OWN',
  holds: {
    fileName: 'Q4 targets.xlsx',
    whatItIs: 'A Q4 sales target sheet.',
    forOnePerson: [{ who: 'Dayo Adebayo', what: 'Q3 sales', target: 45_000_000, by: null }],
    forEverybody: [{ what: 'New dealers', target: 12, kind: 'to reach', by: null }],
    dates: [],
    unmatched: [],
    waiting: [
      { name: 'Q3 sales', target: 45_000_000, ownerParticipantId: 'part-dayo' },
      { name: 'New dealers', target: 12, ownerParticipantId: null },
    ],
    takenAt: null,
  },
};

describe('a document\'s numbers, said back through Ask Groundwork', () => {
  it('are said back with names before anything is written', async () => {
    const { service, prisma, created } = svc({ docs: [A_DOC] });
    const reply = await service.respond('org-a', 'p1', "I've uploaded it");

    expect(reply.lane).toBe('add_a_document');
    const said = (reply.blocks[0] as any).body as string;
    expect(said).toContain('Here is what I took from Q4 targets.xlsx');
    expect(said).toContain("Dayo Adebayo's target for Q3 sales is 45m.");
    expect(said).toContain('For everyone in this check-in, the target for New dealers is 12.');
    expect(said).toContain('Shall I record these numbers on this check-in?');
    /* The yes also writes a note everyone reads, so it is said before the yes, and it is true. */
    expect(said).toContain('If you say yes, I will also add a note that everyone on this check-in can read. The note will read “The numbers on this check-in come from a document the person running it added.”');
    expect(said).not.toContain('when it was set up');
    /* A proposal block carries the same words, for the panel's yes/no. */
    expect(reply.blocks.some((b: any) => b.type === 'proposal')).toBe(true);
    /* Nothing written yet. */
    expect(prisma.groundObjective.createMany).not.toHaveBeenCalled();
    expect(created).toEqual([]);
  });

  it('a yes writes the rows, with the right ownerParticipantId per person and null for the team', async () => {
    const parked = { id: 'pr1', kind: 'document_numbers', payload: { documentId: 'doc-1', groundId: 'g1', fileName: 'Q4 targets.xlsx' } };
    const { service, created } = svc({ parked, docs: [A_DOC], participants: [{ id: 'part-me', groundId: 'g1' }] });
    const reply = await service.respond('org-a', 'p1', 'yes');

    expect(created).toEqual([
      expect.objectContaining({ name: 'Q3 sales', target: 45_000_000, ownerParticipantId: 'part-dayo' }),
      expect.objectContaining({ name: 'New dealers', target: 12, ownerParticipantId: null }),
    ]);
    expect((reply.blocks[0] as any).body).toContain('I have recorded this from Q4 targets.xlsx.');
  });

  it('a yes writes the very note the say-back showed, and names the file only when everyone may open it', async () => {
    for (const [visibility, note] of [
      ['OWN', 'The numbers on this check-in come from a document the person running it added.'],
      ['OPEN', 'The numbers on this check-in come from Q4 targets.xlsx.'],
    ] as const) {
      const doc = { ...A_DOC, visibility };
      const asked = svc({ docs: [doc] });
      const said = ((await asked.service.respond('org-a', 'p1', "I've uploaded it")).blocks[0] as any).body as string;
      expect(said).toContain(`The note will read “${note}”`);
      const parked = { id: 'pr1', kind: 'document_numbers', payload: { documentId: 'doc-1', groundId: 'g1', fileName: 'Q4 targets.xlsx' } };
      const yes = svc({ parked, docs: [doc], participants: [{ id: 'part-me', groundId: 'g1' }] });
      await yes.service.respond('org-a', 'p1', 'yes');
      const written = (yes.prisma.groundContextItem.create as jest.Mock).mock.calls.map((c: any[]) => c[0].data);
      expect(written).toEqual([expect.objectContaining({ text: note, audience: 'EVERYONE' })]);
    }
  });

  it('a no writes nothing', async () => {
    const parked = { id: 'pr1', kind: 'document_numbers', payload: { documentId: 'doc-1', groundId: 'g1', fileName: 'Q4 targets.xlsx' } };
    const { service, prisma, created } = svc({ parked, docs: [A_DOC] });
    const reply = await service.respond('org-a', 'p1', 'no');

    expect(created).toEqual([]);
    expect(prisma.groundObjective.createMany).not.toHaveBeenCalled();
    expect((reply.blocks[0] as any).body).toBe('I have left it as it was. Nothing was recorded.');
    expect(prisma.assistantProposal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'DECLINED' }) }),
    );
  });

  it('a second yes does not write twice', async () => {
    /* The first yes already stamped takenAt - the document read fresh at execution shows it taken. */
    const takenDoc = { ...A_DOC, holds: { ...A_DOC.holds, takenAt: '2026-09-30T00:00:00.000Z' } };
    const parked = { id: 'pr1', kind: 'document_numbers', payload: { documentId: 'doc-1', groundId: 'g1', fileName: 'Q4 targets.xlsx' } };
    const { service, prisma, created } = svc({ parked, docFindFirst: takenDoc });
    const reply = await service.respond('org-a', 'p1', 'yes');

    expect(created).toEqual([]);
    expect(prisma.groundObjective.createMany).not.toHaveBeenCalled();
    expect((reply.blocks[0] as any).body).toBe('Those numbers are already recorded, so I have not written them a second time.');
  });

  it("never reaches a colleague's document - only this person's own participant ids are read", async () => {
    const { service, prisma } = svc({ docs: [], participants: [{ id: 'part-me', groundId: 'g1' }, { id: 'part-me-2', groundId: 'g2' }] });
    await service.respond('org-a', 'p1', "I've uploaded it");
    const call = (prisma.groundDocument.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.participantId.in).toEqual(['part-me', 'part-me-2']);
  });

  it('nothing to say when there is no document waiting - falls through to the ordinary answer', async () => {
    const { service, prisma } = svc({ docs: [] });
    /* No waiting document, so nothing is parked and the message is answered as usual. */
    await service.respond('org-a', 'p1', "I've uploaded it");
    expect(prisma.assistantProposal.create).not.toHaveBeenCalled();
  });
});

describe('a link to a document is not the document (B-027)', () => {
  it('is told the link is not read, and is never shown another file\'s numbers or asked to record them', async () => {
    const { service, prisma, created } = svc({ docs: [A_DOC] });
    const reply = await service.respond('org-a', 'p1', 'Here is a document https://docs.google.com/document/d/abc123/edit for Sales team, Q4');
    const said = (reply.blocks[0] as any).body as string;
    expect(said).toBe('I cannot open a link to a document, so I have not read it and nothing has been added. Upload the file itself, or paste the words from it here, and I will read it.');
    expect(said).not.toContain('Q4 targets.xlsx');
    expect(reply.blocks.some((b: any) => b.type === 'proposal')).toBe(false);
    expect(created).toEqual([]);
    expect(prisma.groundObjective.createMany).not.toHaveBeenCalled();
  });
});

describe('only the document just added (26 October 2026)', () => {
  it('Grace adds a photo after a PDF: Ask does not offer the PDF\'s numbers in its place', async () => {
    const PHOTO = { id: 'doc-photo', fileName: 'mpesa.jpg', groundId: 'g1', visibility: 'OWN', content: 'An M-Pesa message.', holds: null, createdAt: new Date() };
    const { service, prisma } = svc({ docs: [PHOTO, A_DOC] });
    /* The fake honours take, newest first, as the database would. */
    (prisma.groundDocument.findMany as jest.Mock).mockImplementation(async (q: any) => [PHOTO, A_DOC].slice(0, q?.take ?? 2));
    const reply = await service.respond('org-a', 'p1', "I've uploaded it");
    const said = reply.blocks.map((b: any) => b.body ?? b.summary ?? '').join(' ');
    expect(said).not.toContain('Q4 targets.xlsx');
    expect(prisma.assistantProposal.create).not.toHaveBeenCalled();
    /* Not "I cannot answer that one yet": the file is kept, and can be asked about. */
    expect(said).toBe('I have kept it with the check-in, and I will use it from now on. Ask me anything about what is in it.');
    /* Not "I cannot answer that one yet": the file is kept, and can be asked about. */
    expect(said).toBe('I have kept it with the check-in, and I will use it from now on. Ask me anything about what is in it.');
  });
});
