/**
 * The September target list existed because a seed file said so.
 *
 * Every period came from `seed-the-foundations.ts`, which meant a target list could
 * not be started, re-dated, renamed or followed by another one without a
 * deploy — and the list of companies on it was whatever they happened to be
 * created with. So the one thing the company actually decides was the one thing
 * the software held constant.
 */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OpsFoundationService } from './ops-foundation.service';
import { keyFromName, whyTheseDatesAreWrong } from './a-target-list-is-something-you-set';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('the dates a target list may run over', () => {
  it('accepts an ordinary stretch of time', () => {
    expect(whyTheseDatesAreWrong({ startsOn: day('2026-09-01'), endsOn: day('2026-09-30') })).toBeNull();
  });

  it('allows one day, because a one-day list is a real thing somebody runs', () => {
    expect(whyTheseDatesAreWrong({ startsOn: day('2026-09-01'), endsOn: day('2026-09-01') })).toBeNull();
  });

  it('refuses an end before a start, which is a typo rather than a short target list', () => {
    expect(whyTheseDatesAreWrong({ startsOn: day('2026-09-30'), endsOn: day('2026-09-01') })).toMatch(
      /cannot end before it starts/,
    );
  });

  it('catches a fat-fingered year rather than parking a target list at the top of every list', () => {
    expect(whyTheseDatesAreWrong({ startsOn: day('2026-09-01'), endsOn: day('2036-09-01') })).toMatch(
      /Check the year/,
    );
  });

  it('says which date is not a date', () => {
    expect(whyTheseDatesAreWrong({ startsOn: new Date('nonsense'), endsOn: day('2026-09-01') })).toMatch(
      /start date is not a date/,
    );
  });
});

describe('the key made from a name', () => {
  it('is readable, so a URL says which target list it is', () => {
    expect(keyFromName('September onboarding target list')).toBe('september-onboarding-target-list');
  });

  it('survives punctuation and casing', () => {
    expect(keyFromName('  Q4 — Two Names & More!  ')).toBe('q4-two-names-more');
  });

  it('never comes out empty, because an empty key is a broken route', () => {
    expect(keyFromName('!!!')).toBe('target-list');
  });
});

const serviceWith = (periods: Array<Record<string, unknown>>) => {
  const created: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];
  const service = new OpsFoundationService({
    opsPeriod: {
      findUnique: async ({ where }: never) =>
        periods.find((p) => p.key === (where as { key: string }).key) ?? null,
      create: async ({ data }: never) => {
        created.push(data as Record<string, unknown>);
        return data;
      },
      update: async ({ data }: never) => {
        updated.push(data as Record<string, unknown>);
        return data;
      },
    },
  } as never);
  return { service, created, updated };
};

describe('starting a target list', () => {
  const good = { name: 'September target list', startsOn: day('2026-09-01'), endsOn: day('2026-09-30') };

  it('writes it as a TARGET_LIST, planned, with a key from the name', async () => {
    const { service, created } = serviceWith([]);
    await service.startATargetList(good);
    expect(created[0]).toMatchObject({
      key: 'september-target-list',
      kind: 'TARGET_LIST',
      status: 'PLANNED',
    });
  });

  it('refuses a nameless targetList, because a board has to call it something', async () => {
    const { service } = serviceWith([]);
    await expect(service.startATargetList({ ...good, name: '  ' })).rejects.toThrow(BadRequestException);
  });

  it('refuses dates that cannot be true, in the same words the form uses', async () => {
    const { service } = serviceWith([]);
    await expect(
      service.startATargetList({ ...good, startsOn: day('2026-09-30'), endsOn: day('2026-09-01') }),
    ).rejects.toThrow(/cannot end before it starts/);
  });

  it('names the target list it would have collided with, rather than saying the key is taken', async () => {
    const { service } = serviceWith([{ key: 'september-target-list', name: 'September target list', kind: 'TARGET_LIST' }]);
    await expect(service.startATargetList(good)).rejects.toThrow(ConflictException);
    await expect(service.startATargetList(good)).rejects.toThrow(/already a period called "September target list"/);
  });
});

describe('re-dating a target list', () => {
  const september = {
    key: 'september-target-list',
    name: 'September target list',
    kind: 'TARGET_LIST',
    startsOn: day('2026-09-01'),
    endsOn: day('2026-09-30'),
  };

  it('moves the dates', async () => {
    const { service, updated } = serviceWith([september]);
    await service.resetATargetList('september-target-list', { endsOn: day('2026-10-15') });
    expect(updated[0]).toMatchObject({ endsOn: day('2026-10-15') });
  });

  it('judges a half-change against what is already stored, not against itself', async () => {
    /*
     * Moving ONLY the start date to after the stored end date is the way this
     * goes wrong. Checked against the patch alone it looks like a single valid
     * field; checked against the result it is a target list that ends before it
     * begins.
     */
    const { service } = serviceWith([september]);
    await expect(
      service.resetATargetList('september-target-list', { startsOn: day('2026-10-20') }),
    ).rejects.toThrow(/cannot end before it starts/);
  });

  it('never moves the key when the name changes', async () => {
    const { service, updated } = serviceWith([september]);
    await service.resetATargetList('september-target-list', { name: 'Autumn onboarding' });
    expect(updated[0]).toMatchObject({ name: 'Autumn onboarding' });
    expect(updated[0]).not.toHaveProperty('key');
  });

  it('refuses to move a quarter, and says why the calendar is not ours', async () => {
    const { service } = serviceWith([{ ...september, key: 'q4-2026', kind: 'QUARTER', name: 'Q4 2026' }]);
    await expect(service.resetATargetList('q4-2026', { endsOn: day('2027-02-01') })).rejects.toThrow(
      /Quarters follow the calendar/,
    );
  });

  it('says plainly when there is no such target list', async () => {
    const { service } = serviceWith([]);
    await expect(service.resetATargetList('nope', { name: 'x' })).rejects.toThrow(NotFoundException);
  });
});
