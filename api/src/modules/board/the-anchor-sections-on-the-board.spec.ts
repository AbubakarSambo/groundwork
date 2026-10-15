import { GroundScenario, PartyType } from '@prisma/client';
import { person, answered, commitment, handoff, boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN, type Setup } from './the-switchboards-sections-harness';
import { whatIsWrongForThisReader, ANCHOR_SECTIONS_FOR_THE_LEAD } from './the-anchor-readers';
import { sectionsFor } from './board-families';

/**
 * DECISION 114: THE ANCHOR'S BOARD SECTIONS COME THROUGH THE ORDINARY BOARD, UNDER THE SWITCHBOARD'S NAMES.
 *
 * Read as the lead (Amina), as a person in the check-in (Rukia, who closed a promise, and Baraka), as an admin who set it up and as an
 * admin who only reads. The sections are in the same board payload as every other, named by the switchboard for the anchor's scenario, and
 * the lead's own are served to the lead alone.
 */
const PEOPLE = [
  { ...person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR), managingOnly: false },
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Otieno'),
];
const OPENED = new Date('2026-09-08T08:00:00Z');
const HER_WORDS = 'My sales people close what is in front of them, and nobody looks at whether the customer pays.';

function anchor(on: boolean, more: Partial<Setup> = {}): Setup {
  const checkIns = ['p-amina', 'p-rukia', 'p-baraka'].map((id) => ({ ...answered(id, 1, '2026-09-09T10:00:00Z'), availableFrom: OPENED }));
  const commitments = [commitment('k1', 'p-rukia', 'I will send the deck to the client.', { status: 'DONE', settledAt: new Date('2026-09-09T10:00:00Z') })];
  const dependencies = [handoff('d1', 'p-baraka', 'the sales deck', { onParticipantId: 'p-rukia', status: 'WAITING' })];
  return {
    scenario: GroundScenario.HELP_TEAM_UNDERSTAND, people: PEOPLE, checkIns, commitments, dependencies, groundRow: { startedFrom: 'anchor', startsAt: OPENED },
    prismaExtras: {
      platformSetting: { findUnique: jest.fn(async () => ({ value: { on } })) },
      groundDependency: { findMany: jest.fn(async () => dependencies) },
      conversationTurn: { findMany: jest.fn(async (a: any) => (a?.where?.role === 'PERSON' && a?.where?.checkIn?.groundId ? [{ content: HER_WORDS }] : [])) },
      recommendation: { findMany: jest.fn(async (a: any) => (a?.where?.state === 'PROPOSED'
        ? [{ id: 'rec1', kind: 'anchor_pair_check_in', body: 'Rukia and Baraka depend on each other for the sales deck.', rationale: { question: 'Would you like a check-in for the two of them?' } }]
        : [])) },
      groundParticipant: {
        findMany: jest.fn(async (a: any) => {
          if (a?.where?.id?.in) return PEOPLE.filter((p) => a.where.id.in.includes(p.id)).map((p) => ({ id: p.id, lastNudgedAt: null }));
          return PEOPLE.map((p) => ({ ...p, checkIns: checkIns.filter((c) => c.participantId === p.id && c.status === 'COMPLETED').map((c) => ({ status: c.status })) }));
        }),
        findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({})),
      },
    },
    ...more,
  };
}
const SETUP = () => ({ ...anchor(true), createdByUserId: 'u-setup' }) as any;
const ALL = ['whatYouAreCarrying', 'howGroundworkWillWork', 'theFourLenses', 'ideasFromTheTeam', 'peopleHelpingTheTeamMove', 'recommendations', 'weeklyInsight'];

describe('the switchboard names the anchor\'s sections', () => {
  it('for the anchor\'s scenario, and for no other', () => {
    for (const k of ALL) expect(sectionsFor(GroundScenario.HELP_TEAM_UNDERSTAND)).toContain(k);
    for (const s of [GroundScenario.NEW_PROJECT, GroundScenario.OKR_ALIGNMENT, GroundScenario.NEW_HIRE]) for (const k of ALL) expect(sectionsFor(s)).not.toContain(k);
  });
});

