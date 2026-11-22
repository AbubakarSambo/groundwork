import { answerFromTheDocuments } from './a-question-is-answered-from-the-documents';
import { isOneOfThem, thePeopleTheAskerIsResponsibleFor } from './the-people-the-asker-is-responsible-for';

/**
 * DECISION O-15, CHANGED BY HAFSAH ON 21 NOVEMBER 2026: "the assistant can now do performance but only for DRs or people you are responsible for". Ask gives a
 * view of how somebody is doing, with the evidence, only about the asker's direct reports, the people in check-ins they run, or the team a senior person named.
 * For anybody else it says what is outstanding, and never judges. Held in the backend: whatever the model writes, a view of somebody else is never said.
 */
function anOrganisation(reportsToFatima: boolean) {
  return {
    organization: { findUnique: async () => ({ personJudgementsOn: true }) },
    organizationMembership: { findMany: async ({ where }: any) => (where.reportsToUserId === 'u-fatima' && reportsToFatima ? [{ userId: 'u-ahmed' }] : []) },
    user: { findMany: async () => [{ id: 'u-ahmed', firstName: 'Ahmed', lastName: 'Bako' }] },
    person: { findFirst: async () => null, findMany: async () => [] },
    ground: { findMany: async () => [] },
    groundDocument: { findMany: async () => [] },
  };
}
const memory = { pullForTheAssistant: async () => ({ books: [{ label: 'the export incentive', markdown: 'Ahmed Bako said on 6 October the approval had gone through. Legal wrote on 13 November that the signed letter is still outstanding.' }] }) };
const VIEW = { found: true, lead: 'Ahmed has not delivered the signed approval letter he promised for 7 October, and that is a pattern worth raising with him.', judgesAPerson: true, aboutPeople: ['Ahmed'] };
const OUTSTANDING = { found: true, lead: 'Ahmed Bako still owns the signed approval letter, due on 7 October, and Legal wrote on 13 November that it is outstanding.', judgesAPerson: false };

