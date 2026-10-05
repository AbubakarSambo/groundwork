import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GroundScenario, GroundStatus, PartyType } from '@prisma/client';
import { ResolutionService } from './resolution.service';
import { RESOLUTION_ON_THE_GROUND } from '../grounds/grounds.service';
import { whenTheBoardLastChanged } from '../board/when-the-board-last-changed';
import { END_STATES } from './end-states';
import { whereThisIsHeading } from '../board/where-this-is-heading';
import { whyItRefuses } from '../grounds/a-ground-that-has-ended';
import { EmailService } from '../email/email.service';

/**
 * HOW A CHECK-IN ENDS, AND WHY, AS EACH READER READS IT (U.11, B6 ending-and-probation-review.txt).
 *
 * Decisions rule 6: a person decides, giving a reason, and the person it is about sees the decision
 * with its reasons. The prototype: "Why, in a sentence or two. Kwame reads this with the outcome."
 *
 * Wairimu runs "Kwame, first 90 days". Kwame is in it. Grace is an admin who is not in it. Omar is
 * a member of the organisation who is not in it and is not an admin.
 */
const WAIRIMU = 'u-wairimu';
const KWAME = 'u-kwame';
const GRACE = 'u-grace';
const OMAR = 'u-omar';
const HANA = 'u-hana';

const REASON =
  'He brought in 5 new accounts against a goal of 4, and he has raised problems the same day since week 8.';

function world(opts: { closed: boolean; storedReason?: string | null; scenario?: GroundScenario; email?: any }) {
  const participants = [
    {
      id: 'p-wairimu', userId: WAIRIMU, email: 'wairimu@baridi.test', partyType: PartyType.INITIATOR,
      createdAt: new Date('2026-07-01'), roleAsDescribed: 'Sales lead',
      user: { firstName: 'Wairimu', lastName: 'Kamau', email: 'wairimu@baridi.test' },
    },
    {
      id: 'p-kwame', userId: KWAME, email: 'kwame@baridi.test', partyType: PartyType.PARTICIPANT,
      createdAt: new Date('2026-07-01'), roleAsDescribed: 'Sales representative',
      user: { firstName: 'Kwame', lastName: 'Mensah', email: 'kwame@baridi.test' },
    },
  ];
  const closedAt = opts.closed ? new Date('2026-09-30T10:00:00Z') : null;
  const resolution = {
    id: 'r1', groundId: 'g1', endState: 'KEEP', closedAt,
    reason: opts.storedReason === undefined ? REASON : opts.storedReason,
    confirmations: opts.closed ? [{ participantId: 'p-wairimu', endState: 'KEEP' }] : [],
  };
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g1', organizationId: 'org1', initiatorId: WAIRIMU, scenario: opts.scenario ?? GroundScenario.NEW_HIRE,
        /* Changed with decision 75, item 25: a first 90 days is an evaluation check-in now, so Grace reads it
           because she set it up (given access, decision 5). Hana, an admin who was not, reads nothing. */
        createdByUserId: GRACE,
        label: 'Kwame, first 90 days', participants,
        status: opts.closed ? GroundStatus.CLOSED : GroundStatus.ACTIVE,
      })),
      update: jest.fn(async () => ({})),
    },
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => {
        const p = participants.find((x) => x.userId === where.userId);
        return p ? { ...p } : null;
      }),
      findMany: jest.fn(async () => participants),
    },
    user: {
      findFirst: jest.fn(async ({ where }: any) => ([GRACE, HANA].includes(where.id) ? { id: where.id, role: 'ADMIN', organizationId: 'org1' } : null)),
    },
    resolution: {
      findUnique: jest.fn(async () => resolution),
      upsert: jest.fn(async () => ({ id: 'r1', endState: 'KEEP' })),
      update: jest.fn(async () => ({})),
    },
    resolutionConfirmation: {
      deleteMany: jest.fn(async () => ({})),
      upsert: jest.fn(async () => ({})),
      findMany: jest.fn(async () => [{ participantId: 'p-wairimu', endState: 'KEEP' }]),
    },
    $transaction: jest.fn(async () => []),
  };
  const intelligence: any = { recordOutcome: jest.fn(async () => {}) };
  const reports: any = { recordOutcomeLearning: jest.fn(async () => {}) };
  const email: any = opts.email ?? { sendGroundClosed: jest.fn(async () => {}), sendResolutionProposal: jest.fn(async () => {}) };
  const config: any = { get: jest.fn(() => 'http://localhost:5173') };
  return { svc: new ResolutionService(prisma, intelligence, reports, email, config), prisma };
}

