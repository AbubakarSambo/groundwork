import { AssistantService } from './assistant.service';

/**
 * PROPOSE, CONFIRM, RE-VERIFY, DELEGATE, AUDIT, READ BACK - at the service, not at the regexes.
 *
 * The pure functions are tested next door and they are not where this goes wrong. The first-turn
 * rule and the drop both live here, and BOTH SURVIVED BEING DELETED while the suite stayed green -
 * because every test at the time exercised the words rather than the flow. That is the third time
 * this session a guard of mine has held for the wrong reason.
 */
function svc(opts: { turns?: number; parked?: any; person?: any } = {}) {
  const proposals: any[] = [];
  const commitments: any[] = [];
  const prisma: any = {
    person: {
      /*
       * TWO DIFFERENT LOOKUPS, AND THE SCENARIO IS THE DIFFERENCE BETWEEN THEM. Resolving who is
       * asking is by id. Re-verifying at execution filters on `active`. Somebody deprovisioned
       * between the offer and the yes is still found by the first and not by the second, which is
       * precisely the case this is here to cover - so the fake has to tell them apart.
       */
      findFirst: jest.fn(async ({ where }: any) => {
        if (where?.active === true && opts.person === null) return null;
        return { id: 'p1', externalId: 'u-1', active: true, ...(opts.person ?? {}) };
      }),
      count: jest.fn(async () => 1),
      findMany: jest.fn(async () => []),
      update: jest.fn(async () => ({})),
    },
    assistantTurn: {
      count: jest.fn(async () => opts.turns ?? 5),
      createMany: jest.fn(async () => ({ count: 2 })),
    },
    assistantProposal: {
      findFirst: jest.fn(async () => opts.parked ?? null),
      create: jest.fn(async ({ data }: any) => { const p = { id: 'pr1', ...data }; proposals.push(p); return p; }),
      update: jest.fn(async ({ where, data }: any) => { proposals.push({ id: where.id, ...data }); return data; }),
    },
    commitment: {
      create: jest.fn(async ({ data }: any) => { const c = { id: 'c1', ...data }; commitments.push(c); return c; }),
      findUnique: jest.fn(async () => commitments[commitments.length - 1] ?? null),
      findMany: jest.fn(async () => []),
    },
    subject: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
    detectionQuietPeriod: { findMany: jest.fn(async () => []) },
  };
  const engine: any = { respond: jest.fn(async () => { throw new Error('model off for these tests'); }) };
  return { service: new AssistantService(prisma, engine), prisma, proposals, commitments };
}

const PARKED = {
  id: 'pr1', kind: 'commitment',
  summary: 'Shall I note that down: "send the comparison"?',
  payload: { text: 'send the comparison', dueSaid: null },
};

describe('propose', () => {
  it('offers to note down something said in passing', async () => {
    const { service, proposals } = svc();
    const r = await service.respond('org-a', 'p1', "I'll send the comparison by Wednesday");
    expect(r.lane).toBe('propose_commitment');
    expect(r.blocks.some((b) => b.type === 'proposal')).toBe(true);
    expect(proposals).toHaveLength(1);
  });

  it('NEVER on the first turn', async () => {
    /*
     * Not politeness. Offering to write something down within a second of a stranger opening a
     * panel, before it has answered a single question, is the behaviour that makes somebody decide
     * this thing is going to be a problem.
     */
    const { service, proposals } = svc({ turns: 0 });
    const r = await service.respond('org-a', 'p1', "I'll send the comparison by Wednesday");
    expect(r.lane).toBe('unplaced');
    expect(proposals).toHaveLength(0);
  });

  it('writes nothing on its own', async () => {
    const { service, commitments } = svc();
    await service.respond('org-a', 'p1', "I'll send the comparison by Wednesday");
    expect(commitments).toHaveLength(0);
  });
});

describe('confirm', () => {
  it('a plain yes writes it, and the answer is read back off the record', async () => {
    const { service, commitments } = svc({ parked: PARKED });
    const r = await service.respond('org-a', 'p1', 'yes');
    expect(r.lane).toBe('confirm_commitment');
    expect(commitments).toHaveLength(1);
    expect(commitments[0].text).toBe('send the comparison');
    /* Never inferred from words. */
    expect(commitments[0].dueAt).toBeNull();
    expect((r.blocks[0] as any).body).toContain('send the comparison');
  });

  it('a plain no writes nothing and says so briefly', async () => {
    const { service, commitments } = svc({ parked: PARKED });
    const r = await service.respond('org-a', 'p1', 'no');
    expect(commitments).toHaveLength(0);
    expect((r.blocks[0] as any).body).toMatch(/left it/i);
  });

  it('ANYTHING ELSE DROPS IT, and still answers what they actually said', async () => {
    /*
     * The property this whole design exists for. A proposal that survives the subject changing is
     * the one that fires on somebody's later "yes" about something entirely different, and leaves
     * them with a record they believe they never agreed to.
     */
    const { service, proposals, commitments } = svc({ parked: PARKED });
    const r = await service.respond('org-a', 'p1', 'what can you see?');
    expect(proposals.some((p) => p.state === 'DROPPED')).toBe(true);
    expect(commitments).toHaveLength(0);
    /* Their question is answered rather than swallowed by the confirmation machinery. */
    expect(r.lane).toBe('what_you_can_see');
  });

  it('and a yes with anything attached is not a plain yes', async () => {
    const { service, commitments, proposals } = svc({ parked: PARKED });
    await service.respond('org-a', 'p1', 'yes but Thursday instead');
    expect(commitments).toHaveLength(0);
    expect(proposals.some((p) => p.state === 'DROPPED')).toBe(true);
  });
});

describe('re-verify at execution', () => {
  it('refuses to write for somebody who has left between the offer and the yes', async () => {
    /*
     * A parked action carries the authorisation it had when it was offered, and that is exactly
     * what must not be trusted: between the two turns the person may have been deprovisioned.
     */
    const { service, commitments } = svc({ parked: PARKED, person: null });
    const r = await service.respond('org-a', 'p1', 'yes');
    expect(commitments).toHaveLength(0);
    expect((r.blocks[0] as any).body).toMatch(/no longer see you/i);
  });

  it('and marks the proposal resolved rather than leaving it parked forever', async () => {
    const { service, proposals } = svc({ parked: PARKED, person: null });
    await service.respond('org-a', 'p1', 'yes');
    expect(proposals.some((p) => p.state === 'DROPPED')).toBe(true);
  });
});

describe("a person history is their own", () => {
  it('remembers both halves of the turn', async () => {
    const { service, prisma } = svc();
    await service.respond('org-a', 'p1', 'what can you see?');
    const rows = prisma.assistantTurn.createMany.mock.calls[0][0].data;
    expect(rows.map((r: any) => r.role)).toEqual(['person', 'assistant']);
    for (const r of rows) expect(r.personExternalId).toBe('u-1');
  });

  it('and failing to remember never costs somebody their answer', async () => {
    const { service, prisma } = svc();
    prisma.assistantTurn.createMany = jest.fn(async () => { throw new Error('write failed'); });
    await expect(service.respond('org-a', 'p1', 'what can you see?')).resolves.toBeTruthy();
  });
});
