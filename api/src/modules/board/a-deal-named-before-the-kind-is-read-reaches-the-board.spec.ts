import { GroundsService } from '../grounds/grounds.service';
import { BoardListener } from './board.listener';
import { GroundworkEvents } from '../../common/events';

/**
 * Local test of staging, 15 October. Hafsah set Drop Access's "Sales check-in" up from /start. Her first session finished as
 * the check-in was made, while the kind of work was still being read, so the records reading found no kind and kept
 * nothing: "Kevin has the Kilimani shop deal for 12 cartons in progress, no payment yet." never reached the deals board,
 * which said "No deals have come up yet." Once the kind is read, the finished sessions are read for their records.
 */
describe('a deal named before the kind of work was read still reaches the board', () => {
  it('reading a kind where there was none says so, once', async () => {
    const ground: any = { label: 'Sales check-in', brief: 'Kevin, Mercy and Peter sell water dispensers. Target 40 paid sales by 31 December.', kindOfWork: null, kindOfWorkSetBy: null };
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground), updateMany: jest.fn(async (a: any) => { Object.assign(ground, a.data); return { count: 1 }; }) },
      platformSetting: { findUnique: jest.fn(async () => null) },
    };
    const emitted: any[] = [];
    const events: any = { emit: (name: string, e: any) => emitted.push({ name, e }) };
    const svc = new GroundsService(prisma, {} as any, {} as any, events, {} as any, {} as any, { extract: jest.fn(async () => ({ kind: 'sales org' })) } as any);
    await svc.readTheKindOfWork('g-drop');
    expect(ground.kindOfWork).toBe('sales org');
    expect(emitted).toEqual([{ name: GroundworkEvents.KIND_OF_WORK_READ, e: { groundId: 'g-drop' } }]);

    /* A kind already there is not news: nothing is read again. */
    emitted.length = 0;
    await svc.readTheKindOfWork('g-drop');
    expect(emitted).toEqual([]);
  });

  it('the board then reads the finished session, and the Kilimani deal is kept', async () => {
    const created: any[] = [];
    const lines = [
      { id: 'e-1', participantId: 'p-hafsah', text: 'Kevin has the Kilimani shop deal for 12 cartons in progress, no payment yet.' },
      { id: 'e-2', participantId: 'p-hafsah', text: 'Mercy is waiting on Peter in finance to confirm the Westlands payment of KES 132,000. It has been 3 days.' },
    ];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ kindOfWork: 'sales org', workStages: null, participants: [
        { id: 'p-hafsah', nameGiven: null, user: { firstName: 'Hafsah', lastName: 'Jumare' } },
      ] })) },
      checkIn: { findMany: jest.fn(async () => [{ id: 'c-hafsah-1' }]) },
      recordEntry: { findMany: jest.fn(async ({ where }: any) => (where.checkInId === 'c-hafsah-1' ? lines : [])) },
      workItem: {
        findMany: jest.fn(async () => []),
        create: jest.fn(async (a: any) => { created.push(a.data); return { id: `w-${created.length}` }; }),
        update: jest.fn(async () => ({})),
      },
    };
    const offered = [
      { lineId: 'e-1', kind: 'deal', name: 'Kilimani shop', stage: null },
      { lineId: 'e-2', kind: 'deal', name: 'Westlands', stage: null },
    ];
    const listener = new BoardListener(prisma, { extract: jest.fn(async () => ({ records: offered })) } as any);
    await listener.onKindOfWorkRead({ groundId: 'g-drop' });
    console.log(`ON THE DEALS BOARD: ${created.map((c) => c.name).join(', ')}`);
    expect(prisma.checkIn.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { groundId: 'g-drop', status: 'COMPLETED' } }));
    expect(created.map((c) => c.name)).toContain('Kilimani shop');
  });
});