describe('Wairimu, who runs the check-in, decides how it ends and says why', () => {
  it('cannot end it on an outcome alone, and nothing is written when she tries', async () => {
    const { svc, prisma } = world({ closed: false });
    await expect(svc.propose('g1', WAIRIMU, 'KEEP')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.propose('g1', WAIRIMU, 'KEEP', '   ')).rejects.toThrow(
      'Say why, in a sentence or two. The people in this check-in read it with the outcome.',
    );
    expect(prisma.resolution.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('ends it with her reason kept beside the outcome', async () => {
    const { svc, prisma } = world({ closed: false });
    await svc.propose('g1', WAIRIMU, 'KEEP', `  ${REASON}  `);
    expect(prisma.resolution.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ endState: 'KEEP', reason: REASON }),
        update: expect.objectContaining({ endState: 'KEEP', reason: REASON }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('reads the outcome and her own reason once it has ended', async () => {
    const { svc } = world({ closed: true });
    const state: any = await svc.get('g1', WAIRIMU);
    expect(state.resolution).toMatchObject({ endState: 'KEEP', reason: REASON });
    expect(state.viewerIsLead).toBe(true);
    expect(state.viewerIsParty).toBe(true);
  });
});

describe('Kwame, the person it is about, reads the decision with its reason', () => {
  it('reads the outcome and Wairimu’s reason, and who decided, once it has ended', async () => {
    const { svc } = world({ closed: true });
    const state: any = await svc.get('g1', KWAME);
    expect(state.resolution).toMatchObject({ endState: 'KEEP', reason: REASON });
    expect(state.viewerIsLead).toBe(false);
    expect(state.viewerIsParty).toBe(true);
    const lead = state.confirmations.find((c: any) => c.partyType === PartyType.INITIATOR);
    expect(lead.label).toBe('Wairimu Kamau');
  });

  it('cannot decide it himself, with or without a reason', async () => {
    const { svc, prisma } = world({ closed: false });
    await expect(svc.propose('g1', KWAME, 'KEEP', 'I think I did well.')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.resolution.upsert).not.toHaveBeenCalled();
  });

  it('reads no reason before the check-in has ended', async () => {
    const { svc } = world({ closed: false, storedReason: 'A draft that was never saved as an ending.' });
    const state: any = await svc.get('g1', KWAME);
    expect(state.resolution.reason).toBeNull();
  });
});

describe('Grace, the admin who set it up and is not in it, reads it; nobody else does', () => {
  it('Hana, an admin who was not given access to this first 90 days, is refused', async () => {
    const { svc } = world({ closed: true });
    await expect(svc.get('g1', HANA)).rejects.toThrow('You are not part of this check-in.');
  });

  it('Grace reads the outcome and the reason, and is told she is not in it', async () => {
    const { svc } = world({ closed: true });
    const state: any = await svc.get('g1', GRACE);
    expect(state.resolution).toMatchObject({ endState: 'KEEP', reason: REASON });
    expect(state.viewerIsParty).toBe(false);
    expect(state.viewerIsLead).toBe(false);
  });

  it('Omar, a member who is neither in it nor an admin, is refused', async () => {
    const { svc } = world({ closed: true });
    await expect(svc.get('g1', OMAR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('the check-in’s own read never carries the reason, so it cannot reach anyone else that way', () => {
    expect(Object.keys(RESOLUTION_ON_THE_GROUND)).not.toContain('reason');
    expect(RESOLUTION_ON_THE_GROUND).toMatchObject({ endState: true, closedAt: true });
  });
});

describe('the board counts a decision as something new coming in', () => {
  it('its "last updated" time moves to the moment the check-in was decided', () => {
    const at = whenTheBoardLastChanged({
      checkIns: [{ completedAt: '2026-09-23T18:00:00Z' }],
      decidedAt: '2026-09-30T10:00:00Z',
    });
    expect(at).toBe('2026-09-30T10:00:00.000Z');
  });
});

/*
 * THE ENDINGS ARE PLAIN SENTENCES, AND BOTH PANELS READ THE SAME ONES (decision 75, item 48).
 *
 * Before: the resolution panel offered "Keep the hire", "Let them go", "Not yet - revisit with a named
 * gap", and on a team check-in "OKRs aligned to company direction" and "Gaps identified - revision
 * needed". The board's "Where this is heading" turned the dash into a comma. A person reading a door
 * that refused them after the end read "This check-in ended: keep." from the stored value.
 */
describe('decision 75, item 48: every ending is one plain sentence, read the same on both panels', () => {
  const PLAIN = /^[A-Z][^:;\u2013\u2014]*\.$/;
  it.each(Object.entries(END_STATES))('%s: each ending is one full sentence, with no dash, colon or piece', (_scenario, endings) => {
    for (const e of endings) {
      expect(e.label).toMatch(PLAIN);
      expect(e.label).not.toMatch(/ - /);
      /* One sentence, so "The outcome is that ..." can carry it. The one exception is the prototype's ending
         when somebody leaves a role, which Hafsah chose on 5 October (request 123 item 8): its second
         sentence, "The person's history stays as it is.", is the point, and it still reads after "The outcome is that". */
      const oneOrThePrototypesTwo = e.value === 'EXIT' && e.label.startsWith('The role does not continue.')
        ? e.label.replace(/^The role does not continue\. /, '')
        : e.label;
      expect(oneOrThePrototypesTwo.replace(/\.$/, '')).not.toMatch(/[.!?]/);
      expect(e.description ?? '').not.toMatch(/ - /);
    }
  });

  /* Changed on 5 October (request 123 item 8): "The new person leaves the role." is now the prototype's
     "The role doesn't continue. His history stays as it is.", which Hafsah chose, with the person's
     name, said as each reader may read it. */
  it.each([
    ['Wairimu, who runs it', WAIRIMU, "Kwame's role does not continue. Kwame's history stays as it is."],
    ['Kwame, the person it is about', KWAME, 'Your role does not continue. Your history stays as it is.'],
    /* Grace is not in the check-in, and this panel shows her Kwame's role rather than his name, so the ending does too. */
    ['Grace, the admin who set it up', GRACE, "The role does not continue. The person's history stays as it is."],
  ])('%s reads the same sentences on the resolution panel of a first 90 days', async (_who, userId, theRoleEnds) => {
    const { svc } = world({ closed: false });
    const state: any = await svc.get('g1', userId);
    expect(state.options.map((o: any) => o.label)).toEqual([
      'The new person stays in the role.',
      'The role is set up differently.',
      theRoleEnds,
      'The time to decide is made longer.',
      'It is not decided yet, and what is missing is named so it can be looked at again.',
    ]);
  });

  it('on a team check-in, the resolution panel and "Where this is heading" read the same sentences', async () => {
    const { svc } = world({ closed: false, scenario: GroundScenario.OKR_ALIGNMENT });
    const panel: any = await svc.get('g1', WAIRIMU);
    const board = whereThisIsHeading({ scenario: GroundScenario.OKR_ALIGNMENT, hadAnObjective: true, readerIsTheLead: true, leadName: 'Wairimu Kamau', board: {}, decided: null });
    expect(panel.options.map((o: any) => o.label)).toEqual([
      /* Changed on 5 October (request 130 f): the prototype's "On course", "Reach it with a change" and "Change the target", as sentences. */
      'The team is on course.',
      'The team can reach it, with a change in how the work is done.',
      'The target needs to change.',
      'It is not settled yet, and more sessions are needed.',
    ]);
    expect(board.outcomes.map((o) => o.says)).toEqual(panel.options.map((o: any) => o.label));
  });

  it.each(Object.entries(END_STATES))('%s: once decided, the board and every refusing door say the ending as a sentence', (scenario, endings) => {
    for (const e of endings) {
      const board = whereThisIsHeading({ scenario: scenario as GroundScenario, hadAnObjective: true, readerIsTheLead: false, leadName: 'Wairimu Kamau', board: {}, decided: { endState: e.value, on: new Date('2026-09-30T10:00:00Z') }, now: new Date('2026-10-02T12:00:00Z') });
      expect(board.decided).toMatch(/^Wairimu Kamau recorded the decision on 30 September\. The outcome is that [a-z].*[^.]\.$/);
      expect(whyItRefuses(GroundStatus.CLOSED, e.value, 'anybody else', scenario)).toBe(`This check-in has ended. ${e.label}`);
    }
  });

  it('the person a first 90 days is about reads how it ended as a sentence, never the stored word', () => {
    /* Changed on 5 October (request 123 item 8). A door that refuses somebody does not know who is at it, so it names nobody. */
    expect(whyItRefuses(GroundStatus.CLOSED, 'EXIT', 'anybody else', GroundScenario.NEW_HIRE)).toBe("This check-in has ended. The role does not continue. The person's history stays as it is.");
    expect(whyItRefuses(GroundStatus.CLOSED, 'EXIT', 'anybody else', GroundScenario.NEW_HIRE)).not.toMatch(/exit|:/i);
  });
});

/*
 * WHEN SOMEBODY LEAVES A ROLE, EACH READER READS IT WITH THE PERSON'S NAME (request 123 item 8;
 * Hafsah, 5 October 2026). The prototype, B6 ending-and-probation-review: "Part ways. The role
 * doesn't continue. His history stays as it is." No pronoun is guessed, so the name is said twice.
 */
describe('request 123 item 8: the ending when Kwame leaves the role, as each person reads it', () => {
  function withRealEmail() {
    const out: { to: string; subject: string; html: string }[] = [];
    const email = new EmailService({ get: () => undefined } as any, {} as any, { groundParticipant: { findUnique: jest.fn(async () => null) } } as any);
    jest.spyOn(email as any, 'sendEmail').mockImplementation(async (m: any) => { out.push({ to: m.to, subject: m.subject, html: m.html }); return undefined; });
    return { email, out };
  }

  it('the closing email says it to Wairimu with his name, and to Kwame as "your"', async () => {
    const { email, out } = withRealEmail();
    const { svc } = world({ closed: false, email });
    await svc.propose('g1', WAIRIMU, 'EXIT', 'The accounts did not come, and the stock problem was raised too late to fix.');
    const toWairimu = out.find((m) => m.to === 'wairimu@baridi.test')!;
    const toKwame = out.find((m) => m.to === 'kwame@baridi.test')!;
    expect(toWairimu.html).toContain('The outcome is that Kwame\'s role does not continue. Kwame\'s history stays as it is.');
    expect(toKwame.html).toContain('The outcome is that your role does not continue. Your history stays as it is.');
    for (const m of [toWairimu, toKwame]) expect(m.html).not.toMatch(/leaves the role|\b(?:his|her)\b history/i);
  });

  it('on a drift check-in with one other person, the board names them to the lead once it is decided', () => {
    const board = whereThisIsHeading({
      scenario: GroundScenario.DRIFT, hadAnObjective: true, readerIsTheLead: true, leadName: 'Wairimu Kamau', board: {},
      decided: { endState: 'EXIT', on: new Date('2026-09-30T10:00:00Z') }, now: new Date('2026-10-02T12:00:00Z'),
      who: { name: 'Kwame' },
    });
    expect(board.decided).toBe("You recorded the decision on 30 September. The outcome is that Kwame's role does not continue. Kwame's history stays as it is.");
    expect(board.outcomes.find((o) => o.value === 'EXIT')!.says).toBe("Kwame's role does not continue. Kwame's history stays as it is.");
  });
});
