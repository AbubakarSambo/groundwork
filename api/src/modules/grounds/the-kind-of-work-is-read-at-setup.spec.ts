import { GroundsService } from './grounds.service';
import { KINDS_OF_WORK, oneOfTheKinds, isASalesKind, THE_KIND_OF_WORK_PROMPT } from '../board/the-kind-of-work';

/**
 * THE KIND OF WORK IS READ FROM WHAT THE LEAD SAID AT SETUP, AND THE LEAD HAS THE LAST WORD.
 *
 * Request 76, Hafsah's ruling of 29 September 2026. The model reads the lead's words and the brief;
 * code keeps its answer only when it is exactly one of the eleven kinds. The lead can change it, and
 * a later read never overwrites the lead's choice.
 */
function build(ground: Record<string, any>, answer: any) {
  const updates: any[] = [];
  const prisma: any = {
    ground: {
      findUnique: jest.fn(async () => ground),
      updateMany: jest.fn(async (a: any) => { const by = ground.kindOfWorkSetBy ?? null; if (by !== null && by !== 'read') return { count: 0 }; updates.push(a.data); Object.assign(ground, a.data); return { count: 1 }; }),
      update: jest.fn(async (a: any) => { updates.push(a.data); Object.assign(ground, a.data); return { id: 'g1', ...ground }; }),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'org1' })) },
  };
  const anthropic: any = { extract: jest.fn(async () => answer) };
  const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, anthropic);
  return { svc, updates, anthropic };
}

