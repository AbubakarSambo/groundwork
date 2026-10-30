import { theDirectionAsRead, theTeamsBriefAsRead, theRealignment, theDirectionBlock } from './the-direction';
import { BARIDI, LIVE, TODAY } from './__fixtures__/baridi-direction';
import { DirectionService } from './direction.service';

const COLON_JOIN = /\b[a-z]+: [a-z]/;

describe('Release 6: the company\'s direction, as everybody reads it', () => {
  const d = theDirectionAsRead(BARIDI, { live: LIVE, lookedAt: new Set(['o-wairimu']), today: TODAY });

  it('has the six parts of "Now", each a full sentence', () => {
    expect(d.now.map((x) => x.title)).toEqual(['What we’re trying to achieve', 'Why it matters', 'What we currently believe', 'What we’ve learned so far', 'What matters most right now', 'Who owns what']);
    expect(d.now[0].says).toBe('Keep the customers we have, and get paid on time.');
  });

  it('says what changed in five numbered steps', () => {
    expect(d.whatChanged.map((x) => `${x.n}. ${x.label} ${x.says}`)).toEqual([
      '1. What we assumed. More sales would fix our cash.',
      '2. What showed it wasn’t true. Sales grew 12% in August, but cash in the bank fell.',
      '3. What we learned. Late payments, not too few sales, are the problem. Most late payers had a problem after the sale.',
      '4. What we decided. Move from winning new customers to keeping and getting paid by the ones we have.',
      '5. The new direction. Keep the customers we have, and get paid on time.',
    ]);
    expect(d.setOn).toBe('15 September');
  });

  it('says what it means for each team, with the lead\'s approval or who it waits for', () => {
    expect(d.teams.map((t) => [t.title, t.tag])).toEqual([['Sales', 'Wairimu approved'], ['Delivery', 'Lucy approved'], ['Finance', 'Grace approved'], ['Operations', 'Waiting for Njeri']]);
  });

  it('checks whether the organisation has realigned, from the record, every two weeks', () => {
    expect(d.realigned).toEqual([
      { title: 'Teams that have not agreed what it means for them', says: 'Operations is waiting for Njeri.' },
      { title: 'Commitments that no longer make sense', says: 'Miriam’s target, 20 new small shops a month, is still on the board, though Sales\'s brief stops it. It is suggested to them as one to stop or change.' },
      { title: 'Goals nobody has looked at since the change', says: '1 goal has not been continued, changed or stopped yet, from Miriam.' },
    ]);
    expect(d.nextCheckOn).toBe('13 October');
  });

  it('never joins pieces with a colon in anything a person reads', () => {
    const read = [...d.now.map((x) => x.says), ...d.whatChanged.map((x) => x.says), ...d.teams.map((x) => x.says), ...d.realigned.map((x) => x.says)]
    for (const t of read) expect(t).not.toMatch(COLON_JOIN)
  });

  it('says nothing is wrong once every team has approved and every goal is looked at', () => {
    const all = { ...BARIDI, teams: BARIDI.teams.map((t) => ({ ...t, approvedAt: t.approvedAt ?? '2026-09-20T09:00:00.000Z', brief: t.brief ? { ...t.brief, items: t.brief.items.filter((i) => i.verb !== 'Stop') } : t.brief })) };
    expect(theRealignment(all, LIVE, new Set(['o-miriam', 'o-wairimu']))).toEqual([]);
  });
});

describe('Release 6: a team\'s brief', () => {
  it('reads as the lead wrote it: what was decided and why, each line with whose it is, what is unclear, the questions now', () => {
    const b = theTeamsBriefAsRead(BARIDI, BARIDI.teams[0]);
    expect(b.says).toBe('Move from winning new customers to keeping and getting paid by the ones we have. This is because sales grew 12% in August, but cash in the bank fell.');
    expect(b.items.map((i) => `${i.verb}. ${i.says}`)).toEqual([
      'Stop. Chasing 20 new small shops a month (Miriam)', 'Continue. Supermarket renewals (Wairimu)',
      'Continue, changed. Corporate accounts, with payment checked first (Daniel)', 'Reassign. Kisumu follow-ups, from Brian to Miriam, since Brian is overloaded',
    ]);
    expect(b.unclear).toBe('Who calls a customer after installation is not clear.');
    expect(b.approvedSays).toBe('Wairimu approved the change for the team on 16 September.');
    expect(b.questionsNow).toEqual(['“Which of your customers are at risk of paying late, and what are you doing about it?” replaces “How many new shops did you visit?”']);
  });
});

describe('Release 6: what a team\'s check-in knows of the direction', () => {
  it('tells it the new direction, what it means here, the brief, the questions now, and never to count a stopped goal as missed', () => {
    const block = theDirectionBlock(BARIDI, 'g-sales', [{ name: '20 new small shops a month', owner: 'Miriam' }]);
    expect(block).toContain('THE COMPANY\'S DIRECTION CHANGED on 15 September.');
    expect(block).toContain('For this team it means: Ask about payment history before promising terms. Fewer new small accounts this quarter.');
    expect(block).toContain('Stop: Chasing 20 new small shops a month (Miriam Wanjiku).');
    expect(block).toContain('Do not ask the old questions they replace: "How many new shops did you visit?"');
    expect(block).toContain('Never count them as missed or late, and never ask for progress on them: 20 new small shops a month (Miriam).');
  });

  it('is empty for a team not in the direction, and with no direction', () => {
    expect(theDirectionBlock(BARIDI, 'g-elsewhere')).toBe('');
    expect(theDirectionBlock(null, 'g-sales')).toBe('');
  });
});

