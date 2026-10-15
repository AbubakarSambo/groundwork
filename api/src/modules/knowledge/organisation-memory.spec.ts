import { keepable, shallIKeep, iHaveKept, NOT_KEPT, sourceLineOn, soundsCompanyWide, whatTheOrganisationKeepsBlock } from './what-the-organisation-keeps';
import { offerToKeep, keepWhatWasOffered, dropWhatWasOffered, keptForTheOrganisation, mayReadWhatIsKept, keptThatTouches } from './organisation-memory';

/**
 * WEEK 20. WHAT A LEAD SAYS IS TRUE OF THE WHOLE COMPANY IS KEPT ONLY ON THEIR YES.
 *
 * These read the words a lead is asked, and the words they are told after, and they check the rows:
 * an offer is not memory, a no leaves nothing, and only the person asked can answer.
 */

const RULE = "Every quote over 1 million needs Amina's sign-off";
const said = `We have a rule here. ${RULE}. Also Kwame starts Monday.`;

/** A table that behaves like the one in the database, for the few calls these functions make. */
function fakePrisma(groundsRunBy: Record<string, string> = {}) {
  const rows: any[] = [];
  let n = 0;
  const match = (r: any, where: any) => Object.entries(where ?? {}).every(([k, v]) => r[k] === v);
  const prisma: any = {
    organizationMemory: {
      rows,
      deleteMany: async ({ where }: any) => { const keep = rows.filter((r) => !match(r, where)); const count = rows.length - keep.length; rows.splice(0, rows.length, ...keep); return { count }; },
      create: async ({ data }: any) => { const r = { id: `m${++n}`, keptAt: null, keptById: null, ...data, status: data.status ?? 'OFFERED' }; rows.push(r); return r; },
      findFirst: async ({ where }: any) => rows.find((r) => match(r, where)) ?? null,
      findMany: async ({ where }: any) => rows.filter((r) => match(r, where)),
      update: async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id); Object.assign(r, data); return r; },
      delete: async ({ where }: any) => { rows.splice(rows.findIndex((x) => x.id === where.id), 1); },
    },
    ground: { findFirst: async ({ where }: any) => (groundsRunBy[where.initiatorId] ? { id: 'g' } : null) },
  };
  return prisma;
}

describe('what the lead is asked', () => {
  it('reads their own sentence back between quotation marks, as a question', () => {
    expect(shallIKeep({ kind: 'rule', text: RULE })).toBe(
      'Shall I keep "Every quote over 1 million needs Amina\'s sign-off" as a rule for the whole organisation, so later check-ins and Ask Groundwork can use it?',
    );
  });

  it('says what kind of thing it is in plain words, for each kind', () => {
    expect(shallIKeep({ kind: 'definition', text: 'An enterprise customer has 200 staff or more' })).toContain('as a definition for the whole organisation');
    expect(shallIKeep({ kind: 'principle', text: 'Decisions are made at the lowest level that can make them' })).toContain('as a principle for the whole organisation');
    expect(shallIKeep({ kind: 'owner', text: 'Organisation stuff sits with me until we hire a head of people' })).toContain('as who owns something for the whole organisation');
    expect(shallIKeep({ kind: 'client', text: 'Harbor Foods wants its market reports as a one page summary' })).toContain('as something about a client for the whole organisation');
  });

  it('tells them what was kept after the yes, and what was not after the no', () => {
    expect(iHaveKept({ kind: 'rule', text: RULE })).toBe(
      'I have kept "Every quote over 1 million needs Amina\'s sign-off" as a rule for the whole organisation. Later check-ins and Ask Groundwork can now use it. You can see it on the Company page.',
    );
    expect(NOT_KEPT).toBe('I have not kept that for the organisation. It stays only on this check-in.');
  });

  it('marks where it came from, the way the Company page reads it', () => {
    expect(sourceLineOn('22 September')).toBe('Picked up from your check-in on 22 September');
  });
});

describe('what may be offered at all', () => {
  it('offers the lead\'s own sentence, exactly as typed', () => {
    expect(keepable([{ kind: 'rule', text: RULE }], said)).toEqual([{ kind: 'rule', text: RULE }]);
  });

  it('refuses a sentence the lead did not type, however sensible (a tidier version made by the model)', () => {
    expect(keepable([{ kind: 'rule', text: 'Quotes above one million shillings must be approved by Amina' }], said)).toEqual([]);
  });

  it('offers nothing from a message the lead asked to keep private', () => {
    expect(keepable([{ kind: 'rule', text: RULE }], `Keep this between us. ${RULE}.`)).toEqual([]);
    expect(keepable([{ kind: 'rule', text: RULE }], `This is private, ${RULE}.`)).toEqual([]);
  });

  it('offers nothing that names a person on the check-in and judges them', () => {
    const note = 'Ben is always late with every quote he sends';
    expect(keepable([{ kind: 'rule', text: note }], `${note}.`, ['Ben Otieno', 'Ben'])).toEqual([]);
  });

  it('but a rule that names a person as the approver is still a rule', () => {
    expect(keepable([{ kind: 'rule', text: RULE }], `${RULE}.`, ['Amina Yusuf', 'Amina'])).toEqual([{ kind: 'rule', text: RULE }]);
  });

  it('refuses a kind that is not one of the five, and a fragment', () => {
    expect(keepable([{ kind: 'gossip', text: RULE }], said)).toEqual([]);
    expect(keepable([{ kind: 'rule', text: 'Always late' }], 'Always late, every time.')).toEqual([]);
  });

  it('only asks the model when the sentence could be company-wide', () => {
    expect(soundsCompanyWide("Every quote over 1 million needs Amina's sign-off.")).toBe(true);
    expect(soundsCompanyWide('About three months, checking in once a week.')).toBe(false);
  });
});

