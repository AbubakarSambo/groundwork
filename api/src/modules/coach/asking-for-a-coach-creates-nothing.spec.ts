import { BadRequestException } from '@nestjs/common';
import { CoachService, MIN_INTENTION_LENGTH } from './coach.service';

/**
 * ASKING FOR A COACH MUST NOT CREATE A GROUND, AND MUST NOT BE A ONE-CLICK BUTTON.
 *
 * The card exists for the person the picker cannot help: somebody told to set this up, looking at
 * twenty situations, who does not know which one their problem is. Their previous options were to guess
 * at a scenario or to leave.
 *
 * Two things have to hold. Nothing is created - no ground, no participant, no check-in, nobody invited
 * - because a request is not a situation. And it takes real input, because a one-click "talk to a
 * coach" produces volume and no signal, and every field asked for is something somebody needs answered
 * before a call anyway.
 */
const A_REAL_ASK = {
  name: 'Ada Nwosu',
  orgName: 'Northfield Foods',
  email: 'ada@northfield.example',
  teamSize: '12',
  intention: 'Two of my leads have stopped agreeing on what the quarter is for and I do not know which of your situations that is.',
};

const makeService = (over: Record<string, any> = {}) => {
  const created: any[] = [];
  const updated: any[] = [];
  const emailed: any[] = [];
  const prisma: any = {
    coachRequest: {
      findFirst: jest.fn(async () => over.existing ?? null),
      create: jest.fn(async ({ data }: any) => { created.push(data); return { id: 'r1', ...data } }),
      update: jest.fn(async ({ where, data }: any) => { updated.push({ where, data }); return { id: where.id, ...data } }),
    },
    // Deliberately present and deliberately never called. If a future change starts writing a ground
    // from here, these throw rather than quietly succeeding.
    ground: { create: jest.fn(() => { throw new Error('a coach request must not create a ground') }) },
    groundParticipant: { create: jest.fn(() => { throw new Error('a coach request must not create a participant') }) },
    checkIn: { create: jest.fn(() => { throw new Error('a coach request must not open a check-in') }) },
  };
  const email: any = {
    sendCoachRequestReceived: jest.fn(async (to: string, name: string) => {
      if (over.emailThrows) throw new Error('provider down');
      emailed.push({ to, name });
    }),
  };
  return { service: new CoachService(prisma, email, { emit: jest.fn() } as any), prisma, email, created, updated, emailed };
};

