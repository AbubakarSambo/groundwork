import { GroundScenario } from '@prisma/client';
import { BoardService } from './board.service';
import { boardAs, SALES_RUN, BISI, FEMI, NGOZI, KWAME, JUMA, SALES_PEOPLE } from './the-switchboards-sections-harness';

/**
 * SCREENS REQUEST 110 (a) AND (b): A PERSON'S OWN AIM, AND "YOUR SHARE", AS EACH READER READS THEM.
 *
 * Amani Wekesa said "I am aiming for 3 shops in Kilimani" in session 1 of "Sales team, Q3". Her board had
 * no target of hers and no `yourShare` at all. Why: the session closed before request 107 (c), part 1 put a
 * participant's own counted aim on the board, so the aim was kept only as her promise (`PersonObjective`,
 * kind TARGET, with its number and what it counts), and nothing reads a closed session's turns again.
 *
 * The words below are word for word what Femi Okonkwo, Ngozi Eze and Kwame Mensah typed in session 1 of the
 * sales run (api/journey/all-24/run-24/sales.json). Each aim is given here as it would be kept only as their
 * promise, the way Amani's was, with nothing on the board for it.
 */
const FEMIS_WORDS = "I'm aiming for the full 12 approved facilities. I expect to hit that by the end of the quarter.";
const NGOZIS_WORDS = "I'm targeting 14 approved facilities.";

const promise = (id: string, participantId: string, text: string, target: string, measure: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', participantId, text, kind: 'TARGET', target, measure, status: 'OPEN', authoredBy: 'self',
  awareness: null, createdAt: new Date('2026-09-02T16:00:00Z'), ...more,
});
const FEMIS_AIM = promise('po-femi', 'p-femi', FEMIS_WORDS, '12', 'approved facilities');
const NGOZIS_AIM = promise('po-ngozi', 'p-ngozi', NGOZIS_WORDS, '14', 'approved facilities');
const ONLY_AS_PROMISES = { ...SALES_RUN, personObjectives: [FEMIS_AIM, NGOZIS_AIM] };
const SETUP = ['u-setup', 'ADMIN'] as const;

const names = (b: any) => (b.objectives ?? []).map((o: any) => o.name);

describe('request 110: an aim a person set for themselves, kept only as their promise, is on the board as theirs', () => {
  it('Femi reads his own aim, and his share, in his own words', async () => {
    const b = await boardAs(ONLY_AS_PROMISES, ...FEMI);
    /* Since 12 October a person's own aim is quoted whole in their words, with the short label beside it (52f9d4241, 59a945e03, e93258d96). */
    expect(names(b)).toEqual(['Your own aim is 12 approved. You said, "I\'m aiming for the full 12 approved facilities. I expect to hit that by the end of the quarter".']);
    expect(b.yourShare).toEqual([{
      objectiveId: 'their-own-aim-po-femi',
      says: 'Your own aim is 12 approved. You said, "I\'m aiming for the full 12 approved facilities. I expect to hit that by the end of the quarter". Nothing has been counted against it yet.',
      whoSees: 'Only you and Bisi Adeyemi see your share.',
    }]);
    expect(b.yourShareSays).toBeUndefined();
    expect(JSON.stringify(b)).not.toMatch(/Ngozi Eze set|targeting 14/);
  });

  it('Bisi, who runs it, reads each person\'s aim by name, and is sent no share', async () => {
    const b = await boardAs(ONLY_AS_PROMISES, ...BISI);
    expect(names(b)).toEqual([
      'Femi Okonkwo\'s own aim is 12 approved. Femi Okonkwo said, "I\'m aiming for the full 12 approved facilities. I expect to hit that by the end of the quarter".',
      'Ngozi Eze\'s own aim is 14 approved. Ngozi Eze said, "I\'m targeting 14 approved facilities".',
    ]);
    expect(b.yourShare).toBeUndefined();
  });

  it('Ngozi reads only her own, where each person sees only their own numbers', async () => {
    const b = await boardAs(ONLY_AS_PROMISES, ...NGOZI);
    expect(b.yourShare.map((s: any) => s.says)).toEqual(['Your own aim is 14 approved. You said, "I\'m targeting 14 approved facilities". Nothing has been counted against it yet.']);
    expect(JSON.stringify(b)).not.toMatch(/12 approved facilities|Femi Okonkwo set/);
  });

  it('Ngozi reads only her own where people do not see each other, too', async () => {
    const b = await boardAs({ ...ONLY_AS_PROMISES, peersVisibleToEachOther: false }, ...NGOZI);
    expect(b.yourShare).toHaveLength(1);
    expect(JSON.stringify(b)).not.toMatch(/12 approved facilities|Femi/);
  });

  it('where the lead chose that everybody sees every number, her share says so, and her own board still holds only her own aim (request 105, part 3)', async () => {
    const b = await boardAs({ ...ONLY_AS_PROMISES, whoSeesTargets: 'EVERYBODY' }, ...NGOZI);
    expect(names(b)).toEqual(['Your own aim is 14 approved. You said, "I\'m targeting 14 approved facilities".']);
    expect(b.yourShare[0].whoSees).toBe('Everybody in this check-in sees your share.');
  });

  it('Kwame, who set no number of his own, is sent an empty share and a sentence that says so', async () => {
    const b = await boardAs(ONLY_AS_PROMISES, ...KWAME);
    expect(b.yourShare).toEqual([]);
    expect(b.yourShareSays).toBe('There is no number of yours on this board yet, so there is no share to show.');
    expect(JSON.stringify(b)).not.toMatch(/approved facilities\. Femi|targeting 14/);
  });

  for (const [who, reader] of Object.entries({ 'Juma, an admin who only reads': JUMA, 'the admin who set it up': SETUP })) {
    /* Decision 86: an admin sees the figures, so each person's own aim too. This used to pin that the admin read none. */
    it(`${who} reads each person's own aim, and is sent no share of their own`, async () => {
      const b = await boardAs({ ...ONLY_AS_PROMISES, createdByUserId: 'u-setup' }, reader[0], reader[1]);
      expect(b.yourShare).toBeUndefined();
      expect(b.yourShareSays).toBeUndefined();
      expect(JSON.stringify(b.objectives ?? [])).toMatch(/12 approved/);
      expect(JSON.stringify(b.objectives ?? [])).toMatch(/14 approved/);
    });
  }

  it('on a performance plan, Femi, the person reviewed, reads his own aim, and Kwame, a colleague giving a view, never reads it', async () => {
    const plan = { ...ONLY_AS_PROMISES, scenario: GroundScenario.PIP };
    const femi = await boardAs(plan, ...FEMI);
    expect(femi.yourShare.map((s: any) => s.objectiveId)).toEqual(['their-own-aim-po-femi']);
    const kwame = await boardAs(plan, ...KWAME);
    expect(JSON.stringify(kwame)).not.toMatch(/12 approved facilities|14 approved facilities/);
  });

  it('an aim already on the board is not read twice', async () => {
    const stored = {
      id: 'o-femi', groundId: 'g-1', name: FEMIS_WORDS, target: 12, count: 2, prevCount: 0, ownerParticipantId: 'p-femi', setByParticipantId: 'p-femi',
      direction: null, isADecisionAboutAPerson: false, sortOrder: 100, addedAtSession: 1, assumes: [], suggestedCount: null, suggestedSaid: null,
    };
    const b = await boardAs({ ...ONLY_AS_PROMISES, objectives: [stored] }, ...FEMI);
    expect(b.yourShare.map((s: any) => s.objectiveId)).toEqual(['o-femi']);
    expect(b.yourShare[0].says).toMatch(/You have 2 of the 12 so far\.$/);
  });

  it('a goal the lead set for somebody, a promise with no number, and a promise already done are not read as their own aim', async () => {
    const b = await boardAs({
      ...SALES_RUN,
      personObjectives: [
        promise('po-lead', 'p-femi', 'Femi should close 20 facilities.', '20', 'facilities', { authoredBy: 'lead', awareness: 'TOLD' }),
        promise('po-wish', 'p-femi', 'I want to do better this quarter.', 'more', 'facilities'),
        promise('po-done', 'p-femi', "I'm aiming for 5 site visits.", '5', 'site visits', { status: 'DONE' }),
      ],
    }, ...FEMI);
    expect(b.yourShare).toEqual([]);
  });
});

