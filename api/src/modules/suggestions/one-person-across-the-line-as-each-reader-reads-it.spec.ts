import { ConversationService } from '../conversation/conversation.service';
import { GroundsService } from '../grounds/grounds.service';
import { GroundworkEvents } from '../../common';
import { theEndingPageFor } from '../resolution/what-the-ending-page-reads';
import { SuggestionsListener } from './suggestions.listener';
import { SuggestionsService, REFUSED } from './suggestions.service';
import { SUGGESTION_THRESHOLDS_KEY } from './thresholds';

/**
 * ONE PERSON WALKS ACROSS THE LINE, THROUGH THE REAL SERVICES (item 4 of Hafsah's list; decisions 6,
 * 38, 53, 58, 61; weeks 9, 10, 11 and 23).
 *
 * Baridi Appliances. Wairimu Kamau runs "Tobi, the next six weeks", a performance plan (PIP, an
 * evaluation check-in, decision 17), about Tobi Okafor. Miriam Wanjiku is on it as a colleague giving
 * a view. Grace Achieng is an admin who set it up, so she has access. Omar Haddad is an admin with no
 * access to it.
 *
 * Nothing is handed to the services but what a real check-in leaves behind: commitments made in each
 * weekly session, settled by ConversationService.settleWhatTheySaidTheyWouldDo from what Tobi says in
 * the next one (the model's reading is the only thing stubbed), or by Tobi by hand through
 * GroundsService.setMyCommitment; the events those fire reach the real SuggestionsListener; and every
 * reader is served through SuggestionsService and the ending page. The settings row holds decision
 * 61's threshold, as the migration writes it.
 */

const ORG = 'org-baridi';
const G = 'g-tobi';
const people = {
  wairimu: { userId: 'u-wairimu', firstName: 'Wairimu', lastName: 'Kamau', role: 'MEMBER' },
  tobi: { userId: 'u-tobi', firstName: 'Tobi', lastName: 'Okafor', role: 'MEMBER' },
  miriam: { userId: 'u-miriam', firstName: 'Miriam', lastName: 'Wanjiku', role: 'MEMBER' },
  grace: { userId: 'u-grace', firstName: 'Grace', lastName: 'Achieng', role: 'ADMIN' },
  omar: { userId: 'u-omar', firstName: 'Omar', lastName: 'Haddad', role: 'ADMIN' },
  /* A lead of another team, who runs nothing here (decision 93, row 17). */
  leila: { userId: 'u-leila', firstName: 'Leila', lastName: 'Hassan', role: 'LEAD' },
};
type Who = keyof typeof people;

const party = (id: string, who: Who, partyType: string, day: number) => ({
  id, userId: people[who].userId, partyType, roleAsDescribed: null, email: `${who}@baridi.test`, nameGiven: null, managingOnly: false,
  detectedFunction: null, detectedFunctionConfidence: null,
  createdAt: new Date(Date.UTC(2026, 7, day)),
  user: { firstName: people[who].firstName, lastName: people[who].lastName, email: `${who}@baridi.test` },
});

const DAY = 86_400_000;
const at = (iso: string) => new Date(`${iso}T10:00:00Z`);

/** Where a value in a Prisma `where` matches a field: null, { not }, { in }, { lt }, or equal. */
function fieldMatches(value: any, cond: any): boolean {
  if (cond === null) return value === null || value === undefined;
  if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
    if ('not' in cond) return cond.not === null ? value !== null && value !== undefined : value !== cond.not;
    if ('in' in cond) return cond.in.includes(value);
    if ('lt' in cond) return value instanceof Date && value.getTime() < new Date(cond.lt).getTime();
    return true;
  }
  return value === cond;
}