describe('the anchor\'s sections, as each reader reads the ordinary board', () => {
  it('Amina, who leads it, reads all of them in plain words', async () => {
    const b: any = await boardAs(anchor(true), ...AMINA);
    expect(b.whatYouAreCarrying).toEqual({ heading: "What you're carrying", text: HER_WORDS });
    expect(b.howGroundworkWillWork.heading).toBe("How I'll work with your team");
    expect(b.howGroundworkWillWork.ways.map((w: any) => w.heading)).toEqual(['Understand', 'Connect', 'Encourage', 'Challenge', 'Act', 'Follow through', 'Cross-reference', 'Surface patterns']);
    expect(b.theFourLenses.heading).toBe('The four lenses');
    expect(b.theFourLenses.lenses.map((l: any) => l.key)).toEqual(['understanding', 'ownership', 'contribution', 'action']);
    expect(b.peopleHelpingTheTeamMove.heading).toBe('People helping the team move');
    expect(b.peopleHelpingTheTeamMove.people.map((p: any) => p.name)).toContain('Rukia');
    expect(b.recommendations).toEqual({ heading: 'Groundwork recommends', offers: [{ id: 'rec1', kind: 'anchor_pair_check_in', says: 'Rukia and Baraka depend on each other for the sales deck.', question: 'Would you like a check-in for the two of them?', yes: 'Yes, set it up', no: 'Not now' }] });
    expect(b.weeklyInsight.heading).toBe('This week');
    expect(b.weeklyInsight.text).toMatch(/^Your team is starting to move\. This week, three of three people checked in/);
    expect(whatIsWrongForThisReader('the lead', b)).toEqual([]);
  });

  it.each([['Rukia', RUKIA], ['Baraka', BARAKA]])('%s reads how Groundwork will work and the ideas, and none of the lead\'s own', async (_n, who) => {
    const b: any = await boardAs(anchor(true), ...(who as [string, string]));
    expect(b.howGroundworkWillWork.ways).toHaveLength(8);
    expect(b.ideasFromTheTeam.heading).toBe('Ideas from your team');
    for (const k of ANCHOR_SECTIONS_FOR_THE_LEAD) expect(k in b).toBe(false);
    expect(JSON.stringify(b)).not.toContain(HER_WORDS);
    expect(whatIsWrongForThisReader('a person in it', b, { othersNames: ['Amina'] })).toEqual([]);
  });

  it('an admin who set it up reads the sections for everybody in it, and not the lead\'s own', async () => {
    const b: any = await boardAs(SETUP(), ...SETUP_ADMIN);
    expect(b.howGroundworkWillWork.ways).toHaveLength(8);
    for (const k of ANCHOR_SECTIONS_FOR_THE_LEAD) expect(k in b).toBe(false);
    expect(whatIsWrongForThisReader('an admin with access', b)).toEqual([]);
  });

  it('an admin who only reads is served the fixed words about how Groundwork works and nothing else of them', async () => {
    const b: any = await boardAs(anchor(true), ...JUMA);
    expect(b.howGroundworkWillWork.ways).toHaveLength(8);
    for (const k of ALL.filter((k) => k !== 'howGroundworkWillWork')) expect(k in b).toBe(false);
    expect(whatIsWrongForThisReader('an admin who only reads', b)).toEqual([]);
  });

  it('with the switch off, nobody is served any of them', async () => {
    for (const r of [AMINA, RUKIA, JUMA]) {
      const b: any = await boardAs(anchor(false), r[0], r[1]);
      for (const k of ALL) expect(k in b).toBe(false);
    }
  });

  it('another scenario\'s board carries none, even for its lead', async () => {
    const b: any = await boardAs(anchor(true, { scenario: GroundScenario.NEW_PROJECT, groundRow: { startedFrom: null, startsAt: OPENED } as any }), ...AMINA);
    for (const k of ALL) expect(k in b).toBe(false);
  });

  it('the rules catch a lead\'s section served to a person', () => {
    expect(whatIsWrongForThisReader('a person in it', { theFourLenses: { lenses: [] } })).not.toEqual([]);
    expect(whatIsWrongForThisReader('an admin with access', { recommendations: { offers: [] } })).not.toEqual([]);
  });
});
