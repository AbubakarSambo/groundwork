import { AssistantService } from './assistant.service';
import { route } from './the-router-is-deterministic';
import { readAMove, readACommitment, readTheDay, moveProposal, moveDone, additionProposal, additionDone, tickProposal, tickDone, onlyTheyCanChangeIt, NOTHING_WAS_CHANGED } from './a-change-said-back-first';

/**
 * WEEK 18: ASK GROUNDWORK CHANGES THINGS BY TALKING, AFTER A YES.
 *
 * A real AssistantService over an in-memory prisma, so what is checked is what a person reads and
 * what is in the rows afterwards. Today is Thursday 1 October 2026. Rukia is the asker. Baraka is a
 * colleague. Rukia leads "Sales team, Q3" (g1), where she made one commitment for Baraka.
 */
const NOW = new Date('2026-10-01T09:00:00Z');

function world(opts: { asker?: 'rukia' | 'baraka' } = {}) {
  const asker = opts.asker ?? 'rukia';
  const people = [
    { id: 'p-rukia', externalId: 'u-rukia', displayName: 'Rukia Otieno', givenName: 'Rukia', linkedUserId: 'user-rukia', active: true },
    { id: 'p-baraka', externalId: 'u-baraka', displayName: 'Baraka Mwangi', givenName: 'Baraka', linkedUserId: 'user-baraka', active: true },
  ];
  const commitments: any[] = [
    { id: 'c1', organizationId: 'org-a', personExternalId: 'u-rukia', text: 'Send the Westgate price list', dueSaid: 'Friday', dueAt: new Date('2026-10-02T00:00:00Z'), state: 'OPEN', sourcePersonObjectiveId: null },
    { id: 'c2', organizationId: 'org-a', personExternalId: 'u-baraka', text: 'Call the Kisumu depot', dueSaid: 'Monday', dueAt: new Date('2026-10-05T00:00:00Z'), state: 'OPEN', sourcePersonObjectiveId: 'o-lead-made' },
    { id: 'c3', organizationId: 'org-a', personExternalId: 'u-baraka', text: 'Write the Nakuru handover note', dueSaid: 'Tuesday', dueAt: new Date('2026-10-06T00:00:00Z'), state: 'OPEN', sourcePersonObjectiveId: 'o-self-made' },
  ];
  const objectives: any[] = [
    { id: 'o-lead-made', authoredBy: 'lead', status: 'OPEN', dueDate: commitments[1].dueAt, dueSaid: 'Monday', ground: { initiatorId: 'user-rukia', organizationId: 'org-a' } },
    { id: 'o-self-made', authoredBy: 'self', status: 'OPEN', dueDate: commitments[2].dueAt, dueSaid: 'Tuesday', ground: { initiatorId: 'user-rukia', organizationId: 'org-a' } },
  ];
  const todos: any[] = [
    { id: 't1', organizationId: 'org-a', personExternalId: 'u-rukia', text: 'Call the Kisumu depot about pallets', dueSaid: null, state: 'OPEN' },
    { id: 't3', organizationId: 'org-a', personExternalId: 'u-rukia', text: 'Call the Kisumu depot again', dueSaid: null, state: 'OPEN' },
    { id: 't2', organizationId: 'org-a', personExternalId: 'u-baraka', text: 'Order the banners', dueSaid: null, state: 'OPEN' },
  ];
  const proposals: any[] = [];
  const me = people.find((p) => p.id === `p-${asker}`)!;
  const match = (row: any, where: any): boolean => Object.entries(where).every(([k, v]: any) => {
    if (k === 'ground') return row.ground && Object.entries(v).every(([gk, gv]) => row.ground[gk] === gv);
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'not' in v) return row[k] !== v.not;
    return row[k] === v;
  });
  const table = (rows: any[]) => ({
    findMany: jest.fn(async ({ where = {} }: any = {}) => rows.filter((r) => match(r, where))),
    findFirst: jest.fn(async ({ where = {} }: any = {}) => rows.find((r) => match(r, where)) ?? null),
    update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id)!, data)),
    create: jest.fn(async ({ data }: any) => { const row = { id: `new${rows.length + 1}`, ...data }; rows.push(row); return row; }),
  });
  const commitmentTable = table(commitments);
  const objectiveTable = table(objectives);
  const proposalTable: any = {
    findFirst: jest.fn(async () => proposals.filter((p) => p.state === 'PARKED' && p.personExternalId === me.externalId).pop() ?? null),
    create: jest.fn(async ({ data }: any) => { const row = { id: `pr${proposals.length + 1}`, state: 'PARKED', createdAt: new Date(), ...data }; proposals.push(row); return row; }),
    update: jest.fn(async ({ where, data }: any) => Object.assign(proposals.find((p) => p.id === where.id)!, data)),
  };
  const prisma: any = {
    person: {
      findFirst: jest.fn(async ({ where }: any) => people.find((p) => (where.id ? p.id === where.id : p.externalId === where.externalId)) ?? null),
      findMany: jest.fn(async () => people),
    },
    commitment: commitmentTable,
    personObjective: objectiveTable,
    todo: table(todos),
    assistantProposal: proposalTable,
    assistantTurn: { count: jest.fn(async () => 5), createMany: jest.fn(async () => ({ count: 2 })), findMany: jest.fn(async () => []) },
  };
  const service = new AssistantService(
    prisma, { respond: jest.fn(async () => { throw new Error('model off'); }) } as any, { retrieve: jest.fn(async () => ({ cards: [], truncated: false })) } as any,
    { waitingAcrossTheOrg: async () => ({ waiting: [], waitedOn: [] }) } as any,
    { statusFor: async () => ({ roleName: null, gates: [], left: [] }) } as any,
    { pendingFor: async () => [], decide: async () => { throw new Error('none'); } } as any,
    { start: async () => { throw new Error('none'); } } as any,
    { forPerson: async () => ({ sessions: { value: [] } }) } as any,
    { read: async () => ({ read: false, because: 'none' }) } as any,
    { sendRoundDigest: async () => { throw new Error('none'); } } as any,
    {} as any,
  );
  const say = async (message: string) => service.respond('org-a', me.id, message);
  return { say, commitments, objectives, todos, proposals };
}
const words = (r: any) => r.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');
const proposalOf = (r: any) => r.blocks.find((b: any) => b.type === 'proposal');