function aWorld(opts: { leave?: { startsOn: Date; endsOn: Date }[]; thresholdRow?: any; scenario?: string; label?: string } = {}) {
  const ground: any = {
    id: G, label: opts.label ?? 'Tobi, the next six weeks', organizationId: ORG, initiatorId: 'u-wairimu', createdByUserId: 'u-grace',
    scenario: opts.scenario ?? 'PIP', peersVisibleToEachOther: null, cadence: 'WEEKLY', patternDetections: [],
    participants: [party('p-wairimu', 'wairimu', 'INITIATOR', 1), party('p-tobi', 'tobi', 'PARTICIPANT', 2), party('p-miriam', 'miriam', 'PARTICIPANT', 3)],
  };
  const commitments: any[] = [];
  const suggestions: any[] = [];
  const checkIns = new Map<string, any>();
  let n = 0;
  const participantOf = (id: string) => ground.participants.find((p: any) => p.id === id);
  const suggestionMatches = (row: any, where: any) => Object.entries(where ?? {}).every(([k, v]: [string, any]) =>
    k === 'about' ? participantOf(row.aboutParticipantId)?.userId === v.userId : fieldMatches(row[k], v));
  const sortBy = (rows: any[], orderBy: any) => {
    if (!orderBy) return rows;
    const [[key, dir]] = Object.entries(orderBy) as [string, string][];
    return [...rows].sort((a, b) => (new Date(a[key] ?? 0).getTime() - new Date(b[key] ?? 0).getTime()) * (dir === 'desc' ? -1 : 1));
  };

  const prisma: any = {
    ground: {
      findUnique: jest.fn(async ({ select }: any) => {
        const wanted = select?.participants?.where;
        const participants = wanted ? ground.participants.filter((p: any) => Object.entries(wanted).every(([k, v]) => p[k] === v)) : ground.participants;
        return { ...ground, participants };
      }),
    },
    groundParticipant: {
      findFirst: jest.fn(async ({ where }: any) => ground.participants.find((p: any) => (!where.id || p.id === where.id) && (!where.userId || p.userId === where.userId)) ?? null),
    },
    groundCommitment: {
      findMany: jest.fn(async ({ where }: any) => sortBy(commitments.filter((c) => Object.entries(where).every(([k, v]) => fieldMatches(c[k], v))), { createdAt: 'asc' })),
      findFirst: jest.fn(async ({ where }: any) => commitments.find((c) => c.id === where.id && c.groundId === where.groundId) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(commitments.find((c) => c.id === where.id), data)),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = commitments.filter((c) => c.id === where.id && (!where.status || c.status === where.status));
        hit.forEach((c) => Object.assign(c, data));
        return { count: hit.length };
      }),
    },
    checkIn: { findUnique: jest.fn(async ({ where }: any) => checkIns.get(where.id) ?? null) },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => {
        const who = Object.values(people).find((p) => p.userId === where.userId_organizationId.userId);
        return who && where.userId_organizationId.organizationId === ORG ? { role: who.role } : null;
      }),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) => Object.values(people).filter((p) => where.id.in.includes(p.userId)).map((p) => ({ id: p.userId, firstName: p.firstName }))),
    },
    platformSetting: {
      findUnique: jest.fn(async ({ where }: any) => (where.key === SUGGESTION_THRESHOLDS_KEY
        ? (opts.thresholdRow === undefined ? { value: { support: { keptBelow: 0.5, overPeriods: 6 } } } : opts.thresholdRow)
        : null)),
    },
    leaveRequest: {
      findMany: jest.fn(async ({ where }: any) => (where.userId === 'u-tobi' && where.status === 'approved' ? opts.leave ?? [] : [])),
    },
    personObjective: { findMany: jest.fn(async () => []) },
    patternDetection: { findMany: jest.fn(async () => []), updateMany: jest.fn(async () => ({ count: 0 })) },
    suggestion: {
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `s-${++n}`, decision: null, decisionReason: null, decidedById: null, decidedAt: null, theirSide: null, theirSideAt: null,
          appeal: null, appealedAt: null, appealOutcome: null, appealReason: null, appealDecidedById: null, appealDecidedAt: null,
          createdAt: new Date(), ...data,
        };
        suggestions.push(row);
        return { id: row.id };
      }),
      findFirst: jest.fn(async ({ where, orderBy }: any) => sortBy(suggestions.filter((r) => suggestionMatches(r, where)), orderBy)[0] ?? null),
      findMany: jest.fn(async ({ where, orderBy }: any) => sortBy(suggestions.filter((r) => suggestionMatches(r, where)), orderBy)),
      findUnique: jest.fn(async ({ where }: any) => {
        const r = suggestions.find((x) => x.id === where.id);
        return r ? { ...r, about: { userId: participantOf(r.aboutParticipantId)?.userId ?? null } } : null;
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(suggestions.find((x) => x.id === where.id), data)),
    },
  };

  /* The events, delivered to the real listener, and awaited so the test reads what they wrote. */
  const pending: Promise<unknown>[] = [];
  const service = new SuggestionsService(prisma);
  const listener = new SuggestionsListener(prisma, service);
  const fired: string[] = [];
  const events: any = {
    emit: (name: string, payload: any) => {
      fired.push(name);
      if (name === GroundworkEvents.CHECK_IN_COMPLETED) pending.push(listener.onCheckInCompleted(payload));
      if (name === GroundworkEvents.COMMITMENTS_SETTLED) pending.push(listener.onCommitmentsSettled(payload));
      return true;
    },
  };
  const settle = { outcomes: [] as { item: number; happened: string }[] };
  const anthropic: any = { extract: jest.fn(async () => ({ outcomes: settle.outcomes })) };
  const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
  const conversation = new ConversationService(prisma, {} as any, anthropic, {} as any, events, nothing, nothing, nothing, nothing, nothing) as any;
  const grounds = new GroundsService(prisma, {} as any, {} as any, events, {} as any, {} as any, {} as any);

  const as = (who: Who) => ({ userId: people[who].userId, organizationId: ORG });
  const settled = async () => { while (pending.length) await Promise.all(pending.splice(0)); };

  /** Tobi says what he will do, in session `session`, on `day`. */
  function promises(session: number, day: string, texts: string[]) {
    for (const text of texts) {
      commitments.push({
        id: `c-${commitments.length + 1}`, groundId: G, participantId: 'p-tobi', text, whenSaid: 'this week', status: 'UNKNOWN',
        statedInSession: session, createdAt: at(day), settledAt: null, settledBy: null,
      });
    }
  }

  /**
   * Session `session` happens on `day`: the check-in completes (checkin.completed fires first, as in
   * ConversationService.finishTheSession), then what Tobi said about each open promise is read and
   * settled - `happened` in the order they were made.
   */
  async function aSession(session: number, day: string, happened: ('DONE' | 'NOT_DONE')[]) {
    jest.setSystemTime(at(day));
    const id = `ci-${session}`;
    checkIns.set(id, {
      groundId: G, participantId: 'p-tobi', startedAt: new Date(at(day).getTime() - 3_600_000),
      turns: [{ role: 'AI', content: 'How did last week go?' }, { role: 'PERSON', content: 'Some of it got done, some of it did not.' }],
    });
    events.emit(GroundworkEvents.CHECK_IN_COMPLETED, { checkInId: id, groundId: G, participantId: 'p-tobi', sessionNumber: session });
    await settled();
    settle.outcomes = happened.map((h, i) => ({ item: i + 1, happened: h }));
    await conversation.settleWhatTheySaidTheyWouldDo(id);
    await settled();
  }

  return { prisma, service, conversation, grounds, as, suggestions, commitments, promises, aSession, settled, fired, ground };
}

