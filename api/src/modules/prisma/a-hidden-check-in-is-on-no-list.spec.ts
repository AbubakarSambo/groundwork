import { aHiddenCheckInIsOnNoList as rule } from './a-hidden-check-in-is-on-no-list';

const aHiddenCheckInIsOnNoList = (p: any): any => rule(p);

/** A check-in taken off everyone's lists (Hafsah, 22 November 2026) is on no list or count, and its record still reads whole. */
describe('a hidden check-in is on no list', () => {
  it('every list and count of check-ins skips hidden ones, whatever else it asks', () => {
    for (const action of ['findMany', 'count', 'groupBy', 'aggregate']) {
      expect(aHiddenCheckInIsOnNoList({ model: 'Ground', action, args: { where: { organizationId: 'o1' } } }).args.where)
        .toEqual({ AND: [{ organizationId: 'o1' }, { hiddenAt: null }] });
    }
    expect(aHiddenCheckInIsOnNoList({ model: 'Ground', action: 'findMany', args: {} }).args.where).toEqual({ hiddenAt: null });
    expect(aHiddenCheckInIsOnNoList({ model: 'Ground', action: 'findMany' }).args.where).toEqual({ hiddenAt: null });
  });

  it('sessions listed across check-ins skip the hidden ones; sessions read inside one check-in are left whole', () => {
    expect(aHiddenCheckInIsOnNoList({ model: 'CheckIn', action: 'findMany', args: { where: { participant: { userId: 'u1' } } } }).args.where)
      .toEqual({ AND: [{ participant: { userId: 'u1' } }, { ground: { hiddenAt: null } }] });
    const inOne = { model: 'CheckIn', action: 'findMany', args: { where: { groundId: 'g1' } } };
    expect(aHiddenCheckInIsOnNoList(inOne)).toBe(inOne);
  });

  it('opening one check-in, writing, and a read that asks about hidden ones itself are untouched', () => {
    for (const p of [
      { model: 'Ground', action: 'findUnique', args: { where: { id: 'g1' } } },
      { model: 'Ground', action: 'update', args: { where: { id: 'g1' }, data: { hiddenAt: new Date() } } },
      { model: 'Ground', action: 'findMany', args: { where: { hiddenAt: { not: null } } } },
      { model: 'User', action: 'findMany', args: { where: {} } },
    ]) expect(aHiddenCheckInIsOnNoList(p)).toBe(p);
  });
});