describe('request 110: the lead can change a number read from a promise, and only the person can drop it', () => {
  function service(created: any[]) {
    const prisma: any = {
      ground: { findUnique: jest.fn(async (args: any) => (args?.select
        ? { id: 'g-1', scenario: GroundScenario.OKR_ALIGNMENT, mode: 'SHARED', initiatorId: 'u-bisi' }
        : { id: 'g-1', objectives: [], participants: SALES_PEOPLE.map((p) => ({ id: p.id, partyType: p.partyType })) })) },
      personObjective: { findUnique: jest.fn(async () => ({ ...FEMIS_AIM })) },
      groundObjective: {
        create: jest.fn(async (a: any) => { const row = { id: 'o-new', count: 0, ...a.data }; created.push(row); return row; }),
        findUnique: jest.fn(async () => created[0] ?? null),
        update: jest.fn(async (a: any) => ({ ...created[0], ...a.data })),
        delete: jest.fn(),
      },
      groundObjectiveSnapshot: { updateMany: jest.fn() },
    };
    return { svc: new BoardService(prisma, {} as any, {} as any, {} as any), prisma };
  }

  it('Bisi setting Femi\'s count puts the aim on the record first, as Femi\'s, in his words', async () => {
    const created: any[] = [];
    const { svc } = service(created);
    const out: any = await svc.updateObjective('g-1', 'their-own-aim-po-femi', 'u-bisi', { count: 3 });
    expect(created).toEqual([expect.objectContaining({ groundId: 'g-1', name: FEMIS_WORDS, target: 12, ownerParticipantId: 'p-femi', setByParticipantId: 'p-femi' })]);
    expect(out.count).toBe(3);
  });

  it('nobody but the lead can change it', async () => {
    const { svc } = service([]);
    await expect(svc.updateObjective('g-1', 'their-own-aim-po-femi', 'u-femi', { count: 3 })).rejects.toThrow('Only the person who set this check-in up');
  });

  it('removing it is refused in a plain sentence', async () => {
    const { svc, prisma } = service([]);
    await expect(svc.deleteObjective('g-1', 'their-own-aim-po-femi', 'u-bisi')).rejects.toThrow(
      'This aim is one the person set for themselves in their own check-in, so only they can drop it. You can change its number or what is counted against it.',
    );
    expect(prisma.groundObjective.delete).not.toHaveBeenCalled();
  });
});