describe('a view of somebody is only for the people you are responsible for', () => {
  it('Ahmed reports to Fatima: she hears the view, with its evidence', async () => {
    const prompts: string[] = [];
    const engine = { extract: jest.fn(async (_s: string, h: any[]) => { prompts.push(h[0].content); return VIEW; }) };
    const said = await answerFromTheDocuments({ prisma: anOrganisation(true), engine, memory }, { organizationId: 'o', userId: 'u-fatima', question: 'What has Ahmed failed to deliver?' });
    console.log(`AHMED REPORTS TO FATIMA. FATIMA READS\n${said}`);
    expect(said).toBe(VIEW.lead);
    expect(prompts[0]).toContain('These people report to you, are in a check-in you run, or are the team you named: Ahmed Bako.');
    expect(engine.extract).toHaveBeenCalledTimes(1);
  });

  it('Ahmed does not report to her: she hears what is outstanding, and a view the model still gives is never said', async () => {
    const engine = { extract: jest.fn().mockResolvedValueOnce(VIEW).mockResolvedValueOnce(OUTSTANDING) };
    const said = await answerFromTheDocuments({ prisma: anOrganisation(false), engine, memory }, { organizationId: 'o', userId: 'u-fatima', question: 'What has Ahmed failed to deliver?' });
    console.log(`AHMED DOES NOT REPORT TO FATIMA. FATIMA READS\n${said}`);
    expect(said).toBe(OUTSTANDING.lead);
    expect(engine.extract.mock.calls[1][1][0].content).toContain('Ahmed is not one of the people you are responsible for. Give no view of how Ahmed is doing');
    const stubborn = { extract: jest.fn(async () => VIEW) };
    const refused = await answerFromTheDocuments({ prisma: anOrganisation(false), engine: stubborn, memory }, { organizationId: 'o', userId: 'u-fatima', question: 'What has Ahmed failed to deliver?' });
    expect(refused).toMatch(/^I do not give a view on how Ahmed is doing, because Ahmed does not report to you and is not in a check-in you run\./);
    expect(refused).not.toContain('pattern worth raising');
  });

  it('who counts: the role map, the check-ins they run, and the name as asked', async () => {
    const prisma: any = { ...anOrganisation(false), ground: { findMany: async () => [{ id: 'g1' }] }, groundParticipant: { findMany: async () => [{ userId: 'u-ahmed' }, { userId: null, nameGiven: 'Halima Garba' }] } };
    expect((await thePeopleTheAskerIsResponsibleFor(prisma, { organizationId: 'o', userId: 'u-fatima' })).names.sort()).toEqual(['Ahmed Bako', 'Halima Garba']);
    expect(isOneOfThem('Ahmed', ['Ahmed Bako', 'Halima Garba'])).toBe(true);
    expect(isOneOfThem('Ahmed', ['Ahmed Bako', 'Ahmed Musa'])).toBe(false);
    expect(isOneOfThem('Toyin Bello', ['Ahmed Bako'])).toBe(false);
  });

  it('Wairimu runs "Sales team, Q4": "the sales team" is her team, and she hears who to let go, by name, with the evidence (release test, 22 November 2026, bug N5)', async () => {
    const prisma: any = {
      ...anOrganisation(false),
      ground: { findMany: async ({ where }: any) => (where.initiatorId === 'u-wairimu' ? [{ id: 'g-sales', label: 'Sales team, Q4' }] : []) },
      groundParticipant: { findMany: async () => [{ groundId: 'g-sales', userId: 'u-wairimu' }, { groundId: 'g-sales', userId: 'u-amani' }, { groundId: 'g-sales', userId: 'u-sade' }] },
      user: { findMany: async () => [{ id: 'u-amani', firstName: 'Amani', lastName: 'Otieno' }, { id: 'u-sade', firstName: 'Sade', lastName: 'Adeyemi' }] },
    };
    const answer = {
      found: true,
      lead: 'On the record, Amani Otieno is the one to think about letting go, and the decision is yours.',
      points: ['Amani Otieno said on 10 November he had signed two freezer orders, and nothing on file shows either of them.', 'Sade Adeyemi put 3 shops on the waitlist on 22 November, and the list she sent shows them.'],
      offer: 'I can go through Amani Otieno\'s check-ins one by one.',
      judgesAPerson: true,
      aboutPeople: ['Amani Otieno', 'Sade Adeyemi'],
    };
    const salesMemory = { pullForTheAssistant: async () => ({ books: [{ label: 'Sales team, Q4', markdown: 'Amani Otieno said on 10 November he had signed two freezer orders. Nothing on file shows them. Sade Adeyemi put 3 shops on the waitlist on 22 November, and her list shows them.' }] }) };
    const prompts: string[] = [];
    const engine = { extract: jest.fn(async (_s: string, h: any[]) => { prompts.push(h[0].content); return answer; }) };
    const said = await answerFromTheDocuments({ prisma, engine, memory: salesMemory }, { organizationId: 'o', userId: 'u-wairimu', question: 'Who should I let go from the sales team?' });
    console.log(`WAIRIMU ASKS WHO TO LET GO FROM THE SALES TEAM. SHE READS\n${said}`);
    expect(prompts[0]).toContain('You run the check-in "Sales team, Q4", and these people are in it: Amani Otieno, Sade Adeyemi.');
    expect(said).toContain('Amani Otieno is the one to think about letting go');
    expect(said).toContain('Sade Adeyemi put 3 shops on the waitlist');
    expect(said).not.toMatch(/I do not give a view|does not report to you/);
    expect(engine.extract).toHaveBeenCalledTimes(1);

    /* Amani asks the same: he runs nothing, so the same view is never said to him. */
    const stubborn = { extract: jest.fn(async () => answer) };
    const toAmani = await answerFromTheDocuments({ prisma, engine: stubborn, memory: salesMemory }, { organizationId: 'o', userId: 'u-amani', question: 'Who should I let go from the sales team?' });
    console.log(`AMANI ASKS THE SAME. HE READS\n${toAmani}`);
    expect(toAmani).toBe('I do not give a view on how Amani Otieno and Sade Adeyemi are doing, because they do not report to you and are not in a check-in you run. I can tell you what each person said, what is proven and what is still open.');
  });
});
