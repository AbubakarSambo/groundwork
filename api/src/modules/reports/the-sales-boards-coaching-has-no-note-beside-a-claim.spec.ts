import { ReportsService } from './reports.service';
import { everyColleaguesFaultAsTheirAccount } from '../conversation/a-colleagues-fault-is-the-speakers-account';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 15. Amina Otieno, an admin, read in the probes served on the sales board with
 * Release 1 on: "Joseph Kariuki says the work has been waiting on Grace Achieng for an answer on the KES 4,500 price since 14
 * October." The
 * board itself already had no such note (Hafsah's answer 5); the coaching served on it now follows it.
 */
const PROBE = 'Joseph Kariuki has been waiting on Grace Achieng for an answer on the KES 4,500 price since 14 October. Ask what that is waiting on.';
const HELD = {
  people: ['Grace Achieng', 'Kevin Omondi', 'Mercy Wairimu', 'Joseph Kariuki'],
  lead: 'Grace Achieng',
  waits: [{ by: 'Joseph Kariuki', on: 'Grace Achieng', what: 'an answer on the KES 4,500 price', confirmed: false, triedSaid: null }],
  theirOwnWords: [],
  speaker: null,
} as any;

describe('the coaching on Release 1\'s sales board has no note beside a claim', () => {
  it('elsewhere: the claim is Joseph\'s account, and with nothing he said he tried, nothing beside it', () => {
    /* Changed 3 November (Hafsah, F2: silence is never a finding): "Not backed: no attempt to unblock mentioned" is gone; the note is what they said they tried, in full, or nothing. */
    const out = String(everyColleaguesFaultAsTheirAccount([PROBE], HELD).value);
    expect(out).toContain('Joseph Kariuki says the work has been waiting on Grace Achieng for an answer on the KES 4,500 price since 14 October.');
    expect(out).not.toMatch(/Not backed|could have messaged/);
  });

  it('with the note off, the claim is still Joseph\'s account, and no "Not backed:" or "Tried:"', () => {
    const out = String(everyColleaguesFaultAsTheirAccount([PROBE], { ...HELD, withTheNote: false }).value);
    expect(out).toContain('Joseph Kariuki says the work has been waiting on Grace Achieng for an answer on the KES 4,500 price since 14 October.');
    expect(out).not.toMatch(/Not backed|Tried:|could have messaged/);
  });

  it('Amina\'s board read: the probes are checked with the note off where the sales board is on', async () => {
    const service = Object.create(ReportsService.prototype) as any;
    const ground = { id: 'g', kindOfWork: 'sales team', organizationId: 'o', cadence: 'DAILY', initiatorId: 'u-grace', participants: [{ id: 'p-grace', userId: 'u-grace', partyType: 'INITIATOR', user: { firstName: 'Grace', lastName: 'Achieng' } }] };
    service.prisma = {
      ground: { findUnique: jest.fn(async (a: any) => (a?.select?.organizationId ? { organizationId: 'o' } : ground)) },
      organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true })) },
    };
    service.logger = { warn: jest.fn(), log: jest.fn() };
    service.peersAreNamed = () => true;
    service.whatToProbeOn = jest.fn(async () => [{ who: 'Joseph Kariuki', probe: [PROBE] }]);
    service.theBlameHeld = jest.fn(async () => HELD);
    const seen: any[] = [];
    service.readAsItWillBeRead = jest.fn((v: any, _g: string, _w: string, _r: string[], blame: any) => { seen.push(blame); return v; });
    await service.coachingForTheBoard('g', 'u-amina', { adminReadsIt: true });
    expect(seen.some((b) => b && b.withTheNote === false)).toBe(true);
    service.prisma.organization.findUnique = jest.fn(async () => ({ release1SalesBoardOn: false }));
    seen.length = 0;
    await service.coachingForTheBoard('g', 'u-amina', { adminReadsIt: true });
    expect(seen.every((b) => !b || b.withTheNote !== false)).toBe(true);
  });
});
