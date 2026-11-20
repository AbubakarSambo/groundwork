import 'reflect-metadata';
import { GroundsService } from './grounds.service';
import { theTypeOnRecord } from '../board/the-switchboard';

/**
 * "GROUNDWORK DOES NOT OFFER THAT KIND OF WORK YET" FOR THE LITIGATION DAILY (messages test, 19 October, finding 19).
 *
 * Muchemi & Co. (test), Monday 12 October. Wanjiru's "Litigation team daily" (a pulse check, daily) was to be given the kind of work "a
 * law firm matter", which the switchboard reads as a legal matter and so serves the matter board, and through which a fee note falls due
 * when the check-in reports the event it waits for. PATCH /grounds/:id/kind-of-work refused it ("Groundwork does not offer that kind of
 * work yet."), because the kinds offered to every organisation are the sales and engineering ones, and setup's own read would have dropped
 * it the same way. So the litigation check-in ran with no kind of work, never read as a legal matter, and FN-005 never fell due when Brian
 * said the reply was filed. Where the organisation's Release 2 switch is on, a kind the switchboard needs for a Release 2 board may be
 * given; elsewhere nothing changes.
 */
function build(release2On: boolean, answer: any = { kind: 'a law firm matter' }) {
  const ground: any = {
    id: 'lit', initiatorId: 'u-wanjiru', organizationId: 'org-muchemi', scenario: 'PULSE_CHECK', createdByUserId: 'u-wanjiru', participants: [],
    label: 'Litigation team daily', brief: 'What moved on our matters today, and what is due in court.', kindOfWork: null, kindOfWorkSetBy: null, workStages: null,
  };
  const updates: any[] = [];
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ground),
      update: jest.fn(async (a: any) => { updates.push(a.data); Object.assign(ground, a.data); return { id: 'lit', kindOfWork: ground.kindOfWork, kindOfWorkSetBy: ground.kindOfWorkSetBy, workStages: null }; }),
      updateMany: jest.fn(async (a: any) => { updates.push(a.data); Object.assign(ground, a.data); return { count: 1 }; }),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', organizationId: 'org-muchemi', isActive: true, firstName: 'Wanjiru', lastName: 'Muchemi' })) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true, release2CollectionsOn: release2On })) },
    platformSetting: { findUnique: jest.fn(async () => null) },
  };
  const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { extract: jest.fn(async () => answer) } as any);
  return { svc, ground, updates };
}

describe('a law firm matter may be given where Release 2 is on', () => {
  it('Wanjiru sets "a law firm matter" on the litigation daily, and it reads as a legal matter', async () => {
    const { svc, ground } = build(true);
    await expect(svc.setKindOfWork('lit', 'u-wanjiru', { kind: 'a law firm matter' })).resolves.toMatchObject({ kindOfWork: 'a law firm matter', kindOfWorkSetBy: 'lead' });
    expect(theTypeOnRecord(ground).type).toBe('legal matter');
  });

  it('setup reads it from her words and keeps it', async () => {
    const { svc, ground } = build(true);
    await svc.readTheKindOfWork('lit');
    expect(ground.kindOfWork).toBe('a law firm matter');
    expect(ground.kindOfWorkSetBy).toBe('read');
  });

  it('where the stored Release 2 switch says off, it is given all the same (every kind of work is offered, 15 November 2026)', async () => {
    const { svc } = build(false);
    await expect(svc.setKindOfWork('lit', 'u-wanjiru', { kind: 'a law firm matter' })).resolves.toMatchObject({ kindOfWork: 'a law firm matter', kindOfWorkSetBy: 'lead' });
  });
});