/** Everything a reader is handed, as one string, for the rules that hold everywhere. */
const served = (x: unknown) => JSON.stringify(x);
const A_LABEL = /\b(PIP|at[- ]risk|exit|low[- ]performer|under-?perform\w*|poor performer|performance plan)\b/i;
const A_RATING = /specificity|confidence|severity|rating|score|"verdict"|\bsupport"/i;
/* Decision 86 reverses decision 53's "no count for the manager": the lead and an admin read the count in the
   suggestion's why, of this check-in only. What they must never read is the count as it is said to the person
   ("two of your six"), or a share in a form nobody asked for. */
const THE_PERSONS_OWN_COUNT = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten) of your\b|\d+ in 100/i;

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'nextTick', 'queueMicrotask'] });
});
afterEach(() => jest.useRealTimers());

/** Three weekly sessions: Tobi keeps 1 of 3, then 1 of 3. Six settled, two kept: below half. */
async function acrossTheLine(world = aWorld()) {
  world.promises(1, '2026-09-07', ['Call the Freshland owner', 'Visit Green Mart', 'Send the price list to Mama Fresh']);
  await world.aSession(2, '2026-09-14', ['DONE', 'NOT_DONE', 'NOT_DONE']);
  world.promises(2, '2026-09-14', ['Call the Naivas buyer', 'Book the freezer delivery', 'Visit the Kilimani shop']);
  await world.aSession(3, '2026-09-21', ['DONE', 'NOT_DONE', 'NOT_DONE']);
  return world;
}

