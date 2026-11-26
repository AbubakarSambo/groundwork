import { theirPlaceHereOnceAdded, letThemIn, pauseThoseNotLetInWithinAWeek, theWeekSays, theWeeksSay, A_WEEK_TO_SAY_YES_MS } from './a-guest-is-a-guest-from-the-moment-they-are-added';
import { waitingForAnAdminsYes, refuseSomeoneHeldForASeat, theHeldPersonWhoHasAnswered, WAITING_FOR_AN_ADMINS_YES } from './held-for-a-seat';
import { whatApprovingSays } from '../billing/what-a-month-costs';

/**
 * WHO TAKES A SEAT, AND WHEN (Hafsah, 26 November 2026).
 * "Anyone invited to a check-in takes a seat the moment admin approves." And: leads can add people; somebody new here, or a guest,
 * checks in at once, the admin gets the list and has a week to let them in and give them a seat, or their check-ins pause. Their week
 * is their own check-in only: the board and the reports open once they are let in (privacy row 5, kept).
 */
function aDb() {
  const users: any[] = []; const memberships: any[] = []; const requests: any[] = []; const rows: any[] = []; const grounds = [{ id: 'g1', organizationId: 'rhea' }];
  const match = (o: any, where: any): boolean => Object.entries(where ?? {}).every(([k, v]: [string, any]) => {
    if (k === 'ground') return match(grounds.find((g) => g.id === o.groundId), v);
    if (v && typeof v === 'object' && 'not' in v) return o[k] !== v.not;
    if (v && typeof v === 'object' && 'lte' in v) return new Date(o[k]).getTime() <= new Date(v.lte).getTime();
    return o[k] === v;
  });
  const key = (w: any) => w.userId_organizationId ?? w.organizationId_userId;
  const db: any = {
    users, memberships, requests, rows,
    ground: { findUnique: async ({ where }: any) => grounds.find((g) => g.id === where.id) ?? null },
    user: {
      findUnique: async ({ where }: any) => users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null,
      create: async ({ data }: any) => { const u = { id: `u${users.length + 1}`, isActive: true, deletedAt: null, ...data }; users.push(u); return u; },
    },
    organizationMembership: {
      findUnique: async ({ where }: any) => memberships.find((m) => m.userId === key(where).userId && m.organizationId === key(where).organizationId) ?? null,
      create: async ({ data }: any) => { const m = { id: `m${memberships.length + 1}`, heldForASeat: false, ...data }; memberships.push(m); return m; },
      upsert: async ({ where, create, update }: any) => {
        const m = memberships.find((x) => x.userId === key(where).userId && x.organizationId === key(where).organizationId);
        if (m) { Object.assign(m, update); return m; }
        const n = { id: `m${memberships.length + 1}`, heldForASeat: false, ...create }; memberships.push(n); return n;
      },
      update: async ({ where, data }: any) => Object.assign(memberships.find((m) => m.id === where.id), data),
      updateMany: async ({ where, data }: any) => { const hit = memberships.filter((m) => match(m, where)); hit.forEach((m) => Object.assign(m, data)); return { count: hit.length }; },
    },
    membershipRequest: {
      upsert: async ({ where, create }: any) => { const r = requests.find((x) => x.userId === key(where).userId && x.organizationId === key(where).organizationId); if (r) return r; const n = { id: `r${requests.length + 1}`, status: 'PENDING', createdAt: new Date(), ...create }; requests.push(n); return n; },
      updateMany: async ({ where, data }: any) => { const hit = requests.filter((r) => match(r, where)); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; },
      findFirst: async ({ where }: any) => requests.find((r) => match(r, where)) ?? null,
      findMany: async ({ where }: any) => requests.filter((r) => match(r, where)),
    },
    groundParticipant: {
      findFirst: async ({ where }: any) => rows.find((r) => match(r, where)) ?? null,
      updateMany: async ({ where, data }: any) => { const hit = rows.filter((r) => match(r, where)); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; },
    },
  };
  return db;
}

