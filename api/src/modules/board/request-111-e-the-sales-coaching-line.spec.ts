import { RoleFunction, roleMapFor } from './role-maps';

/**
 * SCREENS REQUEST 111 (e): THE COACHING LINE A REP READS ABOUT HOW SALES WORK GETS READ.
 *
 * Amani, who sells for "Sales team, Q3", read on her board on 2 October 2026: "You are made to feel like a
 * failure by a broken internal clock...". "A broken internal clock" is jargon, and "made to feel like a
 * failure" is a read on how she feels, which nothing she said holds. The line is the sales role map's own,
 * and the coaching note words it for her, so it is fixed at the map, in place (decision 55).
 */
describe('the sales role map says what happens, plainly', () => {
  const line = roleMapFor(RoleFunction.SALES as any)!.protectAgainst;

  it('reads as the prototype-style plain sentences the screens workspace asked for', () => {
    expect(line).toBe('Buyers take weeks to decide, and the person selling cannot see most of that time. A week of silence usually means the buyer is still deciding, not that they said no.');
  });

  it('says nothing about how anybody feels, and no map does', () => {
    for (const fn of Object.values(RoleFunction)) {
      const map = roleMapFor(fn as any);
      if (!map) continue;
      expect(map.protectAgainst).not.toMatch(/made to feel|feel like a failure|internal clock/i);
    }
  });
});
