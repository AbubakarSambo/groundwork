import { GroundScenario } from '@prisma/client';
import { boardAs, SALES_RUN, A_RELEASED_REPORT, BISI, FEMI, NGOZI, JUMA, type Setup } from './the-switchboards-sections-harness';

/**
 * DECISION 76, ITEM 4, ON THE BOARD (screens requests 111 d and 112 c): EACH SESSION'S TEAM PICTURE IS RELEASED ON
 * ITS OWN. "Sales team, Q3" told Amani "Today's team picture is ready." while session 2's team report was not
 * shared, because the board asked only whether a report had ever been released.
 *
 * The sales run (api/journey/all-24/re-f/sales.json): Femi, Ngozi and Kwame have all finished sessions 1 and 2.
 * Bisi released session 1's picture and has not released session 2's. A participant reads none of the team's
 * picture of session 2 (request 105, part 3: the quick read, where people differ, what the answers say, the
 * forecast and the headline) until she does.
 */
const TEAM_AIMS = [
  { id: 'o-facilities', groundId: 'g-1', name: "We're aiming for 40 approved facilities this quarter.", target: 40, count: 11, prevCount: 6, ownerParticipantId: null, setByParticipantId: 'p-bisi', direction: 'UP', isADecisionAboutAPerson: false, sortOrder: 0, addedAtSession: 1, assumes: [], suggestedCount: null, suggestedSaid: null },
];
const withReleased = (sessions: number[]): Setup => ({
  ...SALES_RUN,
  whoSeesTargets: 'EVERYBODY',
  objectives: TEAM_AIMS,
  snapshots: [{ objectiveId: 'o-facilities', count: 6 }],
  clock: { createdAt: new Date('2026-09-01T09:00:00Z'), timelineDays: 84, cadence: 'FORTNIGHTLY' },
  report: { ...A_RELEASED_REPORT, networkPicture: 'Most people said the credit committee is the hold-up.', releasedSessions: sessions },
});
const TEAM_PICTURE = ['quickRead', 'divergence', 'whatTheAnswersSay', 'forecast', 'headline'] as const;
const theTeamsPicture = (b: any) => Object.fromEntries(TEAM_PICTURE.map((k) => [k, b[k] ?? null]));

describe('decision 76, item 4: a participant reads the team picture of a session only once it is released', () => {
  it.each([['Femi', FEMI], ['Ngozi', NGOZI]] as const)('%s, with only session 1 released, is told session 2 is not shared and reads none of it', async (_who, reader) => {
    const b = await boardAs(withReleased([1]), reader[0], reader[1]);
    expect(b.teamPicture).toEqual({ shared: false, says: "Today's team picture is not shared yet.", yourOwnReport: 'Your own report is ready now.' });
    expect(theTeamsPicture(b)).toEqual({ quickRead: null, divergence: null, whatTheAnswersSay: null, forecast: null, headline: null });
    expect(b.howItIsGoing?.latestSummary ?? null).toBeNull();
    expect(JSON.stringify(b)).not.toMatch(/credit committee is the hold-up/);
  });

  it.each([['Femi', FEMI], ['Ngozi', NGOZI]] as const)('%s reads the team picture once Bisi releases session 2', async (_who, reader) => {
    const b = await boardAs(withReleased([1, 2]), reader[0], reader[1]);
    expect(b.teamPicture).toEqual({ shared: true });
    expect(b.whatTheAnswersSay).toBe('Most people said the credit committee is the hold-up.');
    expect(Array.isArray(b.quickRead)).toBe(true);
  });

  it('a report released before sessions were kept apart reads as released, as it did', async () => {
    const b = await boardAs({ ...withReleased([]), report: { ...A_RELEASED_REPORT, networkPicture: 'Most people said the credit committee is the hold-up.' } }, ...FEMI);
    expect(b.teamPicture).toEqual({ shared: true });
  });

  it.each([['Bisi, who runs it', BISI], ['Juma, an admin who only reads', JUMA]] as const)('%s reads what the answers say, released or not, as before', async (_who, reader) => {
    const b = await boardAs(withReleased([1]), reader[0], reader[1]);
    expect(b.whatTheAnswersSay).toBe('Most people said the credit committee is the hold-up.');
    expect(b.teamPicture).toBeUndefined();
  });

  it('Femi, the person reviewed on a performance plan, reads what the answers say only once the session is released', async () => {
    const before = await boardAs({ ...withReleased([1]), scenario: GroundScenario.PIP }, ...FEMI);
    expect(before.whatTheAnswersSay ?? null).toBeNull();
    const after = await boardAs({ ...withReleased([1, 2]), scenario: GroundScenario.PIP }, ...FEMI);
    expect(after.whatTheAnswersSay).toBe('Most people said the credit committee is the hold-up.');
  });
});