describe('an offer is not memory until the lead says yes', () => {
  it('a question waiting is kept nowhere that anything reads', async () => {
    const prisma = fakePrisma();
    await offerToKeep(prisma, { organizationId: 'o1', groundId: 'g1', userId: 'lead', item: { kind: 'rule', text: RULE }, now: new Date('2026-09-22T10:00:00Z') });
    expect(await keptForTheOrganisation(prisma, 'o1')).toEqual([]);
    expect(prisma.organizationMemory.rows[0]).toMatchObject({ status: 'OFFERED', sourceLine: 'Picked up from your check-in on 22 September' });
  });

  it('the yes keeps it, in the lead\'s words, with where it came from', async () => {
    const prisma = fakePrisma();
    const { offerId } = await offerToKeep(prisma, { organizationId: 'o1', groundId: 'g1', userId: 'lead', item: { kind: 'rule', text: RULE }, now: new Date('2026-09-22T10:00:00Z') });
    const out = await keepWhatWasOffered(prisma, { organizationId: 'o1', groundId: 'g1', offerId, userId: 'lead' });
    expect(out.say).toContain('I have kept "Every quote over 1 million needs Amina\'s sign-off" as a rule');
    expect(await keptForTheOrganisation(prisma, 'o1')).toMatchObject([{ kind: 'rule', text: RULE, sourceLine: 'Picked up from your check-in on 22 September' }]);
  });

  it('the no deletes the offer, so nothing of it is kept anywhere', async () => {
    const prisma = fakePrisma();
    const { offerId } = await offerToKeep(prisma, { organizationId: 'o1', groundId: 'g1', userId: 'lead', item: { kind: 'rule', text: RULE } });
    await dropWhatWasOffered(prisma, { organizationId: 'o1', offerId, userId: 'lead' });
    expect(prisma.organizationMemory.rows).toEqual([]);
  });

  it('only the person who was asked can answer, and never across organisations', async () => {
    const prisma = fakePrisma();
    const { offerId } = await offerToKeep(prisma, { organizationId: 'o1', groundId: 'g1', userId: 'lead', item: { kind: 'rule', text: RULE } });
    const stranger = await keepWhatWasOffered(prisma, { organizationId: 'o1', groundId: 'g1', offerId, userId: 'somebody-else' });
    expect(stranger.kept).toBe(false);
    const otherCompany = await keepWhatWasOffered(prisma, { organizationId: 'o2', groundId: 'g1', offerId, userId: 'lead' });
    expect(otherCompany.kept).toBe(false);
    await dropWhatWasOffered(prisma, { organizationId: 'o1', offerId, userId: 'somebody-else' });
    expect(prisma.organizationMemory.rows).toHaveLength(1);
    expect(await keptForTheOrganisation(prisma, 'o1')).toEqual([]);
  });

  it('the same words kept twice are one memory', async () => {
    const prisma = fakePrisma();
    for (let i = 0; i < 2; i++) {
      const { offerId } = await offerToKeep(prisma, { organizationId: 'o1', groundId: `g${i}`, userId: 'lead', item: { kind: 'rule', text: RULE } });
      await keepWhatWasOffered(prisma, { organizationId: 'o1', groundId: `g${i}`, offerId, userId: 'lead' });
    }
    expect(await keptForTheOrganisation(prisma, 'o1')).toHaveLength(1);
  });
});

describe('who may read what was kept', () => {
  it('an admin, a lead and somebody who runs a check-in may; a member who only takes part, and a guest, may not', async () => {
    const prisma = fakePrisma({ runner: 'yes' });
    const may = (userId: string, role: string) => mayReadWhatIsKept(prisma, { userId, organizationId: 'o1', role });
    expect(await may('a', 'ADMIN')).toBe(true);
    expect(await may('b', 'LEAD')).toBe(true);
    expect(await may('runner', 'MEMBER')).toBe(true);
    expect(await may('taker', 'MEMBER')).toBe(false);
    expect(await may('g', 'GUEST')).toBe(false);
  });
});

describe('what a session and Ask Groundwork are given', () => {
  it('a block that says it is context, never to be quoted, and never somebody\'s account', () => {
    const block = whatTheOrganisationKeepsBlock([{ kind: 'rule', text: RULE }]);
    expect(block).toContain(`- (rule) ${RULE}`);
    expect(block).toContain('Do not quote them to anybody');
    expect(block).toContain('never treat one as something this person said');
    expect(whatTheOrganisationKeepsBlock([])).toBe('');
  });

  it('finds what touches a question, and nothing for one it does not touch', () => {
    const kept = [{ id: '1', kind: 'rule', text: RULE, sourceLine: 'x', keptAt: null }];
    expect(keptThatTouches(kept, 'who signs off a quote')).toHaveLength(1);
    expect(keptThatTouches(kept, 'how do I claim expenses')).toHaveLength(0);
  });
});
