import { GroundScenario, PartyType } from '@prisma/client';
import { boardAs, person, answered, A_RELEASED_REPORT, type Setup } from './the-switchboards-sections-harness';

/**
 * DECISION 75, ITEM 14: WHAT THE ROOM IS ABOUT, WHERE PEOPLE DO NOT SEE EACH OTHER.
 *
 * The room's read is stored with names and never went through the report's wall. On a check-in with the people
 * kept apart, once the team's picture was shared, Sunday read "Musa Danjuma wants the grinding machine he was
 * promised to be delivered.", held by Musa, and Kaduna and the tricycle each named by one other borrower. The
 * people and their circumstances are run-25's loans cohort (api/journey/all-24/run-25/loans.json). The loans
 * check-in itself is a cohort, whose board has no room section; the same people on a check-in whose board has
 * one are read here, through the real board.
 */
const PEOPLE = [
  person('p-amaka', 'u-amaka', 'Amaka', 'Nwachukwu', PartyType.INITIATOR),
  person('p-sunday', 'u-sunday', 'Sunday', 'Eze'),
  person('p-musa', 'u-musa', 'Musa', 'Danjuma'),
  person('p-yakubu', 'u-yakubu', 'Yakubu', 'Sani'),
];
const ROOM = {
  aims: [
    { aim: 'Sunday Eze is trying to catch up on the three repayments he missed.', held: ['Sunday Eze'] },
    { aim: 'Musa Danjuma wants the grinding machine he was promised to be delivered.', held: ['Musa Danjuma'] },
    { aim: 'Yakubu Sani wants help after his tricycle was stolen.', held: ['Yakubu Sani'] },
    { aim: 'The borrowers want the first repayment to start once the asset earns.', held: ['Sunday Eze', 'Musa Danjuma', 'Yakubu Sani'] },
    { aim: 'Musa and Yakubu both want the field officer to answer their calls.', held: ['Musa Danjuma', 'Yakubu Sani'] },
    { aim: 'The programme should learn when each asset starts earning.', held: ['Amaka Nwachukwu'] },
  ],
  places: [
    { name: 'Enugu', named: ['Sunday Eze'] },
    { name: 'Kaduna', named: ['Musa Danjuma'] },
    { name: 'Jos', named: ['Yakubu Sani', 'Sunday Eze'] },
  ],
  things: [
    { name: 'grinding machine', named: ['Sunday Eze', 'Musa Danjuma'] },
    { name: 'tricycle', named: ['Yakubu Sani'] },
    { name: 'repayment schedule', named: ['Musa Danjuma', 'Yakubu Sani'] },
  ],
};
const setup = (peersVisibleToEachOther: boolean, scenario: GroundScenario = GroundScenario.OKR_ALIGNMENT): Setup => ({
  scenario, people: PEOPLE, initiatorId: 'u-amaka', peersVisibleToEachOther, room: ROOM, report: A_RELEASED_REPORT,
  checkIns: [answered('p-sunday', 1), answered('p-musa', 1), answered('p-yakubu', 1)],
});

describe('what the room is about, where people do not see each other', () => {
  it('Sunday reads his own aim, the aims several people hold and the lead\'s, and nothing about one other borrower', async () => {
    const room = (await boardAs(setup(false), 'u-sunday', 'MEMBER')).whatTheRoomIsAbout;
    expect(room.aims).toEqual([
      { aim: 'You are trying to catch up on the three repayments you missed.', held: ['You'] },
      { aim: 'The borrowers want the first repayment to start once the asset earns.', held: ['You'], andOthers: 2 },
      { aim: 'The programme should learn when each asset starts earning.', held: ['Amaka Nwachukwu'] },
    ]);
    expect(room.places).toEqual([{ name: 'Enugu', named: ['You'] }, { name: 'Jos', named: ['You'], andOthers: 1 }]);
    expect(room.things).toEqual([
      { name: 'grinding machine', named: ['You'], andOthers: 1 },
      { name: 'repayment schedule', named: [], andOthers: 2 },
    ]);
    const all = JSON.stringify(room);
    expect(all).not.toMatch(/Musa|Danjuma|Yakubu|Sani|Kaduna|tricycle|field officer/);
  });

  it('Amaka, who runs it, and an admin read the room whole, with every name', async () => {
    for (const [u, role] of [['u-amaka', 'MEMBER'], ['u-admin', 'ADMIN']]) {
      const room = (await boardAs(setup(false), u, role)).whatTheRoomIsAbout;
      expect(room.aims.map((a: any) => a.aim)).toContain('Musa Danjuma wants the grinding machine he was promised to be delivered.');
      expect(room.places.map((p: any) => p.name)).toEqual(['Enugu', 'Kaduna', 'Jos']);
      expect(room.things.find((t: any) => t.name === 'tricycle').named).toEqual(['Yakubu Sani']);
      expect(JSON.stringify(room)).not.toMatch(/andOthers/);
    }
  });

  it('where people see each other, Sunday reads the others by name, as before', async () => {
    const room = (await boardAs(setup(true), 'u-sunday', 'MEMBER')).whatTheRoomIsAbout;
    expect(room.aims.map((a: any) => a.aim)).toContain('Musa Danjuma wants the grinding machine he was promised to be delivered.');
    expect(room.things.find((t: any) => t.name === 'tricycle').named).toEqual(['Yakubu Sani']);
  });

  it('on the loans cohort itself, the board has no room section for anybody', async () => {
    for (const [u, role] of [['u-sunday', 'MEMBER'], ['u-amaka', 'MEMBER'], ['u-admin', 'ADMIN']]) {
      expect((await boardAs(setup(false, GroundScenario.COHORT_CHECK), u, role)).whatTheRoomIsAbout).toBeUndefined();
    }
  });
});
