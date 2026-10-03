import { PartyType } from '@prisma/client';
import { boardAs, SALES_RUN, A_RELEASED_REPORT, BISI, FEMI, KWAME, JUMA, type Setup } from './the-switchboards-sections-harness';
import { theRoomAsThisReaderReadsIt } from './the-room-as-each-reader-reads-it';
import { withNames, labelsForParties, namesVisibleTo } from '../reports/party-labels';

/**
 * RUN-25: WHAT THE ROOM IS ABOUT, AND THE AIMS, AS EACH READER READS THEM.
 *
 * Sales, session 2. Femi read on his own board "Femi Okonkwo is trying to get twelve approved facilities by
 * collecting as many strong applications as possible." where "you" belongs, and two rows with nothing in them,
 * `{ "aim": "", "held": ["Kwame Mensah"] }`, where his colleagues' aims had been taken out. Bisi read among the aims
 * "Kwame Mensah's own aim is 42 million naira, and I'm aiming to achieve that by the end of the quarter." (Kwame's own
 * words glued onto a sentence about him) and "Femi Okonkwo will follow up with the customers to get five bank
 * statements. Femi Okonkwo set this aim." (a commitment, not an aim). Cofounder and drift had the same fault in the
 * room: Tunde read "Tunde Bakare is responsible for ..." and Zainab read "Zainab Suleiman is worried that she ...".
 */
const ROOM = {
  aims: [
    { aim: "The team's goal is to approve 40 facilities and disburse N120 million this quarter.", held: ['Bisi Adeyemi', 'Ngozi Eze'] },
    { aim: 'Femi Okonkwo is trying to get twelve approved facilities by collecting as many strong applications as possible.', held: ['Femi Okonkwo'] },
    { aim: 'Kwame Mensah is trying to get 14 facilities approved and 42 million naira disbursed.', held: ['Kwame Mensah'] },
    { aim: 'Ngozi Eze is trying to get 14 facilities approved and N40 million disbursed.', held: ['Ngozi Eze'] },
  ],
  places: [{ name: 'the mainland', named: ['Femi Okonkwo'] }],
  things: [{ name: 'bank statement', named: ['Femi Okonkwo'] }],
};
const target = (id: string, name: string, n: number, owner: string | null, setBy: string | null) => ({
  id, groundId: 'g-1', name, target: n, count: 0, prevCount: 0, ownerParticipantId: owner, setByParticipantId: setBy,
  direction: null, isADecisionAboutAPerson: false, sortOrder: owner ? 1 : 0, addedAtSession: null, assumes: [], suggestedCount: null, suggestedSaid: null,
});
const OBJECTIVES = [
  target('o-team', 'approved facilities', 40, null, 'p-bisi'),
  target('o-kwame-14', "I'm aiming for 14 approved facilities this quarter.", 14, 'p-kwame', 'p-kwame'),
  target('o-kwame-42', "My personal disbursement goal is 42 million naira, and I'm aiming to achieve that by the end of the quarter.", 42_000_000, 'p-kwame', 'p-kwame'),
  target('o-ngozi-40', 'N40 million disbursed by the end of the quarter', 40_000_000, 'p-ngozi', 'p-ngozi'),
  target('o-femi-12', 'My primary goal is to get twelve approved facilities this quarter.', 12, 'p-femi', 'p-femi'),
  target('o-femi-5', 'I will follow up with my customers to get five bank statements.', 5, 'p-femi', 'p-femi'),
];
const RUN: Setup = { ...SALES_RUN, room: ROOM, objectives: OBJECTIVES, report: A_RELEASED_REPORT };
const board = (who: readonly [string, string]) => boardAs(RUN, who[0], who[1]);

describe('what the room is about, on the sales board', () => {
  it('Femi reads his own aim said to him, and no empty rows', async () => {
    const room = (await board(FEMI)).whatTheRoomIsAbout;
    const aims = room.aims.map((a: any) => a.aim);
    expect(aims).toContain('You are trying to get twelve approved facilities by collecting as many strong applications as possible.');
    expect(aims.every((a: string) => a.trim().length > 0)).toBe(true);
    expect(JSON.stringify(room)).not.toMatch(/Femi Okonkwo is trying/);
    expect(room.aims.find((a: any) => /twelve/.test(a.aim)).held).toEqual(['You']);
    expect(room.places[0].named).toEqual(['You']);
  });

  it('Bisi, who runs it, and Juma, an admin, read Femi\'s aim with his name, and the team\'s with "you" for Bisi', async () => {
    for (const who of [BISI, JUMA]) {
      const aims = (await board(who)).whatTheRoomIsAbout.aims.map((a: any) => a.aim);
      expect(aims).toContain('Femi Okonkwo is trying to get twelve approved facilities by collecting as many strong applications as possible.');
      expect(aims).toContain('Kwame Mensah is trying to get 14 facilities approved and 42 million naira disbursed.');
    }
  });
});