describe('a lead adds somebody new: they check in at once, with no seat, and an admin has a week', () => {
  it('makes their account here, holding no seat, with a request for an admin', async () => {
    const db = aDb();
    expect(await theirPlaceHereOnceAdded(db, 'rhea', 'Ada@Out.test', { name: 'Ada Obi', byAnAdmin: false, addedBy: 'clinton', groundId: 'g1' })).toBe('waiting for a yes');
    expect(db.users[0]).toMatchObject({ email: 'ada@out.test', firstName: 'Ada', lastName: 'Obi', organizationId: 'rhea' });
    expect(db.memberships[0]).toMatchObject({ organizationId: 'rhea', heldForASeat: true });
    expect(db.requests[0]).toMatchObject({ organizationId: 'rhea', status: 'PENDING', requestedByUserId: 'clinton', groundId: 'g1' });
  });

  it('a guest from another organisation waits for a yes the same way', async () => {
    const db = aDb();
    db.users.push({ id: 'b', email: 'ben@elsewhere.test', organizationId: 'other', isActive: true, deletedAt: null });
    expect(await theirPlaceHereOnceAdded(db, 'rhea', 'ben@elsewhere.test', { byAnAdmin: false, addedBy: 'clinton', groundId: 'g1' })).toBe('waiting for a yes');
    expect(db.memberships[0]).toMatchObject({ userId: 'b', organizationId: 'rhea', role: 'GUEST', heldForASeat: true });
  });

  it('somebody already here is left alone', async () => {
    const db = aDb();
    db.users.push({ id: 'c', email: 'cate@rhea.test', organizationId: 'rhea', isActive: true, deletedAt: null });
    db.memberships.push({ id: 'm', userId: 'c', organizationId: 'rhea', heldForASeat: false });
    expect(await theirPlaceHereOnceAdded(db, 'rhea', 'cate@rhea.test', { byAnAdmin: false, addedBy: 'clinton', groundId: 'g1' })).toBe('already here');
    expect(db.requests).toHaveLength(0);
  });
});

describe('an admin adding them, or letting them in, is the yes that gives the seat', () => {
  it('an admin adding somebody new gives them a seat at once, and no request', async () => {
    const db = aDb();
    expect(await theirPlaceHereOnceAdded(db, 'rhea', 'dan@out.test', { byAnAdmin: true, addedBy: 'grace', groundId: 'g1' })).toBe('a seat');
    expect(db.memberships[0].heldForASeat).toBe(false);
    expect(db.requests).toHaveLength(0);
  });

  it('with no room, an admin adding them holds them for a seat', async () => {
    const db = aDb();
    expect(await theirPlaceHereOnceAdded(db, 'rhea', 'dan@out.test', { byAnAdmin: true, held: true, addedBy: 'grace', groundId: 'g1' })).toBe('held for a seat');
    expect(db.memberships[0].heldForASeat).toBe(true);
  });

  it('an admin adding somebody who was waiting lets them in', async () => {
    const db = aDb();
    await theirPlaceHereOnceAdded(db, 'rhea', 'ada@out.test', { byAnAdmin: false, addedBy: 'clinton', groundId: 'g1' });
    expect(await theirPlaceHereOnceAdded(db, 'rhea', 'ada@out.test', { byAnAdmin: true, addedBy: 'grace', groundId: 'g1' })).toBe('a seat');
    expect(db.memberships[0].heldForASeat).toBe(false);
    expect(db.requests[0]).toMatchObject({ status: 'APPROVED', decidedByUserId: 'grace' });
  });
});

