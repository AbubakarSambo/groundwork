/**
 * "A PRODUCT CONTRIBUTION COUNTS ONLY IF IT IMPROVES SALES OR THE MOAT."
 *
 * That was a sentence in a plan. This is the sentence turned into a field,
 * asked when work is proposed — the only moment the answer is cheap. Afterwards
 * it is a justification for something already built, and nobody has ever failed
 * to produce one of those.
 *
 * Nothing here blocks. Work naming nothing is listed, because a refusal is
 * answered by typing anything into the box, and then the field is worse than
 * absent: it looks like a decision.
 */
import { BadRequestException } from '@nestjs/common';
import { OpsWhatItServesService } from './ops-what-it-serves.service';
import {
  WHAT_WORK_CAN_SERVE,
  needsSomebodyToAgree,
  pointsAt,
  whyThisIsNotSaidYet,
} from './what-a-piece-of-work-serves';

const A_REAL_REASON = 'Sample Co Three cannot run a check-in across three teams without it.';

describe('what work can serve', () => {
  it('includes the category that stops the measure punishing necessary work', () => {
    /* A security fix, a migration, a broken build unblocks no use case and adds
       no moat entry. Without this it reads as zero, and the measure teaches the
       team to stop doing it inside one quarter. */
    expect(WHAT_WORK_CAN_SERVE.map((w) => w.serves)).toContain('KEEPING_IT_UP');
  });

  it('and that one needs somebody to agree, so it is not the drawer everything is filed in', () => {
    expect(needsSomebodyToAgree('KEEPING_IT_UP')).toBe(true);
    expect(needsSomebodyToAgree('SALES')).toBe(false);
    expect(needsSomebodyToAgree('MOAT')).toBe(false);
  });

  it('says what each one has to point at', () => {
    expect(pointsAt('SALES')).toBe('use case');
    expect(pointsAt('MOAT')).toBe('moat component');
    /* Keeping it up points at nothing, which is exactly why it needs an
       approval instead. */
    expect(pointsAt('KEEPING_IT_UP')).toBeNull();
  });
});

describe('a declaration that says nothing', () => {
  const base = { recordType: 'OpsRoadmapItem', serves: 'MOAT' as const, servesRecordId: 'moat-1' };

  it('is refused when the justification is a word', () => {
    expect(whyThisIsNotSaidYet({ ...base, justification: 'Important' })).toMatch(/not a justification/);
  });

  it('is refused when it claims to serve sales and names nobody', () => {
    expect(
      whyThisIsNotSaidYet({ recordType: 'OpsRoadmapItem', serves: 'SALES', justification: A_REAL_REASON }),
    ).toMatch(/Name the use case/);
  });

  it('is refused when it names a dependency and not who owns it', () => {
    /* The risk is not the dependency. It is a dependency on something belonging
       to the person who added it, so "who owns it" is the whole question. */
    expect(
      whyThisIsNotSaidYet({ ...base, justification: A_REAL_REASON, dependsOn: 'my own scheduler' }),
    ).toMatch(/who owns it/);
  });

  it('is accepted when both are said', () => {
    expect(
      whyThisIsNotSaidYet({
        ...base,
        justification: A_REAL_REASON,
        dependsOn: 'a scheduling library',
        dependsOnOwnedBy: 'Apache Software Foundation',
      }),
    ).toBeNull();
  });

  it('refuses a kind of work nobody has heard of', () => {
    expect(whyThisIsNotSaidYet({ ...base, recordType: 'OpsWishlist', justification: A_REAL_REASON })).toMatch(
      /not a kind of work/,
    );
  });
});

const serviceOver = (declared: Array<{ recordType: string; recordId: string }>, work: Record<string, Array<{ id: string; title: string }>>) => {
  const written: Record<string, unknown>[] = [];
  const service = new OpsWhatItServesService({
    opsWhatItServes: {
      findMany: async () => declared,
      upsert: async ({ create, update }: never) => {
        const row = { ...(create as Record<string, unknown>), ...(update as Record<string, unknown>) };
        written.push(row);
        return row;
      },
    },
    opsRoadmapItem: { findMany: async () => work.roadmap ?? [] },
    opsTechItem: { findMany: async () => work.tech ?? [] },
    opsUXItem: { findMany: async () => work.ux ?? [] },
  } as never);
  return { service, written };
};

describe('work that has named nothing', () => {
  it('is the absence of a row, not a complaint anybody filed', async () => {
    const { service } = serviceOver(
      [{ recordType: 'OpsRoadmapItem', recordId: 'r1' }],
      { roadmap: [{ id: 'r1', title: 'Said' }, { id: 'r2', title: 'Did not say' }] },
    );
    const found = await service.namedNothing();
    expect(found.rows.map((r) => r.title)).toEqual(['Did not say']);
  });

  it('spans every kind of work, so nothing hides in the quiet one', async () => {
    const { service } = serviceOver([], {
      roadmap: [{ id: 'r1', title: 'A feature' }],
      tech: [{ id: 't1', title: 'A migration' }],
      ux: [{ id: 'u1', title: 'A flow' }],
    });
    expect((await service.namedNothing()).value).toBe(3);
  });

  it('says so plainly when everything has said', async () => {
    const { service } = serviceOver([{ recordType: 'OpsRoadmapItem', recordId: 'r1' }], {
      roadmap: [{ id: 'r1', title: 'Said' }],
    });
    expect((await service.namedNothing()).says).toMatch(/Every open piece of work/);
  });
});

describe('saying it', () => {
  it('records the sentence and who said it', async () => {
    const { service, written } = serviceOver([], {});
    await service.say(
      { recordType: 'OpsRoadmapItem', recordId: 'r1', serves: 'MOAT', servesRecordId: 'dataset', justification: A_REAL_REASON },
      'james',
    );
    expect(written[0]).toMatchObject({ serves: 'MOAT', declaredById: 'james' });
  });

  it('is changeable, because work gets re-aimed and pretending otherwise makes people work around it', async () => {
    const { service } = serviceOver([], {});
    await expect(
      service.say(
        { recordType: 'OpsRoadmapItem', recordId: 'r1', serves: 'SALES', servesRecordId: 'uc-1', justification: A_REAL_REASON },
        'james',
      ),
    ).resolves.toBeTruthy();
  });

  it('says out loud when the category needs somebody to agree', async () => {
    const { service } = serviceOver([], {});
    const result = await service.say(
      { recordType: 'OpsTechItem', recordId: 't1', serves: 'KEEPING_IT_UP', justification: 'The build has been red for nine days.' },
      'abubakar',
    );
    expect(result.needsSomebodyToAgree).toBe(true);
    expect(result.says).toMatch(/drawer everything is filed in/);
  });

  it('refuses before it writes', async () => {
    const { service, written } = serviceOver([], {});
    await expect(
      service.say({ recordType: 'OpsRoadmapItem', recordId: 'r1', serves: 'MOAT', justification: 'yes' }, 'james'),
    ).rejects.toThrow(BadRequestException);
    expect(written).toEqual([]);
  });
});
