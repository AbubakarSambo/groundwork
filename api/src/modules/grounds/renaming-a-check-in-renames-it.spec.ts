import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GroundsService } from './grounds.service';

/**
 * RENAMING A CHECK-IN RENAMES IT.
 *
 * The DTO documented `label` as "Rename the ground", the rail sent it, and `updateTimeline`'s
 * `data` block never included it. So renaming did nothing - and because the rail invalidates and
 * refetches straight after, the old name came back on screen a moment later. It read as the
 * product forgetting what you had just typed.
 *
 * Advertised in the API, called by the UI, and not implemented is the worst of the three states:
 * a deletion would at least have been honest.
 */
describe('GW-RENAME: renaming a check-in', () => {
  function makeService(ground: any = {}, viewer: any = { role: 'MEMBER', organizationId: 'org1' }) {
    const g = {
      id: 'g1', organizationId: 'org1', scenario: 'NEW_PROJECT', initiatorId: 'u-lead', label: 'The old name',
      timelineDays: 90, timelineWeeks: 13, cadence: 'FORTNIGHTLY', mode: 'SHARED',
      groundAuditLog: null, ...ground,
    };
    const updated = jest.fn(async (args: any) => ({ ...g, ...args.data }));
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => g), update: updated },
      groundParticipant: { findFirst: jest.fn(async () => ({ id: 'p1' })) },
      user: { findUnique: jest.fn(async () => viewer) },
      checkIn: { findFirst: jest.fn(async () => null) },
    };
    const service = new GroundsService(
      prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    return { service, prisma, updated };
  }

  it('THE ONE THAT MATTERS: the new name is written', async () => {
    const { service, updated } = makeService();
    await service.updateTimeline('g1', 'u-lead', { label: 'A better name' });
    expect(updated).toHaveBeenCalled();
    expect(updated.mock.calls[0][0].data.label).toBe('A better name');
  });

  it('trimmed, so a stray space does not become the name', async () => {
    const { service, updated } = makeService();
    await service.updateTimeline('g1', 'u-lead', { label: '  Padded  ' });
    expect(updated.mock.calls[0][0].data.label).toBe('Padded');
  });

  it('a blank name is refused rather than quietly ignored', async () => {
    const { service } = makeService();
    await expect(service.updateTimeline('g1', 'u-lead', { label: '   ' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('and the refusal says what to do about it', async () => {
    const { service } = makeService();
    await expect(service.updateTimeline('g1', 'u-lead', { label: '' }))
      .rejects.toThrow(/needs a name/i);
  });

  it('a party who is not the lead cannot rename somebody elses check-in', async () => {
    // Same class of change as moving the dates: it is what everyone else sees this as.
    const { service } = makeService();
    await expect(service.updateTimeline('g1', 'u-participant', { label: 'Mine now' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('but an admin in the same organisation can, as they can with the schedule', async () => {
    const { service, updated } = makeService({}, { role: 'ADMIN', organizationId: 'org1' });
    await service.updateTimeline('g1', 'u-someone-else', { label: 'Renamed by admin' });
    expect(updated.mock.calls[0][0].data.label).toBe('Renamed by admin');
  });

  it('the change is audited, with what it was before', async () => {
    const { service, updated } = makeService();
    await service.updateTimeline('g1', 'u-lead', { label: 'A better name' });
    const log = updated.mock.calls[0][0].data.groundAuditLog;
    const entry = log.timeline.find((e: any) => e.changes?.label);
    expect(entry.changes.label).toEqual({ from: 'The old name', to: 'A better name' });
    expect(entry.changedBy).toBe('u-lead');
  });

  it('and renaming nothing does not touch the label', async () => {
    const { service, updated } = makeService();
    await service.updateTimeline('g1', 'u-lead', { contextNote: 'just a note' });
    expect(updated.mock.calls[0][0].data.label).toBeUndefined();
  });
});
