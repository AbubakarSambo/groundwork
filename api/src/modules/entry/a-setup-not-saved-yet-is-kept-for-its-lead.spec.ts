import { Prisma } from '@prisma/client';
import { EntryService } from './entry.service';

/**
 * A SETUP NOT SAVED YET IS KEPT ON THE SERVER, FOR ITS OWN LEAD (Hafsah's blocker, 31 October 2026: "nothing anyone says in setup is
 * ever lost").
 *
 * Round 5: the field lead's "Carry on" opened a setup with only its first question, and the startup lead was asked for his team's
 * emails again. The setup was kept only on the device. It is kept on the lead's own draft row too now, read and written by that lead
 * alone (the user id comes from the sign-in, never the request), and emptied once it is saved as a check-in.
 */
function makeService() {
  const rows = new Map<string, any>();
  const prisma: any = {
    entryDraft: {
      findUnique: jest.fn(async ({ where }: any) => rows.get(where.userId) ?? null),
      upsert: jest.fn(async ({ where, update, create }: any) => {
        const had = rows.get(where.userId);
        const row = had ? { ...had, ...update } : { ...create };
        rows.set(where.userId, row);
        return row;
      }),
    },
  };
  const service = new EntryService({} as any, prisma, {} as any, {} as any, {} as any, {} as any, { emit: jest.fn() } as any);
  return { service, prisma, rows };
}

const HIS_SETUP = { onboardingSelections: { initial: 'Track our farmer training.' }, onboardingHistory: [{ role: 'user', content: 'Kwame Owusu, Akua Boateng.' }], teamText: 'Kwame Owusu, kwame@field.test' };

describe('a setup not saved yet', () => {
  it('is kept for the lead who wrote it and read back whole, by that lead only', async () => {
    const { service } = makeService();
    await service.keepTheUnfinishedSetup('u-ama', HIS_SETUP);
    expect(await service.theUnfinishedSetup('u-ama')).toEqual(HIS_SETUP);
    expect(await service.theUnfinishedSetup('u-someone-else')).toBeNull();
  });

  it('a lead with no draft row gets one that holds nothing to save from, so the save makes the check-in from what the page sends', async () => {
    const { service, rows } = makeService();
    await service.keepTheUnfinishedSetup('u-ama', HIS_SETUP);
    const row = rows.get('u-ama');
    expect(row.payload).toEqual({});
    expect(row.history).toEqual([]);
    expect(row.consumedAt).toBeInstanceOf(Date);
  });

  it('thrown away, it is gone', async () => {
    const { service, prisma } = makeService();
    await service.keepTheUnfinishedSetup('u-ama', HIS_SETUP);
    await service.keepTheUnfinishedSetup('u-ama', null);
    expect(prisma.entryDraft.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ update: { unfinishedSetup: Prisma.DbNull } }));
  });

  it('is emptied once the setup is saved as a check-in', async () => {
    const { service } = makeService();
    const keep = jest.spyOn(service, 'keepTheUnfinishedSetup').mockResolvedValue();
    jest.spyOn(service as any, 'commitTheSetup').mockResolvedValue({ groundId: 'g1', joinToken: null, contributors: [], failedInvites: [] });
    const out = await service.commit('org1', 'u-ama', { groundLabel: 'Farmer training', history: [], contributors: [] } as any);
    expect(out.groundId).toBe('g1');
    expect(keep).toHaveBeenCalledWith('u-ama', null);
  });
});
