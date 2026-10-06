import { whatNeedsYou, type ListedCheckIn } from './what-needs-you';
import { aCheckInInASentence, theSummaryParagraph } from '../whatsapp/the-leads-daily-summary';
import { boardAs, AMINA, RUKIA, BARAKA, JUMA, answered } from '../board/the-switchboards-sections-harness';

/**
 * REQUEST 118 (1): A LIST OF WHO HAS NOT CHECKED IN YET, WITH NOBODY LEFT IN IT.
 *
 * On "Sales team, Q3" Rukia's Today returned 500, "Cannot read properties of undefined (reading '0')",
 * at `whoHasNotYet` in what-needs-you.ts. The count she reads is the round header's ("4 of 5"); who is
 * still waited on is the round-closing rule's, which also leaves out Faraji, whom an admin has not let
 * in (decision 77), or an invitation that lapsed. That left the list of people to name empty while the
 * count still said one was missing, and `who[0]` of nothing threw.
 *
 * Every page with such a list is served, and reads correctly, with nobody left in it: Today, the board,
 * and the lead's daily summary. (The You board has no such list: it shows only the reader's own.)
 */
const NOW = new Date('2026-10-02T09:00:00Z');
const ago = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const names = ['Rukia', 'Amani', 'Baraka', 'Neema', 'Faraji'];
const ids = names.map((n) => `p-${n}`);
const sales = (waitingOn: string[]): ListedCheckIn => ({
  id: 'g-sales', label: 'Sales team, Q3', status: 'ACTIVE', organizationId: 'org', initiatorId: 'u-rukia',
  participants: names.map((n, i) => ({ id: ids[i], userId: n === 'Rukia' ? 'u-rukia' : `u-${n}`, user: { firstName: n }, ...(n === 'Faraji' ? { notLetIn: true } : {}) })),
  checkIns: ids.map((id, i) => ({ id: `c1-${i}`, participantId: id, sessionNumber: 1, status: i < 4 ? 'COMPLETED' : 'NOT_STARTED', availableFrom: ago(60), completedAt: i < 4 ? ago(50) : null })),
  glance: { progress: { roundsDone: 0, roundsPlanned: 12, answeredThisRound: 4, ofPeople: 5, waitingOn } },
} as any);

describe('request 118 (1): Today with nobody left to name', () => {
  it('Rukia, who runs it, is served Today, with no line about a round nobody left can answer', () => {
    const r = whatNeedsYou([sales([])], { userId: 'u-rukia', role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r).toBeTruthy();
    expect(r.line ?? null).toBeNull();
  });

  it('an admin of the organisation is served Today the same way', () => {
    const r = whatNeedsYou([sales([])], { userId: 'u-grace', role: 'ADMIN', organizationId: 'org' }, [], NOW);
    expect(r.line ?? null).toBeNull();
  });

  it('Amani, who checks in, is served Today, with no count and no names', () => {
    const r = whatNeedsYou([sales([])], { userId: 'u-Amani', role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.line ?? '').not.toMatch(/of \d|has not checked in|have not checked in/);
  });

  it('with somebody still left, Rukia reads the same sentence as before', () => {
    const r = whatNeedsYou([sales(['p-Neema'])], { userId: 'u-rukia', role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.line).toBe('In Sales team, Q3, 4 of 5 have checked in for the first check-in. Neema has not checked in yet.');
  });
});

describe('request 118 (1): the lead\'s daily summary with nobody left to name', () => {
  it('reads a count, and never an empty name', () => {
    expect(aCheckInInASentence({ label: 'Sales team, Q3', ofHowMany: 5, answered: 4, notYet: [] }))
      .toBe('In "Sales team, Q3", 4 of 5 people have checked in.');
    expect(theSummaryParagraph([{ label: 'Sales team, Q3', ofHowMany: 4, answered: 4, notYet: [] }], []))
      .toBe('In "Sales team, Q3", all 4 people have checked in.');
  });
});

describe('request 118 (1): the board with everybody counted already answered', () => {
  const SETUP = { checkIns: [answered('p-rukia', 1), answered('p-baraka', 1)] };
  it.each([
    ['Amina, who runs it', AMINA],
    ['Rukia, who checks in', RUKIA],
    ['Baraka, who checks in', BARAKA],
    ['Juma, an admin who only reads', JUMA],
  ])('%s is served the board, and nobody is said not to have checked in', async (_who, [user, role]) => {
    const b = await boardAs(SETUP, user, role);
    expect(b).toBeTruthy();
    expect(JSON.stringify(b)).not.toMatch(/(has|have) not checked in yet/);
  });
});