describe('the kind of work, read at setup (request 76)', () => {
  /* Fifteen since Release 4 added "leadership" and Release 5 "a funded project" and "client delivery" (a type of project, Hafsah, 25 October). */
  it('knows exactly the fifteen kinds (the eleven, "sales team", "leadership", "a funded project" and "client delivery"), and nothing near them', () => {
    expect(KINDS_OF_WORK).toHaveLength(15);
    expect(oneOfTheKinds(' Sales Team')).toBe('sales team');
    expect(oneOfTheKinds('  Sales Org ')).toBe('sales org');
    expect(oneOfTheKinds('a law firm matter')).toBe('a law firm matter');
    expect(oneOfTheKinds('sales')).toBeNull();
    expect(oneOfTheKinds('none')).toBeNull();
    expect(oneOfTheKinds(42)).toBeNull();
  });

  it('keeps the model\'s answer when it is one of the eleven', async () => {
    const g: any = { label: 'Freezer sales, Q3', brief: 'Our reps sell freezers to butcheries. I want to see which deals are real.', kindOfWorkSetBy: null };
    const { svc, updates, anthropic } = build(g, { kind: 'sales org' });
    await svc.readTheKindOfWork('g1');
    expect(anthropic.extract).toHaveBeenCalledTimes(1);
    expect(String(anthropic.extract.mock.calls[0][1][0].content)).toContain('I want to see which deals are real.');
    expect(updates).toEqual([{ kindOfWork: 'sales org', kindOfWorkSetBy: 'read' }]);
  });

  it('stores none when the model answers with anything that is not one of the eleven', async () => {
    const g: any = { label: 'Board meeting prep', brief: 'Getting ready for the board.', kindOfWorkSetBy: null };
    const { svc, updates } = build(g, { kind: 'banking' });
    await svc.readTheKindOfWork('g1');
    expect(updates).toEqual([{ kindOfWork: null, kindOfWorkSetBy: null }]);
  });

  it('never reads over a kind the lead chose', async () => {
    const g: any = { label: 'Kasarani Foods v Pwani Mills', brief: 'A supply contract case.', kindOfWork: 'a law firm matter', kindOfWorkSetBy: 'lead' };
    const { svc, updates, anthropic } = build(g, { kind: 'sales org' });
    await svc.readTheKindOfWork('g1');
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it('never overwrites a kind the lead chose while the reading was still being worked out', async () => {
    const g: any = { label: 'Freezer sales, Q3', brief: 'Our reps sell freezers.', kindOfWork: null, kindOfWorkSetBy: null };
    const { svc, updates, anthropic } = build(g, { kind: 'sales org' });
    /* The lead (or a script) chooses a kind after the reading began and before it finished. */
    anthropic.extract.mockImplementation(async () => { g.kindOfWork = 'a law firm matter'; g.kindOfWorkSetBy = 'lead'; return { kind: 'sales org' }; });
    await svc.readTheKindOfWork('g1');
    expect(g.kindOfWork).toBe('a law firm matter');
    expect(g.kindOfWorkSetBy).toBe('lead');
    expect(updates).toEqual([]);
  });

  it('leaves a kind a script chose, whatever mark it left', async () => {
    const g: any = { label: 'Q4 launch', brief: 'Launching in Q4.', kindOfWork: 'engineering release', kindOfWorkSetBy: 'script' };
    const { svc, updates, anthropic } = build(g, { kind: 'sales org' });
    await svc.readTheKindOfWork('g1');
    expect(anthropic.extract).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it('lets the lead change it and its stage names, and refuses a kind that is not one of the eleven in plain words', async () => {
    const g: any = { initiatorId: 'lead', organizationId: 'org1' };
    const { svc, updates } = build(g, null);
    const set = await svc.setKindOfWork('g1', 'lead', { kind: 'Sales org', stages: ['Called', 'Visited', 'Paid'] });
    expect(set).toMatchObject({ kindOfWork: 'sales org', kindOfWorkSetBy: 'lead', workStages: ['Called', 'Visited', 'Paid'] });
    await expect(svc.setKindOfWork('g1', 'lead', { kind: 'banking' })).rejects.toThrow(
      'That is not one of the kinds of work Groundwork knows. Choose one of these:',
    );
    expect(updates).toHaveLength(1);
  });

  it('refuses somebody who does not run the check-in', async () => {
    const g: any = { initiatorId: 'lead', organizationId: 'org1' };
    const { svc } = build(g, null);
    await expect(svc.setKindOfWork('g1', 'someone-else', { kind: 'sales org' })).rejects.toThrow(
      'Only the person who runs this check-in can change how it is set up. An admin can only do that once that person has left the organisation. Nothing was changed.',
    );
  });
});

/*
 * A SALES TEAM, AND A SALES ORGANISATION OF SEVERAL TEAMS (release plan, Release 1). Drop Access is one lead and three reps: a
 * "sales team". "sales org" stays for an organisation with several sales teams, and keeps working as before.
 */
describe('a sales team is told from a sales organisation', () => {
  it('the read tells the model the difference, and that one team selling is a sales team', () => {
    expect(THE_KIND_OF_WORK_PROMPT).toContain('- "sales team": one team selling to customers, with one lead and the people who sell under them');
    expect(THE_KIND_OF_WORK_PROMPT).toContain('- "sales org": a sales organisation of several sales teams, each with its own lead');
    expect(THE_KIND_OF_WORK_PROMPT).toContain('When the work is selling and nothing says there are several sales teams, it is a "sales team".');
  });

  it('a sales team is read from the lead\'s words and the people\'s job titles, and kept', async () => {
    const g: any = {
      label: 'Sales team, Q4', brief: 'Kevin, Mercy and Joseph sell our freezers to hotels and shops. I want to see every deal.', kindOfWorkSetBy: null,
      participants: [{ roleAsDescribed: 'Sales rep', user: { jobTitle: 'Sales rep' } }, { roleAsDescribed: null, user: { jobTitle: 'Sales manager' } }],
    };
    const { svc, updates, anthropic } = build(g, { kind: 'sales team' });
    await svc.readTheKindOfWork('g1');
    const told = String(anthropic.extract.mock.calls[0][1][0].content);
    expect(told).toContain('The job titles of the people in it: Sales rep, Sales manager');
    expect(updates).toEqual([{ kindOfWork: 'sales team', kindOfWorkSetBy: 'read' }]);
    expect(isASalesKind(g.kindOfWork)).toBe(true);
  });

  it('a sales organisation of several teams is still read as "sales org", as before', async () => {
    const g: any = { label: 'Group sales, 2027', brief: 'Our Nairobi, Mombasa and Kisumu sales teams, each with its own team lead.', kindOfWorkSetBy: null };
    const { svc, updates } = build(g, { kind: 'sales org' });
    await svc.readTheKindOfWork('g1');
    expect(updates).toEqual([{ kindOfWork: 'sales org', kindOfWorkSetBy: 'read' }]);
  });

  it('an existing check-in read as "sales org" keeps it when its words are read again as a sales team: its row is not rewritten', async () => {
    const g: any = { label: 'Sales, Q3', brief: 'Our reps sell freezers.', kindOfWork: 'sales org', kindOfWorkSetBy: 'read' };
    const { svc, updates } = build(g, { kind: 'sales team' });
    await svc.readTheKindOfWork('g1');
    expect(updates).toEqual([]);
    expect(g.kindOfWork).toBe('sales org');
  });

  it('the lead confirms "sales team" the way a kind of work is confirmed today', async () => {
    const g: any = { initiatorId: 'lead', organizationId: 'org1', kindOfWork: 'sales org', kindOfWorkSetBy: 'read' };
    const { svc } = build(g, null);
    const set = await svc.setKindOfWork('g1', 'lead', { kind: 'sales team' });
    expect(set).toMatchObject({ kindOfWork: 'sales team', kindOfWorkSetBy: 'lead' });
  });
});