describe('their week, and what happens when it runs out', () => {
  it('in their week they may check in, and the board and reports say why they are not open yet', async () => {
    const db = aDb();
    await theirPlaceHereOnceAdded(db, 'rhea', 'ada@out.test', { byAnAdmin: false, addedBy: 'clinton', groundId: 'g1' });
    const ada = db.users[0].id;
    db.rows.push({ groundId: 'g1', userId: ada, awaitingSeat: false, leftAt: null, invitedAt: new Date() });
    expect(await waitingForAnAdminsYes(db, 'g1', ada)).toBe(true);
    await expect(refuseSomeoneHeldForASeat(db, 'g1', ada)).rejects.toThrow(WAITING_FOR_AN_ADMINS_YES);
    /* Their own page, narrowed, never refused: they can answer. */
    expect(await theHeldPersonWhoHasAnswered(db, 'g1', ada)).toBe('waiting');
  });

  it('a week with no yes pauses their check-ins, and letting them in starts them again', async () => {
    const db = aDb();
    await theirPlaceHereOnceAdded(db, 'rhea', 'ada@out.test', { byAnAdmin: false, addedBy: 'clinton', groundId: 'g1' });
    const ada = db.users[0].id;
    db.rows.push({ groundId: 'g1', userId: ada, awaitingSeat: false, leftAt: null, invitedAt: new Date() });
    expect(await pauseThoseNotLetInWithinAWeek(db, new Date(Date.now() + A_WEEK_TO_SAY_YES_MS - 60_000))).toBe(0);
    expect(db.rows[0].awaitingSeat).toBe(false);
    expect(await pauseThoseNotLetInWithinAWeek(db, new Date(Date.now() + A_WEEK_TO_SAY_YES_MS + 60_000))).toBe(1);
    expect(db.rows[0].awaitingSeat).toBe(true);
    await letThemIn(db, 'rhea', ada, 'grace');
    expect(db.rows[0].awaitingSeat).toBe(false);
    expect(db.memberships[0].heldForASeat).toBe(false);
    expect(await waitingForAnAdminsYes(db, 'g1', ada)).toBe(false);
  });

  it('says the week in full sentences, with the day it ends', () => {
    const asked = new Date('2026-11-26T09:00:00Z');
    expect(theWeekSays(asked, new Date('2026-11-27T09:00:00Z'))).toBe('They can check in until Thursday 3 December. After that their check-ins pause until you let them in.');
    expect(theWeekSays(asked, new Date('2026-12-04T09:00:00Z'))).toBe('Their week ran out, so their check-ins are paused until you let them in. What they already said is kept.');
    expect(theWeeksSay([asked, new Date('2026-11-27T09:00:00Z')], new Date('2026-11-27T10:00:00Z'))).toBe('Each of them can check in for a week after they were added, and the first week runs out on Thursday 3 December.');
  });
});

describe('what approving a check-in gives, said before Approve', () => {
  const base = { charged: true, whyFree: 'not paying' as const, taken: 18, included: 20, extraSeatCents: 500 };
  it('names who takes a seat, and what it adds past the plan', () => {
    expect(whatApprovingSays({ ...base, names: ['Ada Obi', 'Ben Eze', 'Chi Okafor'] }))
      .toBe('Approving it gives seats to Ada Obi, Ben Eze and Chi Okafor, who are new here. Your plan’s seats cover 2 of them. The other person needs a new seat, which adds $5 a month from today.');
  });
  it('says the bill does not change when the seats cover them, and nothing when nobody is new', () => {
    expect(whatApprovingSays({ ...base, names: ['Ada Obi'] })).toBe('Approving it gives a seat to Ada Obi, who is new here. Your plan’s seats cover them, so your bill doesn’t change.');
    expect(whatApprovingSays({ ...base, names: [] })).toBeNull();
  });
  it('in the free month, nothing is charged', () => {
    expect(whatApprovingSays({ ...base, charged: false, whyFree: 'free trial', names: ['Ada Obi'] })).toBe('Approving it gives a seat to Ada Obi, who is new here. Nothing is charged during your free trial.');
  });
});
