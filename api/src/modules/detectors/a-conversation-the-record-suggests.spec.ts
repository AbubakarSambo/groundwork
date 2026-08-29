import { readFileSync } from 'fs';
import { join } from 'path';
import { GroundScenario } from '@prisma/client';
import {
  newHire, roleHandover, newProject, drifting, sustainedConcern, cycleBoundary,
  PIP_WINDOWS, PIP_WINDOW_DAYS, REALIGN_MINIMUM_PEOPLE, CYCLE_BOUNDARY_DAYS,
  AssignmentRow, SubjectRow, FindingRow, PersonRow,
} from './a-conversation-the-record-suggests';

const NOW = new Date('2026-03-01T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

const person = (externalId: string, managerExternalId: string | null = 'boss'): PersonRow =>
  ({ externalId, managerExternalId, active: true });
const assignment = (o: Partial<AssignmentRow> = {}): AssignmentRow => ({
  personExternalId: 'ada', roleName: 'Engineer', startedAt: daysAgo(3),
  endedAt: null, predecessorAssignmentId: null, successorPersonExternalId: null, ...o,
});
const subject = (o: Partial<SubjectRow> = {}): SubjectRow => ({
  externalId: 's1', title: 'paying user pricing', ownerExternalId: 'owner',
  contributorExternalIds: ['a', 'b'], dueDate: null, createdAt: daysAgo(3), ...o,
});
const finding = (o: Partial<FindingRow> = {}): FindingRow => ({
  key: 'goal_divergence', severity: 'high', personExternalId: 'ada', subjectExternalId: 's1',
  firstSeenAt: daysAgo(10), lastSeenAt: daysAgo(1), ...o,
});

describe('nothing here launches anything', () => {
  it('the file cannot create a ground even if somebody wanted it to', () => {
    /*
     * The spec's own sentence: "detection is a proposal, never a launch". Keeping that true is a
     * property of what this file can reach, not of anybody remembering the rule later.
     */
    const SRC = readFileSync(join(__dirname, 'a-conversation-the-record-suggests.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    /*
     * The rule is that it cannot reach a database, not that it cannot name a scenario. My first
     * version banned the string "prisma" outright and failed on `import { GroundScenario } from
     * '@prisma/client'` - which is the vocabulary these suggestions are expressed in, and importing
     * a type is not a capability.
     */
    expect(SRC).not.toMatch(/PrismaService|prisma\./);
    expect(SRC).not.toMatch(/\.create\(|\.update\(|\.upsert\(/);
    expect(SRC).not.toMatch(/groundId|activate/i);
    /* And the only thing it takes from the client is the enum. */
    expect(SRC.match(/from '@prisma\/client'/g) ?? []).toHaveLength(1);
    expect(SRC).toMatch(/import \{ GroundScenario \} from '@prisma\/client'/);
  });
});

describe('somebody starting', () => {
  it('is proposed to their manager, never to them', () => {
    /* Somebody in their first week being asked to confirm they would like to be onboarded is being
       asked to do their manager's job on day one. */
    const [c] = newHire([assignment()], [person('ada', 'boss')], NOW);
    expect(c.proposeTo).toBe('boss');
    expect(c.personExternalId).toBe('ada');
    expect(c.scenario).toBe(GroundScenario.NEW_HIRE);
  });

  it('and says nothing at all when there is no manager to ask', () => {
    /* Their absence is a no_lead finding, not a conversation proposed to the new starter. */
    expect(newHire([assignment()], [person('ada', null)], NOW)).toEqual([]);
  });

  it('and not for somebody taking over from a predecessor', () => {
    expect(newHire([assignment({ predecessorAssignmentId: 'old' })], [person('ada')], NOW)).toEqual([]);
  });
});

describe('a role changing hands', () => {
  it('is proposed to the successor, not the leaver', () => {
    /* The leaver is on their way out and has the least incentive of anybody to open one more
       conversation. */
    const [c] = roleHandover([assignment({
      personExternalId: 'leaver', endedAt: daysAgo(2), successorPersonExternalId: 'newbie',
    })], NOW);
    expect(c.proposeTo).toBe('newbie');
    expect(c.scenario).toBe(GroundScenario.ROLE_HANDOVER);
  });

  it('and not when nobody took over', () => {
    expect(roleHandover([assignment({ endedAt: daysAgo(2) })], NOW)).toEqual([]);
  });
});

describe('a new project', () => {
  it('needs two contributors and no history', () => {
    expect(newProject([subject()], NOW, new Set())).toHaveLength(1);
    expect(newProject([subject({ contributorExternalIds: ['a'] })], NOW, new Set())).toEqual([]);
    expect(newProject([subject()], NOW, new Set(['s1']))).toEqual([]);
  });

  it('and an owner to ask', () => {
    expect(newProject([subject({ ownerExternalId: null })], NOW, new Set())).toEqual([]);
  });
});

describe('drift and realignment are decided together', () => {
  it('so one subject never produces two suggestions', () => {
    /* Computing them apart is how two suggestions about one thing end up in front of one person. */
    const out = drifting(
      [finding({ personExternalId: 'a' }), finding({ personExternalId: 'b' }),
       finding({ key: 'objective_unmentioned', personExternalId: null })],
      [subject()],
    );
    expect(out).toHaveLength(1);
    expect(out[0].scenario).toBe(GroundScenario.DRIFT);
  });

  it('and becomes a team conversation once enough people diverge', () => {
    const people = Array.from({ length: REALIGN_MINIMUM_PEOPLE }, (_, i) => finding({ personExternalId: `p${i}` }));
    const [c] = drifting(people, [subject()]);
    expect(c.scenario).toBe(GroundScenario.REALIGN_TEAM);
    expect(c.says).toMatch(new RegExp(`${REALIGN_MINIMUM_PEOPLE} people`));
  });

  it('and silence about an objective is the milder case', () => {
    const [c] = drifting([finding({ key: 'objective_unmentioned', personExternalId: null })], [subject()]);
    expect(c.scenario).toBe(GroundScenario.DRIFT);
    expect(c.confidence).toBeLessThan(0.6);
  });
});

describe('the one the spec singles out', () => {
  const sustained = (o: Partial<FindingRow> = {}) => finding({
    firstSeenAt: daysAgo(PIP_WINDOWS * PIP_WINDOW_DAYS + 5), lastSeenAt: daysAgo(1), ...o,
  });

  it('is never proposed to the person it is about', () => {
    const [c] = sustainedConcern([sustained()], [person('ada', 'boss')], NOW);
    expect(c.proposeTo).toBe('boss');
    expect(c.personExternalId).toBe('ada');
  });

  it('and is not proposed at all when there is nobody to have it with', () => {
    /*
     * Every other scenario could fall back to the person themselves. This one cannot: telling
     * somebody a performance conversation has been suggested about them, with nobody to have it
     * with, is the worst thing this product could do.
     */
    expect(sustainedConcern([sustained()], [person('ada', null)], NOW)).toEqual([]);
  });

  it('needs it sustained across windows, not crossed once', () => {
    expect(sustainedConcern([finding({ firstSeenAt: daysAgo(3), lastSeenAt: daysAgo(1) })],
      [person('ada')], NOW)).toEqual([]);
  });

  it('and not on something that stopped being true months ago', () => {
    expect(sustainedConcern([sustained({ lastSeenAt: daysAgo(200) })], [person('ada')], NOW)).toEqual([]);
  });

  it('and only on high severity', () => {
    expect(sustainedConcern([sustained({ severity: 'medium' })], [person('ada')], NOW)).toEqual([]);
  });

  it('and carries the lowest confidence of anything, and says so as a question', () => {
    const [c] = sustainedConcern([sustained()], [person('ada')], NOW);
    expect(c.confidence).toBeLessThanOrEqual(0.4);
    expect(c.says).toMatch(/conversation, not a conclusion/);
  });
});

describe('a cycle boundary', () => {
  it('is one suggestion per owner, not one per objective', () => {
    /* Six objectives ending in the same fortnight is one cycle boundary, and six suggestions would
       be the assistant nagging with a straight face. */
    const out = cycleBoundary([
      subject({ externalId: 's1', dueDate: inDays(5) }),
      subject({ externalId: 's2', dueDate: inDays(7) }),
      subject({ externalId: 's3', dueDate: inDays(9) }),
    ], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].evidence.ending).toBe(3);
    expect(out[0].subjectExternalId).toBeNull();
  });

  it('and names the one when there is only one', () => {
    const [c] = cycleBoundary([subject({ dueDate: inDays(5) })], NOW);
    expect(c.subjectExternalId).toBe('s1');
  });

  it('and ignores what is already past or still far off', () => {
    expect(cycleBoundary([subject({ dueDate: daysAgo(1) })], NOW)).toEqual([]);
    expect(cycleBoundary([subject({ dueDate: inDays(CYCLE_BOUNDARY_DAYS + 1) })], NOW)).toEqual([]);
  });
});