describe('the aims on the board', () => {
  it('Bisi reads Kwame\'s own aim as a whole sentence about Kwame, with none of his own words glued on', async () => {
    const names = (await board(BISI)).objectives.map((o: any) => o.name);
    expect(names).toContain("Kwame Mensah's own aim is 42 million naira.");
    expect(names.join(' ')).not.toMatch(/I'm aiming|I’m aiming/);
  });

  it('Kwame reads it as his own', async () => {
    const names = (await board(KWAME)).objectives.map((o: any) => o.name);
    expect(names).toContain('Your own aim is 42 million naira.');
  });

  it('nobody reads Femi\'s promise to follow up as an aim; it stays his commitment', async () => {
    for (const who of [BISI, FEMI, JUMA]) {
      const b = await board(who);
      expect(JSON.stringify(b.objectives)).not.toMatch(/follow up with/);
      expect(JSON.stringify(b.yourShare ?? [])).not.toMatch(/follow up with/);
    }
    expect((await board(FEMI)).objectives.map((o: any) => o.name)).toContain('Your own aim is twelve approved facilities this quarter.');
  });
});

/* Cofounder and drift, run-25: the same naming the board does, as Tunde and as Zainab. */
describe('the room in cofounder and drift, as the person it is about reads it', () => {
  const party = (id: string, first: string, last: string, partyType: PartyType, i: number) => ({ id, userId: `u-${id}`, partyType, createdAt: new Date(2026, 8, i), user: { firstName: first, lastName: last } });
  const readAs = (people: any[], me: string, room: any) => {
    const labels = labelsForParties(people as any);
    const visible = namesVisibleTo(me, people as any, true);
    const mine = people.find((p) => p.id === me);
    return theRoomAsThisReaderReadsIt(room, {
      fullName: `${mine.user.firstName} ${mine.user.lastName}`,
      otherNames: people.filter((p) => p.id !== me).flatMap((p) => [`${p.user.firstName} ${p.user.lastName}`, p.user.firstName, p.user.lastName]),
      name: (t) => withNames(t, visible as any, labels.values(), { viewerLabel: labels.get(me) ?? null }),
    }) as any;
  };

  it('Tunde reads his own part said to him; Ada\'s stays hers', () => {
    const people = [party('ada', 'Ada', 'Nwosu', PartyType.INITIATOR, 1), party('tunde', 'Tunde', 'Bakare', PartyType.PARTICIPANT, 2)];
    const room = readAs(people, 'tunde', { aims: [
      { aim: 'Ada Nwosu will handle the operational and commercial aspects of the business, including fundraising, sales and customer relationships.', held: ['Ada Nwosu', 'Tunde Bakare'] },
      { aim: 'Tunde Bakare is responsible for and will run the product and engineering sides of the business.', held: ['Tunde Bakare', 'Ada Nwosu'] },
    ] });
    expect(room.aims.map((a: any) => a.aim)).toEqual([
      'Ada Nwosu will handle the operational and commercial aspects of the business, including fundraising, sales and customer relationships.',
      'You are responsible for and will run the product and engineering sides of the business.',
    ]);
    expect(room.aims[1].held).toEqual(['You', 'Ada Nwosu']);
  });

  it('Zainab reads her own worry said to her, all the way through, and no empty row', () => {
    const people = [party('cco', 'Nadia', 'Haddad', PartyType.INITIATOR, 1), party('zainab', 'Zainab', 'Suleiman', PartyType.PARTICIPANT, 2)];
    const room = readAs(people, 'zainab', { aims: [
      { aim: '', held: ['Zainab Suleiman', 'Nadia Haddad'] },
      { aim: 'Nadia Haddad is concerned that the partnership targets have not been progressed as she expected.', held: ['Nadia Haddad'] },
      { aim: 'Zainab Suleiman is worried that she will be measured on targets that she has not been able to work on.', held: ['Zainab Suleiman'] },
    ] });
    expect(room.aims.map((a: any) => a.aim)).toEqual([
      'Nadia Haddad is concerned that the partnership targets have not been progressed as she expected.',
      'You are worried that you will be measured on targets that you have not been able to work on.',
    ]);
  });

  it('Nadia, who runs it, reads Zainab\'s worry with her name', () => {
    const people = [party('cco', 'Nadia', 'Haddad', PartyType.INITIATOR, 1), party('zainab', 'Zainab', 'Suleiman', PartyType.PARTICIPANT, 2)];
    const room = readAs(people, 'cco', { aims: [
      { aim: 'Zainab Suleiman is worried that she will be measured on targets that she has not been able to work on.', held: ['Zainab Suleiman'] },
    ] });
    expect(room.aims[0].aim).toBe('Zainab Suleiman is worried that she will be measured on targets that she has not been able to work on.');
  });
});

describe('an aim said as work under way (run-25)', () => {
  it('Bisi reads Femi\'s own aim with his name once, and Femi reads it as his own', async () => {
    const setup: Setup = { ...RUN, objectives: [target('o-femi-12', "I'm working on getting twelve approved facilities this quarter.", 12, 'p-femi', 'p-femi')] };
    const bisi = (await boardAs(setup, ...BISI)).objectives.map((o: any) => o.name);
    expect(bisi).toEqual(["Femi Okonkwo's own aim is twelve approved facilities this quarter."]);
    const femi = (await boardAs(setup, ...FEMI)).objectives.map((o: any) => o.name);
    expect(femi).toEqual(['Your own aim is twelve approved facilities this quarter.']);
  });
});