describe('the walk across the line, through the real services', () => {
  it('three settled is not enough: after the second session nothing is reached', async () => {
    const w = aWorld();
    w.promises(1, '2026-09-07', ['Call the Freshland owner', 'Visit Green Mart', 'Send the price list to Mama Fresh']);
    await w.aSession(2, '2026-09-14', ['DONE', 'NOT_DONE', 'NOT_DONE']);
    expect(w.commitments.filter((c) => c.status !== 'UNKNOWN')).toHaveLength(3);
    expect(w.suggestions).toHaveLength(0);
  });

  it('the session that takes Tobi across the line reaches the suggestion then, not a check-in late', async () => {
    const w = await acrossTheLine();
    /* checkin.completed fired before the session's promises were settled, and reached nothing; the
       settling that followed fired commitments.settled, and that reached it. */
    expect(w.fired.filter((e) => e === GroundworkEvents.COMMITMENTS_SETTLED)).toHaveLength(2);
    expect(w.suggestions).toHaveLength(1);
    expect(w.suggestions[0]).toMatchObject({ aboutParticipantId: 'p-tobi', verdict: 'support', theirOwnAnswer: null });
  });

  it('nobody but Tobi is suggested about: not Wairimu, who runs it, and not Miriam, who has nothing settled', async () => {
    const w = await acrossTheLine();
    expect(w.suggestions.map((s) => s.aboutParticipantId)).toEqual(['p-tobi']);
  });
});

describe('what each reader reads, once Tobi is across the line', () => {
  it('Tobi reads the facts, what would change them, and that Wairimu has not decided, before anybody else', async () => {
    const w = await acrossTheLine();
    const [s]: any[] = (await w.service.forGround(G, w.as('tobi'))).suggestions;
    expect(s.facts).toBe('In the last four weeks, you kept two of your six commitments in this check-in. When fewer than half are kept, Groundwork suggests extra help to Wairimu Kamau.');
    expect(s.whatWouldChangeIt).toBe('Keeping at least half of your commitments in this check-in over the next four weeks.');
    expect(s.leadName).toBe('Wairimu');
    expect(s.decision).toBeNull();
    expect(s.mayAppeal).toBe(false);
    for (const hidden of ['headline', 'why', 'verdict', 'theirOwnAnswer']) expect(s).not.toHaveProperty(hidden);
    /* The same on his You board and on the ending page. */
    expect(served(await w.service.aboutYou(w.as('tobi')))).toContain(s.facts);
    const page = await theEndingPageFor({ prisma: w.prisma, suggestions: w.service }, G, 'u-tobi');
    expect(page.reader).toBe('person');
    expect(page.aboutYou.map((x) => x.facts)).toEqual([s.facts]);
    expect(page.suggestions).toEqual([]);
    expect(served(page)).not.toMatch(A_LABEL);
  });

  it('Wairimu reads nothing until Tobi has had his turn (decision 53)', async () => {
    const w = await acrossTheLine();
    expect((await w.service.forGround(G, w.as('wairimu'))).suggestions).toEqual([]);
    expect((await theEndingPageFor({ prisma: w.prisma, suggestions: w.service }, G, 'u-wairimu')).suggestions).toEqual([]);
  });

  it('then Wairimu reads the suggestion by name, why, what would change it and Tobi\'s side, with the count behind it and no rating (decision 86)', async () => {
    const w = await acrossTheLine();
    const id = w.suggestions[0].id;
    await w.service.addSide(id, w.as('tobi'), { side: 'Two of the shops were closed for the holiday week.' });
    const [s]: any[] = (await w.service.forGround(G, w.as('wairimu'))).suggestions;
    expect(s.headline).toBe('Groundwork suggests extra support for Tobi Okafor');
    expect(s.why).toBe('In the last four weeks, Tobi Okafor kept two of the six commitments made in this check-in. That is 33%. When fewer than half are kept, Groundwork suggests extra support.');
    expect(s.whatWouldChangeIt).toBe('If Tobi Okafor keeps at least half of the commitments made in this check-in over the next four weeks.');
    expect(s.ifYouAgree).toBe('Extra support for Tobi Okafor over the next four weeks, agreed with Tobi.');
    expect(s.otherChoices).toEqual(['Keep things as they are', 'Talk it through with Tobi Okafor before deciding']);
    expect(s.theirSide).toBe('Two of the shops were closed for the holiday week.');
    /* Never the last thing Tobi typed passed off as his answer. */
    expect(s.theirOwnAnswer).toBeNull();
    const all = served(s);
    expect(all).not.toMatch(THE_PERSONS_OWN_COUNT);
    expect(all).not.toMatch(A_RATING);
    expect(all).not.toMatch(A_LABEL);
    /* After three days without a word from Tobi, she reads it anyway. */
    const w2 = await acrossTheLine();
    jest.setSystemTime(new Date(at('2026-09-21').getTime() + 3 * DAY + 1));
    expect((await w2.service.forGround(G, w2.as('wairimu'))).suggestions).toHaveLength(1);
  });

  it('Miriam, a colleague giving a view, reads nothing about Tobi; nor does the ending page give her any', async () => {
    const w = await acrossTheLine();
    await w.service.addSide(w.suggestions[0].id, w.as('tobi'), { side: 'Two of the shops were closed.' });
    expect((await w.service.forGround(G, w.as('miriam'))).suggestions).toEqual([]);
    expect(await w.service.aboutYou(w.as('miriam'))).toEqual([]);
    const page = await theEndingPageFor({ prisma: w.prisma, suggestions: w.service }, G, 'u-miriam');
    expect(served(page)).not.toMatch(/Tobi|Groundwork suggests|commitments/);
  });

  it.each(['grace', 'omar'] as const)('%s, an admin, reads nothing before an appeal', async (who) => {
    const w = await acrossTheLine();
    await w.service.addSide(w.suggestions[0].id, w.as('tobi'), { side: 'Two of the shops were closed.' });
    await w.service.decide(w.suggestions[0].id, w.as('wairimu'), { decision: 'Extra support for Tobi over the next four weeks.', reasons: 'The holiday week closed two shops, and the rest still slipped.' });
    expect((await w.service.forGround(G, w.as(who))).suggestions).toEqual([]);
    expect((await w.service.appealsToDecide(w.as(who))).appeals).toEqual([]);
    const page = await theEndingPageFor({ prisma: w.prisma, suggestions: w.service }, G, people[who].userId);
    expect(page.appealed).toEqual([]);
  });
});

