import { onlyTheRecordsThatHold, theRecordAreas } from './the-setup-records';
import { PolicyService } from './policy.service';

/*
 * Release 9, the other setup areas, hand-written: Baridi's staff list, org chart, client list, 2027 strategy and job descriptions,
 * as the model's stored answer for each (no real-model run). Grace is an admin.
 */
const ANSWERS: Record<string, any> = {
  'Staff list': { rules: [], people: [
    { name: 'Grace Achieng', email: 'grace@baridi.test', title: 'Finance lead', team: 'Finance', manager: null },
    { name: 'Amani Otieno', email: 'amani@baridi.test', title: 'Chief executive', team: 'Leadership' },
    { name: 'Wairimu Kamau', email: 'wairimu@baridi.test', title: 'Sales lead', team: 'Sales' },
    { name: 'Kevin Omondi', email: 'kevin@baridi.test', title: 'Sales rep', team: 'Sales' },
    { name: 'Kevin Omondi', email: 'kevin@baridi.test' },
    { email: 'nobody@baridi.test' },
  ] },
  'Org chart': { rules: [], teams: [{ team: 'Sales', manager: 'Wairimu' }, { team: 'Finance', manager: 'Grace Achieng' }] },
  'Client list': { rules: [], clients: [{ name: 'Kito Foods', owner: 'Kevin' }, { name: 'Green Mart' }] },
  '2027 strategy': { rules: [], goals: [{ goal: 'Customers pay within 30 days' }, { goal: 'Keep every supermarket we have' }] },
  'Job descriptions': { rules: [], roles: [{ role: 'Sales rep', owns: 'their own accounts, from first visit to payment' }] },
};

describe('what of a document\'s records is kept', () => {
  it('keeps each record with what it must have, once', () => {
    const people = onlyTheRecordsThatHold(ANSWERS['Staff list']);
    expect(people.map((x) => (x.data as any).name)).toEqual(['Grace Achieng', 'Amani Otieno', 'Wairimu Kamau', 'Kevin Omondi']);
    expect(onlyTheRecordsThatHold(ANSWERS['2027 strategy']).map((x) => (x.data as any).goal)).toEqual(['Customers pay within 30 days.', 'Keep every supermarket we have.']);
    expect(onlyTheRecordsThatHold(ANSWERS['Job descriptions'])[0].data).toEqual({ role: 'Sales rep', owns: 'Their own accounts, from first visit to payment.' });
  });
});

function aBed(directionOn = true) {
  const items: any[] = []; const people: any[] = []; const subjects: any[] = []; const roles: any[] = []; const directions: any[] = [];
  let id = 0;
  const prisma: any = {
    organization: { findUnique: async ({ select }: any) => (select.release9PolicyOn ? { release9PolicyOn: true } : select.release6DirectionOn ? { release6DirectionOn: directionOn } : { name: 'Baridi' }) },
    policyDocument: { create: async ({ data }: any) => ({ id: `d${++id}`, ...data }), findMany: async () => [] },
    policyRule: { create: async () => ({}), findMany: async () => [], updateMany: async () => ({}) },
    setupItem: {
      create: async ({ data }: any) => { items.push({ id: `i${++id}`, createdAt: new Date(Date.now() + id), ...data }); },
      findMany: async () => [...items],
      updateMany: async ({ where, data }: any) => { for (const i of items) if (where.id.in.includes(i.id)) Object.assign(i, data); },
    },
    person: {
      upsert: async ({ create }: any) => { people.push(create); },
      updateMany: async ({ where, data }: any) => { for (const p of people) if (p.department === where.department && p.externalId !== where.NOT.externalId) Object.assign(p, data); },
    },
    subject: { upsert: async ({ create }: any) => { subjects.push(create); } },
    role: { upsert: async ({ create }: any) => { roles.push(create); } },
    directionVersion: { findFirst: async () => directions[0] ?? null, create: async ({ data }: any) => { directions.push(data); } },
  };
  const anthropic: any = { extract: async (_p: string, msgs: any[]) => ANSWERS[String(msgs[0].content).split('\n')[0]] };
  const svc = new PolicyService(prisma, anthropic, { ingestDocument: async () => undefined } as any, {} as any);
  return { svc, people, subjects, roles, directions };
}
const GRACE = { userId: 'grace', organizationId: 'baridi', role: 'ADMIN' };

describe('Release 9: the other setup areas, as Grace sets them up', () => {
  it('reads each area in the prototype\'s words, with where it came from', async () => {
    const { svc } = aBed();
    for (const name of Object.keys(ANSWERS)) await svc.addDocument(GRACE, { name, text: 'Hand-written.' });
    const page: any = (await svc.setup(GRACE)).setup;
    expect(page.areas.map((a: any) => a.heading)).toEqual(['People and sign-in', 'Teams and who approves what', 'Clients', 'Direction', 'The role map']);
    expect(page.areas[0].says).toBe('4 people, from the staff list. Each person is invited when their team starts using Groundwork.');
    expect(page.areas[1].says).toBe('2 teams and their managers, from the org chart.');
    expect(page.areas[2].says).toBe('2 clients, 1 with an owner, from the client list.');
    expect(page.areas[3].says).toBe('2 goals, marked as what you currently believe until you confirm them.');
    expect(page.areas[4]).toMatchObject({ says: '1 role and what each owns, from the job descriptions.', from: 'From the job descriptions.' });
  });

  it('writes each approved area into its own store, and invites nobody', async () => {
    const { svc, people, subjects, roles, directions } = aBed();
    for (const name of Object.keys(ANSWERS)) await svc.addDocument(GRACE, { name, text: 'Hand-written.' });
    await svc.approve(GRACE, { area: 'people' });
    await svc.approve(GRACE, { area: 'teams' });
    await svc.approve(GRACE, { area: 'clients' });
    await svc.approve(GRACE, { area: 'direction' });
    await svc.approve(GRACE, { area: 'roles' });
    expect(people.find((p) => p.displayName === 'Kevin Omondi')).toMatchObject({ email: 'kevin@baridi.test', department: 'Sales', managerExternalId: 'setup:wairimu@baridi.test' });
    expect(people.find((p) => p.displayName === 'Wairimu Kamau').managerExternalId).toBeNull();
    expect(subjects.map((x) => [x.title, x.ownerExternalId])).toEqual([['Kito Foods', 'setup:kevin@baridi.test'], ['Green Mart', null]]);
    expect(directions).toEqual([expect.objectContaining({ version: 1, now: { believe: 'Customers pay within 30 days. Keep every supermarket we have.' } })]);
    expect(roles).toEqual([expect.objectContaining({ name: 'Sales rep', description: 'Their own accounts, from first visit to payment.' })]);
    const page: any = (await svc.setup(GRACE)).setup;
    expect(page.areas.every((a: any) => a.approved)).toBe(true);
  });

  it('never sets a direction over one already set, or where direction is off', async () => {
    const off = aBed(false);
    await off.svc.addDocument(GRACE, { name: '2027 strategy', text: 'x' });
    await expect(off.svc.approve(GRACE, { area: 'direction' })).rejects.toThrow('That could not be found.');
  });
});