describe('asking to speak to a coach', () => {
  it('creates no ground, no participant and no check-in', async () => {
    const { service, prisma } = makeService();
    await service.request(A_REAL_ASK);
    expect(prisma.ground.create).not.toHaveBeenCalled();
    expect(prisma.groundParticipant.create).not.toHaveBeenCalled();
    expect(prisma.checkIn.create).not.toHaveBeenCalled();
  });

  it('records the request and sends exactly one confirmation', async () => {
    const { service, created, emailed } = makeService();
    await service.request(A_REAL_ASK);
    expect(created).toHaveLength(1);
    expect(emailed).toEqual([{ to: 'ada@northfield.example', name: 'Ada Nwosu' }]);
  });

  it('refuses an intention too short to reply to', async () => {
    /** The anti-volume mechanism. Somebody who will not write two lines will not attend a session. */
    const { service, created } = makeService();
    await expect(service.request({ ...A_REAL_ASK, intention: 'help' })).rejects.toBeInstanceOf(BadRequestException);
    expect(created).toHaveLength(0);
  });

  it('and says what it needs rather than just refusing', async () => {
    const { service } = makeService();
    await expect(service.request({ ...A_REAL_ASK, intention: 'help' })).rejects.toThrow(/a line or two is enough/);
  });

  it('enforces the same minimum the form advertises', () => {
    expect(A_REAL_ASK.intention.length).toBeGreaterThanOrEqual(MIN_INTENTION_LENGTH);
  });

  describe('when the same person asks twice', () => {
    it('folds it into the existing request rather than making a second', async () => {
      /**
       * So the back office shows one person asking twice, which is information, rather than two people
       * asking once, which looks like demand and is not.
       */
      const { service, created, updated } = makeService({ existing: { id: 'r-old' } });
      await service.request(A_REAL_ASK);
      expect(created).toHaveLength(0);
      expect(updated[0].where.id).toBe('r-old');
      expect(updated[0].data.askedAgainAt).toBeInstanceOf(Date);
    });

    it('keeps the newer words, which are the ones worth replying to', async () => {
      const { service, updated } = makeService({ existing: { id: 'r-old' } });
      await service.request({ ...A_REAL_ASK, intention: 'Actually it is the budget: two teams have each planned for the same hire and neither will move.' });
      expect(updated[0].data.intention).toMatch(/same hire/);
    });

    it('and answers them the same way either time', async () => {
      // Telling somebody "you already asked" is worse than replying to them, and the back office sees it.
      const { service } = makeService({ existing: { id: 'r-old' } });
      await expect(service.request(A_REAL_ASK)).resolves.toEqual({ received: true });
    });
  });

  describe('when the confirmation cannot be sent', () => {
    it('keeps the request rather than losing it', async () => {
      /**
       * The only thing this person was promised is an email. Losing the row because the provider was
       * down would mean nobody ever finds out they asked.
       */
      const { service, created } = makeService({ emailThrows: true });
      await expect(service.request(A_REAL_ASK)).resolves.toEqual({ received: true });
      expect(created).toHaveLength(1);
    });

    it('and leaves no confirmation timestamp, so the back office can see it never went', async () => {
      const { service, updated } = makeService({ emailThrows: true });
      await service.request(A_REAL_ASK);
      const stamped = updated.filter((u) => u.data.confirmationSentAt);
      expect(stamped).toHaveLength(0);
    });
  });

  describe('free-mail addresses', () => {
    it('are marked, not refused, because a founder on gmail is a real prospect', async () => {
      const { service, created } = makeService();
      await service.request({ ...A_REAL_ASK, email: 'ada@gmail.com' });
      expect(created[0].isFreeMail).toBe(true);
    });

    it('and a company address is not marked', async () => {
      const { service, created } = makeService();
      await service.request(A_REAL_ASK);
      expect(created[0].isFreeMail).toBe(false);
    });
  });

  describe('the lifecycle', () => {
    it('accepts only the statuses the back office uses', async () => {
      const { service } = makeService();
      await expect(service.setStatus('r1', 'booked')).resolves.toBeTruthy();
      await expect(service.setStatus('r1', 'whatever')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

describe('who can read the requests', () => {
  /**
   * THESE ROWS ARE OTHER PEOPLE'S DATA.
   *
   * A request holds a name, an organisation, an email address and a written description of a problem
   * inside somebody's company. Authentication alone is not enough - it would let any signed-in customer
   * read every prospect's request - so the back-office routes carry the platform-admin guard while the
   * request route stays public, because the person it exists for has no account.
   */
  const src = require('fs')
    .readFileSync(require('path').join(__dirname, 'coach.controller.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('asking is public, because the person asking has no account yet', () => {
    /* A limit sits between the two since A9: public, and not somewhere to sit and try. */
    expect(src).toMatch(/@Public\(\)\s*@Throttle\(\{ global: [^)]*\)\s*@Post\('request'\)/);
  });

  it('but reading them is platform admin only', () => {
    expect(src).toMatch(/@UseGuards\(PlatformAdminGuard\)\s*@Get\('requests'\)/);
  });

  it('and so is changing one', () => {
    expect(src).toMatch(/@UseGuards\(PlatformAdminGuard\)\s*@Patch\('requests\/:id'\)/);
  });

  it('and the public route is the only public one', () => {
    expect((src.match(/@Public\(\)/g) ?? []).length).toBe(1);
  });
});
