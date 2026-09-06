/**
 * "THE OBJECTIVE FOR SEPTEMBER IS A STABLE PRODUCT, NO MORE ADDITIONS OR
 * MODIFICATIONS. PURELY MAKE WHAT EXISTS WORK FOR THE USE CASES."
 *
 * That was an instruction somebody had to remember. This is it enforced — and
 * enforced by routing rather than refusing, because a hard block is worked
 * around inside a week: the new function gets filed as a bug fix, and the freeze
 * has cost the honesty as well as the feature.
 */
import { BadRequestException } from '@nestjs/common';
import { OpsFreezeService } from './ops-freeze.service';
import { PERMITTED_WHILE_FROZEN, hasOutlivedItsDate, whyThisNeedsAnException } from './the-freeze';

const FROZEN = { isOn: true, because: 'September is for making what exists work.' };

describe('what the freeze lets through', () => {
  it('lets through making an unsupported use case work — the instruction itself', () => {
    expect(whyThisNeedsAnException(FROZEN, { serves: 'SALES', theUseCaseIsUnsupported: true })).toBeNull();
  });

  it('lets through keeping it up, which is not an addition by any reading', () => {
    expect(whyThisNeedsAnException(FROZEN, { serves: 'KEEPING_IT_UP' })).toBeNull();
  });

  it('stops the moat, and says why rather than saying no', () => {
    /* The phase-one priority says "stability and moat"; the September sentence
       says "no more additions". Moat work is usually new function, so they pull
       opposite ways and the September sentence wins. Decided 2026-09-05. */
    const why = whyThisNeedsAnException(FROZEN, { serves: 'MOAT' });
    expect(why).toMatch(/phase four/);
    expect(why).toMatch(/September is for making what exists work/);
  });

  it('stops unlocking a new customer, which is an addition however it is framed', () => {
    expect(whyThisNeedsAnException(FROZEN, { serves: 'UNLOCKS_A_CUSTOMER' })).toMatch(/addition/);
  });

  it('stops sales work aimed at a use case that already works', () => {
    /*
     * The subtle one. "Serves sales" is the permitted label, and pointing it at
     * something already supported is an improvement to something fine — an
     * addition wearing a permitted label, which is the shape the freeze would
     * otherwise be worked around in.
     */
    expect(whyThisNeedsAnException(FROZEN, { serves: 'SALES', theUseCaseIsUnsupported: false })).toMatch(
      /already supported/,
    );
  });

  it('quotes the reason every time, because the reader is usually the proposer', () => {
    for (const serves of ['MOAT', 'UNLOCKS_A_CUSTOMER'] as const) {
      expect(whyThisNeedsAnException(FROZEN, { serves })).toContain(FROZEN.because);
    }
  });
});

describe('with nothing frozen', () => {
  it('lets everything through', () => {
    for (const serves of ['SALES', 'MOAT', 'UNLOCKS_A_CUSTOMER', 'KEEPING_IT_UP'] as const) {
      expect(whyThisNeedsAnException(null, { serves })).toBeNull();
      expect(whyThisNeedsAnException({ ...FROZEN, isOn: false }, { serves })).toBeNull();
    }
  });

  it('and the permitted list is not empty, so the tests above are not passing on nothing', () => {
    expect(PERMITTED_WHILE_FROZEN.length).toBeGreaterThan(0);
  });
});

describe('a freeze past its date', () => {
  const until = new Date('2026-10-31');

  it('is said rather than lifted', () => {
    /* A freeze that lifts itself ends without anybody deciding it should. The
       date exists to force the conversation, not to replace it. */
    expect(hasOutlivedItsDate({ ...FROZEN, until }, new Date('2026-11-05'))).toBe(true);
    expect(whyThisNeedsAnException({ ...FROZEN, until }, { serves: 'MOAT' })).toBeTruthy();
  });

  it('is not overdue before its date', () => {
    expect(hasOutlivedItsDate({ ...FROZEN, until }, new Date('2026-10-01'))).toBe(false);
  });

  it('and one with no date never goes overdue', () => {
    expect(hasOutlivedItsDate(FROZEN, new Date('2030-01-01'))).toBe(false);
  });
});

const serviceOver = (rows: Array<Record<string, unknown>>) => {
  const written: Record<string, unknown>[] = [];
  const service = new OpsFreezeService({
    opsFreeze: {
      findFirst: async () => rows[0] ?? null,
      findMany: async () => rows,
      create: async ({ data }: never) => {
        written.push(data as Record<string, unknown>);
        return data;
      },
    },
  } as never);
  return { service, written };
};

describe('deciding it', () => {
  it('says nothing is frozen on a system nobody has decided about', async () => {
    const { service } = serviceOver([]);
    expect(await service.current()).toMatchObject({ isOn: false });
  });

  it('records turning it on, with the reason everybody will read', async () => {
    const { service, written } = serviceOver([]);
    await service.decide({ isOn: true, because: 'September is for making what exists work.' }, 'hafsah');
    expect(written[0]).toMatchObject({ isOn: true, decidedById: 'hafsah' });
  });

  it('refuses to turn it on without saying what it is for', async () => {
    const { service } = serviceOver([]);
    await expect(service.decide({ isOn: true, because: '  ' }, 'hafsah')).rejects.toThrow(BadRequestException);
  });

  it('refuses to LIFT it without a reason, which is the one done in a hurry', async () => {
    const { service } = serviceOver([{ isOn: true, because: 'x', decidedAt: new Date() }]);
    await expect(service.decide({ isOn: false, because: '' }, 'james')).rejects.toThrow(
      /stops doing what it agreed to do/,
    );
  });

  it('never edits — lifting writes a second decision, so both have a name on them', async () => {
    const { service, written } = serviceOver([{ isOn: true, because: 'x', decidedAt: new Date() }]);
    await service.decide({ isOn: false, because: 'October, and the ten are onboarded.' }, 'hafsah');
    expect(written[0]).toMatchObject({ isOn: false });
  });

  it('says so when it is past its date', async () => {
    const { service } = serviceOver([
      { isOn: true, because: 'x', until: new Date('2026-01-01'), decidedAt: new Date() },
    ]);
    expect((await service.current()).says).toMatch(/past the date/);
  });
});