beforeAll(() => { jest.useFakeTimers({ now: NOW }); });
afterAll(() => { jest.useRealTimers(); });

describe('moving your own deadline', () => {
  it('says the exact change back and writes nothing until a yes', async () => {
    const w = world();
    const r = await w.say('move Send the Westgate price list to Tuesday 6 October');
    expect(words(r)).toBe('Shall I move "Send the Westgate price list" from Friday 2 October to Tuesday 6 October?');
    expect(proposalOf(r)).toBeTruthy();
    expect(w.commitments[0].dueAt.toISOString()).toBe('2026-10-02T00:00:00.000Z');
  });

  it('moves it on a yes, in the commitment, and says so', async () => {
    const w = world();
    await w.say('push the Westgate price list back to Tuesday 6 October');
    const r = await w.say('yes');
    expect(words(r)).toBe('I have moved "Send the Westgate price list" to Tuesday 6 October.');
    expect(w.commitments[0].dueAt.toISOString()).toBe('2026-10-06T00:00:00.000Z');
    expect(w.commitments[0].dueSaid).toBe('Tuesday 6 October');
  });

  it('leaves it as it was on a no', async () => {
    const w = world();
    await w.say('move the Westgate price list to Tuesday 6 October');
    const r = await w.say('no');
    expect(words(r)).toBe('I have left it as it was. Nothing was changed.');
    expect(w.commitments[0].dueAt.toISOString()).toBe('2026-10-02T00:00:00.000Z');
  });

  it('reads a day said in words in code, and asks when it cannot', async () => {
    const w = world();
    const unread = await w.say('move the Westgate price list to next sprint');
    expect(words(unread)).toBe('I could not read a date from "next sprint". Which day do you mean? For example, Tuesday 7 October.');
    expect(proposalOf(unread)).toBeUndefined();
    const past = await w.say('move the Westgate price list to 2026-09-02');
    expect(words(past)).toBe('Wednesday 2 September has already passed. Which day do you mean?');
    expect(proposalOf(past)).toBeUndefined();
    expect(w.proposals).toHaveLength(0);
    const weekday = await w.say('move the Westgate price list to Monday');
    expect(words(weekday)).toBe('Shall I move "Send the Westgate price list" from Friday 2 October to Monday 5 October?');
  });
});

