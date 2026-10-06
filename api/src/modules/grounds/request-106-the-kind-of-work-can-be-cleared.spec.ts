import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { GroundsController } from './grounds.controller';

/**
 * REQUEST 106: WHOEVER MAY SET A CHECK-IN'S KIND OF WORK MAY ALSO CLEAR IT.
 *
 * A lead who chose a kind of work by mistake sets it back to none by sending `kind: null` to
 * `PATCH /grounds/:id/kind-of-work`. The same rule decides who may clear it as who may set it: the
 * lead, or an admin of the organisation (only with access, on an evaluation check-in). Nobody else.
 * Once cleared by the lead, a later read of the setup words never puts a kind back.
 */
function build(ground: Record<string, any>, viewer: Record<string, any> = { role: 'MEMBER', organizationId: 'org1' }, answer: any = { kind: 'sales org' }) {
  const updates: any[] = [];
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ground),
      updateMany: jest.fn(async (a: any) => { const by = ground.kindOfWorkSetBy ?? null; if (by !== null && by !== 'read') return { count: 0 }; updates.push(a.data); Object.assign(ground, a.data); return { count: 1 }; }),
      update: jest.fn(async (a: any) => {
        updates.push(a.data);
        Object.assign(ground, a.data);
        return { id: 'g1', kindOfWork: ground.kindOfWork ?? null, kindOfWorkSetBy: ground.kindOfWorkSetBy ?? null, workStages: ground.workStages ?? null };
      }),
    },
    user: { findUnique: jest.fn(async () => viewer) },
  };
  const anthropic: any = { extract: jest.fn(async () => answer) };
  const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, anthropic);
  return { svc, updates, anthropic, ground };
}

const aTeamCheckIn = () => ({
  initiatorId: 'lead',
  organizationId: 'org1',
  /* A team check-in. It was NEW_HIRE until decision 75, item 25 made a new hire's first 90 days an evaluation
     check-in, where an admin without access is refused (proved in the last test here). */
  scenario: 'NEW_PROJECT',
  createdByUserId: 'lead',
  participants: [{ userId: 'rukia' }],
  label: 'Help a new hire get started, from 27 September',
  brief: 'Our reps sell freezers to butcheries.',
  kindOfWork: 'marketview q4',
  kindOfWorkSetBy: 'lead',
  workStages: null,
});

describe('request 106: the kind of work can be set back to none', () => {
  it('lets the lead clear it with null, and keeps it as the lead\'s own choice', async () => {
    const { svc, updates } = build(aTeamCheckIn());
    const set = await svc.setKindOfWork('g1', 'lead', { kind: null });
    expect(set).toMatchObject({ kindOfWork: null, kindOfWorkSetBy: 'lead' });
    expect(updates).toEqual([{ kindOfWork: null, kindOfWorkSetBy: 'lead' }]);
  });

  it('never reads a kind back over the lead\'s none', async () => {
    const { svc, updates, anthropic } = build(aTeamCheckIn());
    await svc.setKindOfWork('g1', 'lead', { kind: null });
    await svc.readTheKindOfWork('g1');
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(updates).toEqual([{ kindOfWork: null, kindOfWorkSetBy: 'lead' }]);
  });

  it('lets an admin of the organisation clear it, as they may set it', async () => {
    const { svc, updates } = build(aTeamCheckIn(), { role: 'ADMIN', organizationId: 'org1' });
    const set = await svc.setKindOfWork('g1', 'an-admin', { kind: null });
    expect(set.kindOfWork).toBeNull();
    expect(updates).toHaveLength(1);
  });

  it('refuses a participant, an admin of another organisation, and an admin without access to an evaluation check-in, and changes nothing', async () => {
    const cases: Array<[Record<string, any>, Record<string, any>, string]> = [
      [aTeamCheckIn(), { role: 'MEMBER', organizationId: 'org1' }, 'rukia'],
      [aTeamCheckIn(), { role: 'ADMIN', organizationId: 'org2' }, 'another-admin'],
      [{ ...aTeamCheckIn(), scenario: 'PIP' }, { role: 'ADMIN', organizationId: 'org1' }, 'an-admin'],
    ];
    for (const [ground, viewer, who] of cases) {
      const { svc, updates } = build(ground, viewer);
      await expect(svc.setKindOfWork('g1', who, { kind: null })).rejects.toThrow(
        'Only the lead of this check-in, or an admin in this organisation, can change this.',
      );
      expect(updates).toEqual([]);
      expect(ground.kindOfWork).toBe('marketview q4');
    }
  });

  it('leaves the kind alone when only the stage names are sent', async () => {
    const { svc, updates } = build(aTeamCheckIn());
    await svc.setKindOfWork('g1', 'lead', { stages: ['Called', 'Paid'] });
    expect(updates).toEqual([{ workStages: ['Called', 'Paid'] }]);
  });

  it('lets null through the route and the app\'s own validation, to the service', async () => {
    const types = Reflect.getMetadata('design:paramtypes', GroundsController.prototype, 'setKindOfWork');
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } });
    const body = await pipe.transform({ kind: null }, { type: 'body', metatype: types[2], data: undefined });
    expect(body).toEqual({ kind: null });
    const grounds: any = { setKindOfWork: jest.fn(async () => ({ id: 'g1', kindOfWork: null })) };
    const controller = Object.create(GroundsController.prototype);
    controller.grounds = grounds;
    await controller.setKindOfWork('g1', 'lead', body);
    expect(grounds.setKindOfWork).toHaveBeenCalledWith('g1', 'lead', { kind: null });
  });
});