describe('the decision and the appeal (decision 6)', () => {
  async function decidedAndAppealed() {
    const w = await acrossTheLine();
    const id = w.suggestions[0].id;
    await w.service.addSide(id, w.as('tobi'), { side: 'Two of the shops were closed for the holiday week.' });
    await w.service.decide(id, w.as('wairimu'), {
      decision: 'Extra support for Tobi over the next four weeks, with a call every Monday.',
      reasons: 'The holiday week closed two shops, but the price list and the freezer booking still slipped.',
    });
    return { w, id };
  }

  it('Tobi reads Wairimu\'s decision and her reasons, and may appeal', async () => {
    const { w } = await decidedAndAppealed();
    const [s]: any[] = (await w.service.forGround(G, w.as('tobi'))).suggestions;
    expect(s.decision).toMatchObject({
      says: 'Extra support for Tobi over the next four weeks, with a call every Monday.',
      reasons: 'The holiday week closed two shops, but the price list and the freezer booking still slipped.',
    });
    expect(s.mayAppeal).toBe(true);
  });

  it('only Tobi appeals, once, saying why', async () => {
    const { w, id } = await decidedAndAppealed();
    await expect(w.service.appeal(id, w.as('wairimu'), { why: 'x' })).rejects.toThrow(REFUSED.onlyThePerson);
    await expect(w.service.appeal(id, w.as('tobi'), { why: ' ' })).rejects.toThrow(REFUSED.sayWhyYouDisagree);
    await w.service.appeal(id, w.as('tobi'), { why: 'The freezer booking was Operations\' to make, not mine.' });
    await expect(w.service.appeal(id, w.as('tobi'), { why: 'Again.' })).rejects.toThrow(REFUSED.alreadyAppealed);
    /* Wairimu can no longer change her decision once it is appealed. */
    await expect(w.service.decide(id, w.as('wairimu'), { decision: 'x', reasons: 'y' })).rejects.toThrow(REFUSED.appealed);
  });

  it('an admin decides the appeal; not Wairimu, not Tobi, not Miriam', async () => {
    const { w, id } = await decidedAndAppealed();
    await w.service.appeal(id, w.as('tobi'), { why: 'The freezer booking was Operations\' to make, not mine.' });
    for (const who of ['wairimu', 'tobi', 'miriam'] as const) {
      await expect(w.service.decideAppeal(id, w.as(who), { outcome: 'stands', reasons: 'x' })).rejects.toThrow(REFUSED.onlyAnAdmin);
    }
    await expect(w.service.decideAppeal(id, w.as('grace'), { outcome: 'stands', reasons: ' ' })).rejects.toThrow(REFUSED.sayWhyToBoth);
  });

  it('each reader, while the appeal waits and after Grace decides it', async () => {
    const { w, id } = await decidedAndAppealed();
    await w.service.appeal(id, w.as('tobi'), { why: 'The freezer booking was Operations\' to make, not mine.' });

    /* Both admins read the appeal, with what they need to decide it, the count behind it (decision 86), and no rating. */
    for (const who of ['grace', 'omar'] as const) {
      const [a]: any[] = (await w.service.appealsToDecide(w.as(who))).appeals;
      expect(a).toMatchObject({
        aboutName: 'Tobi', leadName: 'Wairimu',
        headline: 'Groundwork suggests extra support for Tobi Okafor',
        why: 'In the last four weeks, Tobi Okafor kept two of the six commitments made in this check-in. That is 33%. When fewer than half are kept, Groundwork suggests extra support.',
        theirSide: 'Two of the shops were closed for the holiday week.',
        appeal: { says: 'The freezer booking was Operations\' to make, not mine.' },
        mayDecide: true,
      });
      expect(served(a)).not.toMatch(THE_PERSONS_OWN_COUNT);
      expect(served(a)).not.toMatch(A_RATING);
    }

    await w.service.decideAppeal(id, w.as('grace'), { outcome: 'stands', reasons: 'The freezer booking was Operations\' job, so it is taken out, and the price list and the Naivas call still slipped.' });
    await expect(w.service.decideAppeal(id, w.as('omar'), { outcome: 'changed', reasons: 'x' })).rejects.toThrow(REFUSED.alreadyDecided);

    const [tobi]: any[] = (await w.service.forGround(G, w.as('tobi'))).suggestions;
    expect(tobi.yourAppeal).toMatchObject({ says: 'The freezer booking was Operations\' to make, not mine.' });
    expect(tobi.appealDecision).toMatchObject({ says: 'The decision stays.', by: 'Grace', reasons: 'The freezer booking was Operations\' job, so it is taken out, and the price list and the Naivas call still slipped.' });
    expect(tobi.mayAppeal).toBe(false);

    const [wairimu]: any[] = (await w.service.forGround(G, w.as('wairimu'))).suggestions;
    expect(wairimu.appeal).toMatchObject({ says: 'The freezer booking was Operations\' to make, not mine.' });
    expect(wairimu.appealDecision).toMatchObject({ says: 'The decision stays.', by: 'Grace' });
    expect(wairimu.mayChangeTheDecision).toBe(false);

    expect((await w.service.appealsToDecide(w.as('omar'))).appeals).toEqual([]);
    expect((await w.service.forGround(G, w.as('miriam'))).suggestions).toEqual([]);

    for (const who of ['tobi', 'wairimu', 'grace', 'omar', 'miriam'] as const) {
      const all = served([await w.service.forGround(G, w.as(who)), await theEndingPageFor({ prisma: w.prisma, suggestions: w.service }, G, people[who].userId)]);
      expect(all).not.toMatch(A_LABEL);
      expect(all).not.toMatch(A_RATING);
      if (who !== 'tobi') expect(all).not.toMatch(THE_PERSONS_OWN_COUNT);
    }
  });
});