describe('Release 6: recommitting, so nobody is judged against the old plan', () => {
  const world = (opts: { on?: boolean; ownerUserId?: string; leadUserId?: string } = {}) => {
    const writes: any[] = [];
    const prisma: any = {
      organization: { findUnique: async () => ({ release6DirectionOn: opts.on ?? true }) },
      directionVersion: { findFirst: async () => ({ version: 2, setAt: BARIDI.setAt, setByUserId: 'u-amani', now: BARIDI.now, whatChanged: BARIDI.whatChanged, teams: BARIDI.teams }) },
      groundObjective: {
        findUnique: async () => ({ id: 'o-miriam', groundId: 'g-sales', name: '20 new small shops a month', target: 20, count: 9, unit: null, ownerParticipantId: 'p-miriam', owner: { userId: opts.ownerUserId ?? 'u-miriam' }, ground: { initiatorId: opts.leadUserId ?? 'u-wairimu', organizationId: 'o-baridi' } }),
        delete: async (a: any) => { writes.push(['delete', a.where.id]); },
        update: async (a: any) => { writes.push(['update', a.where.id, a.data]); },
      },
      goalVersion: { create: async (a: any) => { writes.push(['version', a.data]); } },
    };
    return { svc: new DirectionService(prisma), writes };
  };
  const MIRIAM = { userId: 'u-miriam', organizationId: 'o-baridi', role: 'MEMBER' };

  it('a goal stopped leaves the live targets, and its version is kept', async () => {
    const { svc, writes } = world();
    expect(await svc.recommit(MIRIAM, { objectiveId: 'o-miriam', outcome: 'stop' })).toEqual({ outcome: 'stopped', says: 'Stopped. It will not be counted as missed.' });
    expect(writes[0][0]).toBe('version');
    expect(writes[0][1]).toMatchObject({ outcome: 'stopped', name: '20 new small shops a month', count: 9, directionVersion: 2, decidedBy: 'person' });
    expect(writes[1]).toEqual(['delete', 'o-miriam']);
  });

  it('a goal changed starts again from nothing under its new words, and the old one is kept', async () => {
    const { svc, writes } = world();
    const r = await svc.recommit(MIRIAM, { objectiveId: 'o-miriam', outcome: 'change', newName: 'My 30 shops paid on time', newTarget: 30 });
    expect(r.says).toBe('Changed. This is your new starting point; the old one will not be counted as missed.');
    expect(writes[1]).toEqual(['update', 'o-miriam', { name: 'My 30 shops paid on time', target: 30, count: 0 }]);
  });

  it('only the person or their lead may decide, and nothing is written with the switch off', async () => {
    await expect(world({ ownerUserId: 'u-x', leadUserId: 'u-y' }).svc.recommit(MIRIAM, { objectiveId: 'o-miriam', outcome: 'stop' })).rejects.toThrow('Only the person whose goal it is, or their lead');
    const off = world({ on: false });
    await expect(off.svc.recommit(MIRIAM, { objectiveId: 'o-miriam', outcome: 'stop' })).rejects.toThrow('That could not be found.'); /* changed 25 October: an off switch is never named to a client */
    expect(off.writes).toEqual([]);
  });
});

/*
 * WHOSE GOAL IT IS (polish round 1, 25 October): Kevin had nothing to recommit because no goal had an owner. A goal with nobody named is
 * the goal of whoever runs the check-in; a goal the lead named somebody for is theirs.
 */
describe('Release 6: the goals each person recommits', () => {
  const goals = [
    { id: 'o-team', groundId: 'g-sales', name: '120 units sold by 30 October', target: 120, ownerParticipantId: null },
    { id: 'o-kevin', groundId: 'g-sales', name: '30 units sold', target: 30, ownerParticipantId: 'p-kevin' },
  ];
  const world = () => {
    const prisma: any = {
      organization: { findUnique: async () => ({ release6DirectionOn: true }) },
      directionVersion: { findFirst: async () => ({ version: 2, setAt: BARIDI.setAt, setByUserId: 'u-amani', now: BARIDI.now, whatChanged: BARIDI.whatChanged, teams: BARIDI.teams }) },
      groundParticipant: { findMany: async ({ where }: any) => (where.userId === 'u-kevin' ? [{ id: 'p-kevin', groundId: 'g-sales' }] : where.userId === 'u-wairimu' ? [{ id: 'p-wairimu', groundId: 'g-sales' }] : []) },
      ground: { findMany: async ({ where }: any) => (where.initiatorId === 'u-wairimu' ? [{ id: 'g-sales' }] : []) },
      groundObjective: {
        findMany: async ({ where }: any) => goals.filter((g) => where.OR.some((c: any) => (c.ownerParticipantId?.in ? c.ownerParticipantId.in.includes(g.ownerParticipantId) : c.ownerParticipantId === null && g.ownerParticipantId === null && c.groundId.in.includes(g.groundId)))),
      },
      goalVersion: { findMany: async () => [] },
    };
    return new DirectionService(prisma);
  };

  it('the lead who runs the check-in has the team goal nobody was named for; Kevin has his own', async () => {
    const svc = world();
    expect((await svc.mine({ userId: 'u-wairimu', organizationId: 'o-baridi', role: 'LEAD' } as any)).goals.map((g: any) => g.id)).toEqual(['o-team']);
    expect((await svc.mine({ userId: 'u-kevin', organizationId: 'o-baridi', role: 'MEMBER' } as any)).goals.map((g: any) => g.id)).toEqual(['o-kevin']);
  });
});
