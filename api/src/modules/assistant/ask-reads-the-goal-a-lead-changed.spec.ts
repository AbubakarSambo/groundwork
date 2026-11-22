import { theRecordTheyMayRead } from './a-question-is-answered-from-the-documents';

/**
 * BUG N2 (Drop Access, final run of 22 November 2026). Wairimu changed the team's goal in Ask, from freezers to a waitlist of shops, and the
 * goal row changed. Amani asked Ask "whats the team goal now?" and read "The team's goal is for Wairimu Njoroge to read what the team
 * says...": the record Ask answers from held no goal row. It now reads the stored goal rows, as each reader may read them.
 */
const NOW = new Date('2026-11-23T09:00:00+03:00');
const people = [
  { id: 'p-wairimu', groundId: 'g', userId: 'u-wairimu', email: 'wairimu@x.test', nameGiven: null },
  { id: 'p-amani', groundId: 'g', userId: 'u-amani', email: 'amani@x.test', nameGiven: null },
  { id: 'p-chidi', groundId: 'g', userId: 'u-chidi', email: 'chidi@x.test', nameGiven: null },
];
const users = [
  { id: 'u-wairimu', firstName: 'Wairimu', lastName: 'Njoroge' },
  { id: 'u-amani', firstName: 'Amani', lastName: 'Kiprop' },
  { id: 'u-chidi', firstName: 'Chidi', lastName: 'Okeke' },
];
const goals = [
  { id: 'o-team', name: 'Each person builds a waitlist of 15 shops by 31 December', target: 15, count: 0, ownerParticipantId: null, setByParticipantId: 'p-wairimu' },
  { id: 'o-chidi', name: 'Chidi signs 5 new shops', target: 5, count: 1, ownerParticipantId: 'p-chidi', setByParticipantId: 'p-wairimu' },
];
const groundAuditLog = {
  timeline: [],
  targetChanges: [{
    objectiveId: 'o-team', from: 40, to: 15, fromNames: ['the team’s “Freezers sold by the team this quarter”'], toName: goals[0].name,
    because: 'The freezers we sell are out of stock until January', stopsTheWork: true, byParticipantId: 'p-wairimu', said: null, at: '2026-11-22T10:00:00Z',
  }],
};
function aPrisma(): any {
  return {
    organization: { findUnique: jest.fn(async () => ({ personJudgementsOn: true })) },
    ground: { findMany: jest.fn(async () => [{ id: 'g', label: 'Sales team, Q4', initiatorId: 'u-wairimu', groundAuditLog }]) },
    groundParticipant: { findMany: jest.fn(async ({ where }: any) => people.filter((p) => !where.userId || p.userId === where.userId).map((p) => ({ ...p }))) },
    user: { findMany: jest.fn(async ({ where }: any) => users.filter((u) => where.id.in.includes(u.id))) },
    checkIn: { findMany: jest.fn(async () => []) },
    groundObjective: { findMany: jest.fn(async () => goals.map((o) => ({ ...o }))) },
    personObjective: { findMany: jest.fn(async () => []) },
    workItem: { findMany: jest.fn(async () => []) },
    itemEvidence: { findMany: jest.fn(async () => []) },
  };
}

describe('Ask reads the goal its lead changed, from the stored goal rows', () => {
  it('Amani, in the team, reads the team goal as it is now, and when and why it changed, never what it was or Chidi\'s own goal', async () => {
    const [doc] = await theRecordTheyMayRead(aPrisma(), { organizationId: 'o', userId: 'u-amani' }, NOW);
    expect(doc.content).toContain('- The team’s goal is “Each person builds a waitlist of 15 shops by 31 December”. Its target is 15, and 0 is counted against it so far. On 22 November the goal changed, because the freezers we sell are out of stock until January.');
    expect(doc.content).not.toMatch(/Freezers sold by the team|Chidi signs/);
  });
  it('Wairimu, who leads it, reads every goal, and what the team goal was before she changed it', async () => {
    const [doc] = await theRecordTheyMayRead(aPrisma(), { organizationId: 'o', userId: 'u-wairimu' }, NOW);
    expect(doc.content).toContain('On 22 November the goal changed, because the freezers we sell are out of stock until January. Before that, the goal was the team’s “Freezers sold by the team this quarter”.');
    expect(doc.content).toContain('- Chidi Okeke’s own goal is “Chidi signs 5 new shops”. Its target is 5, and 1 is counted against it so far.');
  });
  it('the goals come before what was said, so a long record never pushes them out', async () => {
    const [doc] = await theRecordTheyMayRead(aPrisma(), { organizationId: 'o', userId: 'u-amani' }, NOW);
    expect(doc.content.indexOf('THE GOALS ON RECORD NOW')).toBeLessThan(doc.content.indexOf('PERSON:'));
  });
});