describe('the edges', () => {
  it('exactly at the line is not below it: three kept of six reaches nothing', async () => {
    const w = aWorld();
    w.promises(1, '2026-09-07', ['Call the Freshland owner', 'Visit Green Mart', 'Send the price list to Mama Fresh']);
    await w.aSession(2, '2026-09-14', ['DONE', 'DONE', 'NOT_DONE']);
    w.promises(2, '2026-09-14', ['Call the Naivas buyer', 'Book the freezer delivery', 'Visit the Kilimani shop']);
    await w.aSession(3, '2026-09-21', ['DONE', 'NOT_DONE', 'NOT_DONE']);
    expect(w.commitments.filter((c) => c.status !== 'UNKNOWN')).toHaveLength(6);
    expect(w.suggestions).toHaveLength(0);
  });

  it('settled by hand counts too, the moment it is settled', async () => {
    const w = aWorld();
    w.promises(1, '2026-09-07', ['Call the Freshland owner', 'Visit Green Mart', 'Send the price list to Mama Fresh']);
    await w.aSession(2, '2026-09-14', ['NOT_DONE', 'NOT_DONE', 'NOT_DONE']);
    w.promises(2, '2026-09-14', ['Call the Naivas buyer', 'Book the freezer delivery', 'Visit the Kilimani shop']);
    jest.setSystemTime(at('2026-09-18'));
    for (const c of w.commitments.filter((x) => x.status === 'UNKNOWN')) await w.grounds.setMyCommitment(G, 'u-tobi', c.id, 'NOT_DONE');
    await w.settled();
    expect(w.suggestions).toHaveLength(1);
  });

  it('a new suggestion never replaces one nobody has decided (confirmed item 17), and its facts stay as Tobi first read them', async () => {
    const w = await acrossTheLine();
    w.promises(3, '2026-09-21', ['Ring the Carrefour buyer', 'Visit the Westlands shop', 'Send the order form to Quickmart']);
    await w.aSession(4, '2026-09-28', ['NOT_DONE', 'NOT_DONE', 'NOT_DONE']);
    expect(w.suggestions).toHaveLength(1);
    expect(w.suggestions[0].factsForThem).toMatch(/^In the last four weeks, you kept two of your six commitments/);
  });

  it('after Wairimu decides, the next suggestion counts only what was settled after her decision', async () => {
    const w = await acrossTheLine();
    await w.service.decide(w.suggestions[0].id, w.as('wairimu'), { decision: 'Extra support for four weeks.', reasons: 'The price list slipped twice.' });
    /* The very next session, with the same misses still in the last four weeks: nothing new. */
    w.promises(3, '2026-09-21', ['Ring the Carrefour buyer', 'Visit the Westlands shop', 'Send the order form to Quickmart']);
    await w.aSession(4, '2026-09-28', ['DONE', 'NOT_DONE', 'NOT_DONE']);
    expect(w.suggestions).toHaveLength(1);
    /* Six settled after the decision, two kept: a new one, from those six alone. */
    w.promises(4, '2026-09-28', ['Ring the Chandarana buyer', 'Visit the Karen shop', 'Send the invoice to Tuskys']);
    await w.aSession(5, '2026-10-05', ['DONE', 'NOT_DONE', 'NOT_DONE']);
    expect(w.suggestions).toHaveLength(2);
    expect(w.suggestions[1].factsForThem).toMatch(/^In the last four weeks, you kept two of your six commitments/);
  });

  it('on leave: a promise made before the leave, missed while away and settled on return, is not counted against Tobi (week 23)', async () => {
    /* Tobi is away the whole week of 14 September. The second week's misses fall in it. */
    const w = aWorld({ leave: [{ startsOn: new Date('2026-09-14T00:00:00Z'), endsOn: new Date('2026-09-18T00:00:00Z') }] });
    w.promises(1, '2026-09-04', ['Call the Freshland owner', 'Visit Green Mart', 'Send the price list to Mama Fresh']);
    await w.aSession(2, '2026-09-11', ['DONE', 'NOT_DONE', 'NOT_DONE']);
    w.promises(2, '2026-09-11', ['Call the Naivas buyer', 'Book the freezer delivery', 'Visit the Kilimani shop']);
    await w.aSession(3, '2026-09-21', ['DONE', 'NOT_DONE', 'NOT_DONE']);
    /* Without the leave this is two of six; with it, the two misses from the week away are not counted. */
    expect(w.suggestions).toHaveLength(0);
    const same = await acrossTheLine();
    expect(same.suggestions).toHaveLength(1);
  });

  it('an admin who empties the threshold stops every suggestion (decision 33)', async () => {
    const w = await acrossTheLine(aWorld({ thresholdRow: { value: {} } }));
    expect(w.suggestions).toHaveLength(0);
  });
});