describe('a lead moving what the lead set', () => {
  it('may move a commitment made for Baraka on a check-in they run, through the same writer, and the check-in row moves too', async () => {
    const w = world();
    const r = await w.say('move the Kisumu depot to Wednesday');
    expect(words(r)).toBe('Shall I move "Call the Kisumu depot", which you set for Baraka, from Monday 5 October to Wednesday 7 October?');
    const done = await w.say('yes');
    expect(words(done)).toBe('I have moved "Call the Kisumu depot" to Wednesday 7 October.');
    expect(w.commitments[1].dueAt.toISOString()).toBe('2026-10-07T00:00:00.000Z');
    expect(w.objectives[0].dueDate.toISOString()).toBe('2026-10-07T00:00:00.000Z');
  });

  it('may not move what Baraka said for himself', async () => {
    const w = world();
    const r = await w.say("move Baraka's Nakuru handover note to Friday");
    expect(words(r)).toBe('Only Baraka can change what Baraka said they would do.');
    expect(w.proposals).toHaveLength(0);
    expect(w.commitments[2].dueAt.toISOString()).toBe('2026-10-06T00:00:00.000Z');
  });

  it('is checked again at the yes: a check-in that has passed to somebody else moves nothing', async () => {
    const w = world();
    await w.say('move the Kisumu depot to Wednesday');
    w.objectives[0].ground.initiatorId = 'user-someone-else';
    const r = await w.say('yes');
    expect(words(r)).toBe('Only Baraka can change what Baraka said they would do. You can no longer move it for them, so I have changed nothing.');
    expect(w.commitments[1].dueAt.toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });
});

describe('a colleague is refused plainly', () => {
  it('Baraka cannot move what Rukia said, and is never told it exists', async () => {
    const w = world({ asker: 'baraka' });
    const r = await w.say("move Rukia's Westgate price list to Tuesday 6 October");
    expect(words(r)).toBe('Only Rukia can change what Rukia said they would do.');
    expect(w.proposals).toHaveLength(0);
    expect(w.commitments[0].dueAt.toISOString()).toBe('2026-10-02T00:00:00.000Z');
  });

  it('nor can Baraka mark it done, and without a name it reads as nothing on his list', async () => {
    const w = world({ asker: 'baraka' });
    expect(words(await w.say("mark Rukia's Westgate price list as done"))).toBe('Only Rukia can change what Rukia said they would do.');
    const blind = await w.say('mark the Westgate price list as done');
    expect(words(blind)).not.toMatch(/Rukia/);
    expect(w.commitments[0].state).toBe('OPEN');
  });
});

describe('adding a commitment', () => {
  it('is said back with the day, written only on a yes, and is the asker\'s own', async () => {
    const w = world();
    const r = await w.say('add a commitment: Book the room for the launch by Friday');
    expect(words(r)).toBe('Shall I add "Book the room for the launch" as something you will do by Friday 2 October?');
    expect(w.commitments).toHaveLength(3);
    const done = await w.say('yes');
    expect(words(done)).toBe('I have added "Book the room for the launch" as something you will do by Friday 2 October.');
    const added = w.commitments[3];
    expect(added).toMatchObject({ personExternalId: 'u-rukia', state: 'OPEN', source: 'assistant', dueSaid: 'by Friday' });
    expect(added.dueAt.toISOString()).toBe('2026-10-02T00:00:00.000Z');
  });

  it('a no writes nothing', async () => {
    const w = world();
    await w.say('add a commitment: Book the room for the launch by Friday');
    expect(words(await w.say('no'))).toBe(NOTHING_WAS_CHANGED);
    expect(w.commitments).toHaveLength(3);
  });

  it('with no day said, none is invented', async () => {
    const w = world();
    expect(words(await w.say('add a commitment: Call the Naivasha depot'))).toBe('Shall I add "Call the Naivasha depot" as something you will do?');
  });

  it('a day that cannot be read is asked for, not guessed', async () => {
    const w = world();
    const r = await w.say('add a commitment: Book the room for the launch by the 5th');
    expect(words(r)).toBe('I could not read a date from "by the 5th". Which day do you mean? For example, Tuesday 7 October.');
    expect(w.proposals).toHaveLength(0);
  });
});

describe('ticking something off is said back first', () => {
  it('a to-do is not closed by the sentence, only by the yes', async () => {
    const w = world();
    const r = await w.say('mark Call the Kisumu depot about pallets as done');
    expect(words(r)).toBe('Shall I mark "Call the Kisumu depot about pallets" as done?');
    expect(w.todos[0].state).toBe('OPEN');
    expect(words(await w.say('yes'))).toBe('I have marked "Call the Kisumu depot about pallets" as done.');
    expect(w.todos[0].state).toBe('DONE');
  });

  it('a no leaves it open', async () => {
    const w = world();
    await w.say('tick off the Kisumu depot pallets');
    expect(words(await w.say('no'))).toBe(NOTHING_WAS_CHANGED);
    expect(w.todos[0].state).toBe('OPEN');
  });

  it('your own commitment can be marked done the same way, and another person\'s to-do cannot be reached', async () => {
    const w = world();
    expect(words(await w.say('done: Send the Westgate price list'))).toBe('Shall I mark "Send the Westgate price list" as done?');
    await w.say('yes');
    expect(w.commitments[0].state).toBe('KEPT');
    const other = await w.say('done: Order the banners');
    expect(words(other)).not.toContain('Shall I');
    expect(w.todos.find((t: any) => t.id === 't2').state).toBe('OPEN');
  });

  it('more than one match asks which, and closes nothing', async () => {
    const w = world();
    const r = await w.say('done: Call the Kisumu depot');
    expect(words(r)).toContain('More than one of these could be it.');
    expect(w.proposals).toHaveLength(0);
  });
});

describe('what a person reads is whole sentences the product wrote', () => {
  const samples = [
    moveProposal({ commitmentId: 'c', text: 'Send the Westgate price list', ownerExternalId: 'u', ownerFirstName: null, was: { at: '2026-10-02T00:00:00.000Z', said: null }, toISO: '2026-10-06T00:00:00.000Z', toSaid: 'Tuesday' }),
    moveDone({ commitmentId: 'c', text: 'Send the Westgate price list', ownerExternalId: 'u', ownerFirstName: null, was: { at: null, said: null }, toISO: '2026-10-06T00:00:00.000Z', toSaid: 'Tuesday' }),
    additionProposal({ text: 'Book the room', dueSaid: null, dueISO: '2026-10-02T00:00:00.000Z' }),
    additionDone({ text: 'Book the room', dueSaid: null, dueISO: null }),
    tickProposal({ kind: 'todo', id: 'x', text: 'Call the depot' }),
    tickDone({ kind: 'todo', id: 'x', text: 'Call the depot' }),
    onlyTheyCanChangeIt('Baraka'),
    NOTHING_WAS_CHANGED,
  ];
  it.each(samples)('%s', (s) => {
    expect(s).not.toMatch(/ -> |→|;|\s:\s|—/);
    expect(s).toMatch(/[.?]$/);
  });
  it('reads the move and the addition as they are said', () => {
    expect(readAMove('move the rota to Friday')).toEqual({ what: 'the rota', whenSaid: 'Friday' });
    expect(readACommitment('add a commitment: Book the room by Friday')).toEqual({ text: 'Book the room', dueSaid: 'by Friday' });
    expect('ask' in readTheDay('soon', NOW)).toBe(true);
  });
  it('routes each way in, and leaves questions alone', () => {
    expect(route('move the rota to Friday').lane).toBe('move_a_deadline');
    expect(route('add a commitment: book the room').lane).toBe('add_a_commitment');
    expect(route('mark the rota as done').lane).toBe('tick_off_a_to_do');
    expect(route('what did I commit to').lane).toBe('what_did_i_commit_to');
    expect(route('add the rota to my to-do list').lane).toBe('add_a_to_do');
  });
});
