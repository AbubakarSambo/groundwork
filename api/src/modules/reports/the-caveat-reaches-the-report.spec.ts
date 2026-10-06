import { ReportsService } from './reports.service';
import { COULD_NOT_WORK_IT_OUT } from './what-nothing-here-could-check';

/**
 * DRIVEN, NOT ASSERTED FROM SOURCE, because the two things worth proving here both live in the
 * joins: that a claim's backing is read from rows rather than from how well somebody spoke, and
 * that a failure to work it out becomes a sentence rather than a gap.
 */
const svc = (over: { objectives?: any[]; anchored?: any[]; deliveries?: any[]; records?: any[]; explodes?: boolean } = {}) => {
  const s: any = Object.create(ReportsService.prototype);
  s.logger = { warn: () => undefined };
  s.prisma = {
    personObjective: {
      findMany: async () => {
        if (over.explodes) throw new Error('database is having a day');
        return over.objectives ?? [];
      },
    },
    recordEntry: {
      findMany: async ({ where }: any) => (where?.recallBased === false ? over.anchored ?? [] : over.records ?? []),
    },
    delivery: { findMany: async () => over.deliveries ?? [] },
  };
  return s;
};

const objective = (over: any = {}) => ({ id: 'o1', text: 'Three proposals out', participantId: 'ed', ...over });

describe('what backs a claim is read from rows, never from how it was told', () => {
  it('counts somebody else having given an account of their own', async () => {
    const out = await svc({ objectives: [objective()], records: [{ participantId: 'ed' }, { participantId: 'ceo' }] })
      .whatBacksEachClaim('g1');
    expect(out[0].anotherAccount).toBe(true);
  });

  it('and does not count the claimant talking to themselves', async () => {
    /* Four sessions of one person's own entries is one account, however much of it there is. */
    const out = await svc({
      objectives: [objective()],
      records: [{ participantId: 'ed' }, { participantId: 'ed' }, { participantId: 'ed' }],
    }).whatBacksEachClaim('g1');
    expect(out[0].anotherAccount).toBe(false);
  });

  it('counts a document only when the entry was anchored rather than recalled', async () => {
    const anchored = await svc({ objectives: [objective()], anchored: [{ participantId: 'ed' }] }).whatBacksEachClaim('g1');
    expect(anchored[0].document).toBe(true);
    const recalled = await svc({ objectives: [objective()], anchored: [] }).whatBacksEachClaim('g1');
    expect(recalled[0].document).toBe(false);
  });

  it('counts recorded progress only when evidence was actually named', async () => {
    const withEvidence = await svc({
      objectives: [objective()],
      deliveries: [{ objectiveId: 'o1', participantId: 'ed', evidence: 'the signed order' }],
    }).whatBacksEachClaim('g1');
    expect(withEvidence[0].record).toBe(true);

    const bare = await svc({
      objectives: [objective()],
      deliveries: [{ objectiveId: 'o1', participantId: 'ed', evidence: '   ' }],
    }).whatBacksEachClaim('g1');
    expect(bare[0].record).toBe(false);
  });

  it('never attributes another objective\'s evidence to this one', async () => {
    const out = await svc({
      objectives: [objective({ id: 'o1' })],
      deliveries: [{ objectiveId: 'o2', participantId: 'ed', evidence: 'the signed order' }],
    }).whatBacksEachClaim('g1');
    expect(out[0].record).toBe(false);
  });

  it('says nothing when there is nothing to say it about', async () => {
    expect(await svc({ objectives: [] }).whatBacksEachClaim('g1')).toEqual([]);
  });
});

describe('and when it cannot be worked out at all', () => {
  it('the report says so rather than losing the caveat', async () => {
    /*
     * The tempting version fails to nothing, on the grounds that a report is worth more than its
     * caveat. That leaves a report reading exactly as confident as one where everything checked
     * out, which is the failure being fixed.
     */
    await expect(svc({ explodes: true }).whatBacksEachClaim('g1')).rejects.toThrow();
    expect(COULD_NOT_WORK_IT_OUT).toContain('Read all of it as what one person said');
  });
});