/**
 * THE SAME RECORD ON AN ORDINARY TEAM CHECK-IN (decision 6, clarified 29 September: a verdict is
 * reached only on the evaluation check-ins of decision 17). "Sales team, Q3" is a REALIGN_TEAM check-in
 * with the same three people. Tobi keeps the same 2 of 6, through the same services, and nothing is
 * reached; no reader is served a suggestion, a count or "what would change this".
 */
describe('the same record on an ordinary team check-in', () => {
  it('reaches nothing', async () => {
    const w = await acrossTheLine(aWorld({ scenario: 'REALIGN_TEAM', label: 'Sales team, Q3' }));
    expect(w.commitments.filter((c) => c.status !== 'UNKNOWN')).toHaveLength(6);
    expect(w.fired.filter((e) => e === GroundworkEvents.COMMITMENTS_SETTLED)).toHaveLength(2);
    expect(w.suggestions).toHaveLength(0);
  });

  it.each(['tobi', 'wairimu', 'miriam', 'grace', 'omar'] as const)('%s is served nothing about it, anywhere', async (who) => {
    const w = await acrossTheLine(aWorld({ scenario: 'REALIGN_TEAM', label: 'Sales team, Q3' }));
    jest.setSystemTime(new Date(at('2026-09-21').getTime() + 4 * DAY));
    const all = served([
      await w.service.forGround(G, w.as(who)),
      await w.service.aboutYou(w.as(who)),
      await w.service.latestForTheLeadAbout('u-tobi', w.as(who)),
      await theEndingPageFor({ prisma: w.prisma, suggestions: w.service }, G, people[who].userId),
      people[who].role === 'ADMIN' ? await w.service.appealsToDecide(w.as(who)) : null,
    ]);
    expect(all).not.toMatch(/Groundwork suggests|commitments|What would change|kept|extra help/i);
  });
});

