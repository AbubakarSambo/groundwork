import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PATTERN_REACH_KEY, patternReachInForce, setPatternReachInForce } from '../patterns/who-reads-a-pattern';

/**
 * WHO A PATTERN REACHES IS ONE SETTING, READ AND SET BY A PLATFORM ADMIN (decision 74, item 2).
 *
 * A database with no row reads as the person only. Setting it writes the `patterns.reach` row and
 * puts the new reach in force on this copy of the API at once. Anything but the two exact words is
 * refused in a plain sentence, and nothing is written.
 */
function serviceWith(row: { value: unknown } | null) {
  const upsert = jest.fn(async () => ({}));
  const prisma: any = { platformSetting: { findUnique: jest.fn(async () => row), upsert } };
  return { service: new AdminService(prisma, {} as any, {} as any), upsert };
}

afterEach(() => setPatternReachInForce('PERSON_ONLY'));

describe('the admin setting for who a pattern reaches', () => {
  it('reads as the person only when there is no row, in a plain sentence', async () => {
    const { service } = serviceWith(null);
    await expect(service.getPatternReach()).resolves.toEqual({
      reach: 'PERSON_ONLY',
      says: 'A pattern reaches only the person it is about. Nobody else reads it, not the lead and not an admin.',
    });
  });

  it('reads the wider reach when the row says so', async () => {
    const { service } = serviceWith({ value: 'PERSON_FIRST_THEN_LEAD' });
    await expect(service.getPatternReach()).resolves.toEqual({
      reach: 'PERSON_FIRST_THEN_LEAD',
      says: 'A pattern reaches the person it is about first. The lead reads it after the person has answered, or a few days later.',
    });
  });

  it('setting it writes the row, says who set it, and puts it in force at once', async () => {
    const { service, upsert } = serviceWith(null);
    await service.setPatternReach('PERSON_FIRST_THEN_LEAD', 'u-platform-admin');
    expect(upsert).toHaveBeenCalledWith({
      where: { key: PATTERN_REACH_KEY },
      create: { key: PATTERN_REACH_KEY, value: 'PERSON_FIRST_THEN_LEAD', updatedBy: 'u-platform-admin' },
      update: { value: 'PERSON_FIRST_THEN_LEAD', updatedBy: 'u-platform-admin' },
    });
    expect(patternReachInForce()).toBe('PERSON_FIRST_THEN_LEAD');
    await service.setPatternReach('PERSON_ONLY', 'u-platform-admin');
    expect(patternReachInForce()).toBe('PERSON_ONLY');
  });

  it('anything else is refused in a plain sentence, and nothing is written', async () => {
    const { service, upsert } = serviceWith(null);
    for (const bad of ['EVERYBODY', 'person_only', true, null, undefined, { reach: 'PERSON_ONLY' }]) {
      await expect(service.setPatternReach(bad, 'u-platform-admin')).rejects.toThrow(BadRequestException);
    }
    await expect(service.setPatternReach('nonsense', 'u')).rejects.toThrow(
      'Send reach as PERSON_ONLY, so a pattern reaches only the person it is about, or as PERSON_FIRST_THEN_LEAD, so the lead reads it after the person has had their turn.',
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(patternReachInForce()).toBe('PERSON_ONLY');
  });
});
