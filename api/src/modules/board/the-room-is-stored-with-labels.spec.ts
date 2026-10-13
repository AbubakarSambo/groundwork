import { GroundScenario, PartyType } from '@prisma/client';
import { boardAs, person, answered, A_RELEASED_REPORT, type Setup } from './the-switchboards-sections-harness';
import { BoardListener } from './board.listener';
import { theRoomsLabelFor } from './the-room-is-stored-with-labels';

/**
 * WHAT THE ROOM IS ABOUT IS STORED WITH LABELS, AND NAMES GO IN ONLY WHEN IT IS SERVED (decision 110, P9).
 *
 * The same room, stored once with names (as every row before this) and once with labels (as a row written now), is read by each reader and
 * must read the same: Sunday his own, Amaka and an admin every name, and nobody a name the walls kept from them. And what is written now holds
 * no name: the model is given labels and the stored room is labels.
 */
const PEOPLE = [
  person('p-amaka', 'u-amaka', 'Amaka', 'Nwachukwu', PartyType.INITIATOR),
  person('p-sunday', 'u-sunday', 'Sunday', 'Eze'),
  person('p-musa', 'u-musa', 'Musa', 'Danjuma'),
  person('p-yakubu', 'u-yakubu', 'Yakubu', 'Sani'),
];
const NAMES: Record<string, string> = { 'p-amaka': 'Amaka Nwachukwu', 'p-sunday': 'Sunday Eze', 'p-musa': 'Musa Danjuma', 'p-yakubu': 'Yakubu Sani' };
const L = (id: string) => theRoomsLabelFor(id);
const room = (who: (id: string) => string) => ({
  aims: [
    { aim: 'Sunday Eze is trying to catch up on the three repayments he missed.', held: [who('p-sunday')] },
    { aim: 'Musa Danjuma wants the grinding machine he was promised to be delivered.', held: [who('p-musa')] },
    { aim: 'The borrowers want the first repayment to start once the asset earns.', held: [who('p-sunday'), who('p-musa'), who('p-yakubu')] },
    { aim: 'The programme should learn when each asset starts earning.', held: [who('p-amaka')] },
  ],
  places: [{ name: 'Enugu', named: [who('p-sunday')] }, { name: 'Kaduna', named: [who('p-musa')] }],
  things: [{ name: 'tricycle', named: [who('p-yakubu')] }],
});
const setup = (stored: any): Setup => ({
  scenario: GroundScenario.OKR_ALIGNMENT, people: PEOPLE, initiatorId: 'u-amaka', peersVisibleToEachOther: false, room: stored, report: A_RELEASED_REPORT,
  checkIns: [answered('p-sunday', 1), answered('p-musa', 1), answered('p-yakubu', 1)],
});

describe('a room stored with labels reads the same as one stored with names', () => {
  it('a label nobody holds a name for is left out, never served', async () => {
    const stored = room(L);
    stored.aims.push({ aim: 'Somebody with no name on their row wants a thing.', held: [L('p-nobody')] } as any);
    const read = JSON.stringify((await boardAs(setup(stored), 'u-amaka', 'MEMBER')).whatTheRoomIsAbout);
    expect(read).not.toContain('person-');
    expect(read).not.toContain('Somebody with no name');
  });

  it('the labels are not the names', () => {
    expect(new Set(['p-amaka', 'p-sunday', 'p-musa', 'p-yakubu'].map(L)).size).toBe(4);
    for (const id of Object.keys(NAMES)) expect(L(id)).not.toContain(NAMES[id].split(' ')[0]);
  });

  for (const [who, userId, role] of [['Sunday', 'u-sunday', 'MEMBER'], ['Amaka, who runs it', 'u-amaka', 'MEMBER'], ['an admin', 'u-admin', 'ADMIN'], ['Musa', 'u-musa', 'MEMBER']] as const) {
    it(`${who} reads the same room either way`, async () => {
      const fromNames = (await boardAs(setup(room((id) => NAMES[id])), userId, role)).whatTheRoomIsAbout;
      const fromLabels = (await boardAs(setup(room(L)), userId, role)).whatTheRoomIsAbout;
      expect(fromLabels).toEqual(fromNames);
    });
  }

  it('Sunday reads none of Musa\'s or Yakubu\'s names or words, from the stored labels', async () => {
    const read = JSON.stringify((await boardAs(setup(room(L)), 'u-sunday', 'MEMBER')).whatTheRoomIsAbout);
    expect(read).not.toMatch(/Musa|Danjuma|Yakubu|Sani|Kaduna|tricycle|person-p-/);
    expect(read).toContain('You');
  });

  it('nobody is ever served a label where a name belonged', async () => {
    for (const [userId, role] of [['u-amaka', 'MEMBER'], ['u-admin', 'ADMIN'], ['u-sunday', 'MEMBER']] as const) {
      const read = JSON.stringify((await boardAs(setup(room(L)), userId, role)).whatTheRoomIsAbout);
      for (const id of Object.keys(NAMES)) expect(read).not.toContain(`"${L(id)}"`);
    }
  });
});

describe('what is written now', () => {
  it('holds no name: the model is given labels, and the stored room is the labels it answers with', async () => {
    const written: any[] = [];
    let given = '';
    const prisma: any = {
      recordEntry: { findMany: jest.fn(async () => [
        { text: 'I want to catch up on my three missed repayments.', participant: { id: 'p-sunday', nameGiven: null, user: { firstName: 'Sunday', lastName: 'Eze' } } },
        { text: 'I want the grinding machine I was promised.', participant: { id: 'p-musa', nameGiven: null, user: { firstName: 'Musa', lastName: 'Danjuma' } } },
      ]) },
      ground: { update: jest.fn(async ({ data }: any) => { written.push(data); return {}; }) },
    };
    const anthropic: any = { extract: jest.fn(async (_p: string, msgs: any[]) => {
      given = msgs[0].content;
      return { aims: [{ aim: 'Catch up on the missed repayments.', held: [L('p-sunday')] }, { aim: 'Get the machine delivered.', held: [L('p-musa')] }], places: [], things: [{ name: 'grinding machine', named: [L('p-musa')] }] };
    }) };
    const listener: any = new BoardListener(prisma, anthropic);
    await listener.readWhatTheRoomIsAbout({ groundId: 'g1', sessionNumber: 2 });
    expect(given).not.toMatch(/Sunday|Musa|Eze|Danjuma/);
    expect(given).toContain(L('p-sunday'));
    expect(JSON.stringify(written[0].whatTheRoomIsAbout)).not.toMatch(/Sunday|Musa|Eze|Danjuma/);
    expect(written[0].whatTheRoomIsAbout.aims[0].held).toEqual([L('p-sunday')]);
  });
});