/**
 * DECISION 93, ROW 17 (5 October 2026): GROUNDWORK'S SUGGESTION ABOUT THE PERSON, ON THEIR REVIEW (what `ReviewsService.one`
 * serves as `suggestion`, read through `latestForTheLeadAbout`). It was read only by whoever runs the check-in. Hafsah
 * removed that for admins: Grace, an admin who set it up and so has access, reads it. Omar, an admin given no access to a
 * performance plan (decision 5), and Leila, a lead who runs nothing here, still read nothing; nor do Tobi or Miriam.
 */
describe('decision 93, row 17: who reads the suggestion about Tobi on his review', () => {
  it('Wairimu, who runs it, reads it with her choices; Grace, an admin with access, reads what Groundwork suggests without the choices', async () => {
    const w = await acrossTheLine();
    await w.service.addSide(w.suggestions[0].id, w.as('tobi'), { side: 'Two of the shops were closed for the holiday week.' });
    const lead: any = await w.service.latestForTheLeadAbout('u-tobi', w.as('wairimu'));
    const admin: any = await w.service.latestForTheLeadAbout('u-tobi', w.as('grace'));
    expect(lead.ifYouAgree).toBe('Extra support for Tobi Okafor over the next four weeks, agreed with Tobi.');
    expect(admin.headline).toBe('Groundwork suggests extra support for Tobi Okafor');
    expect(admin.why).toBe('In the last four weeks, Tobi Okafor kept two of the six commitments made in this check-in. That is 33%. When fewer than half are kept, Groundwork suggests extra support.');
    expect(admin.whatWouldChangeIt).toBe('If Tobi Okafor keeps at least half of the commitments made in this check-in over the next four weeks.');
    expect(admin.theirSide).toBe('Two of the shops were closed for the holiday week.');
    expect(admin.ifYouAgree).toBeNull();
    expect(admin.otherChoices).toEqual([]);
    expect(admin.mayChangeTheDecision).toBe(false);
    expect(served(admin)).not.toMatch(A_RATING);
    expect(served(admin)).not.toMatch(THE_PERSONS_OWN_COUNT);
  });

  it('she reads it only once Tobi has had his turn, as Wairimu does (decision 53)', async () => {
    const w = await acrossTheLine();
    expect(await w.service.latestForTheLeadAbout('u-tobi', w.as('grace'))).toBeNull();
    jest.setSystemTime(new Date(at('2026-09-21').getTime() + 3 * DAY + 1));
    expect(await w.service.latestForTheLeadAbout('u-tobi', w.as('grace'))).not.toBeNull();
  });

  it.each(['omar', 'leila', 'miriam', 'tobi'] as const)('%s reads nothing of it', async (who) => {
    const w = await acrossTheLine();
    await w.service.addSide(w.suggestions[0].id, w.as('tobi'), { side: 'Two of the shops were closed for the holiday week.' });
    expect(await w.service.latestForTheLeadAbout('u-tobi', w.as(who))).toBeNull();
  });
});

