import { readFileSync } from 'fs';
import { join } from 'path';
import { PartyType } from '@prisma/client';
import { afterTheirTurn, theirOwnIdea, THE_IDEA_QUESTION, IT_IS_CAPTURED, IDEA_SPOTTING_KEY, THE_IDEA_SPOTTING_PROMPT } from './ideas-from-the-team';
import { person, answered, boardAs, AMINA, RUKIA, BARAKA, JUMA, type Setup } from '../board/the-switchboards-sections-harness';
import { whatIsWrongForThisReader } from '../board/the-anchor-readers';

/**
 * ANCHOR PIECE 19: AN IDEA IS SAID BACK IN THE SPEC'S WORDS, AND ONLY THE PERSON'S YES CAPTURES IT
 * (section 18; decisions 96 item 10 and 105 item 5).
 */
const MESSAGE = 'Honestly we could send the price list to every shop on Monday so they can reorder without calling me.';
function world(opts: { on?: boolean; startedFrom?: string | null; model?: any; items?: any[] } = {}) {
  const items: any[] = opts.items ?? [];
  const prisma: any = {
    platformSetting: { findUnique: jest.fn(async () => (opts.on === false ? null : { value: { on: true } })) },
    workItem: {
      findMany: jest.fn(async (a: any) => items.filter((i) => i.kind === a.where.kind && i.ownerParticipantId === a.where.ownerParticipantId)),
      create: jest.fn(async ({ data }: any) => { const row = { id: `w${items.length + 1}`, ...data }; items.push(row); return row; }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(items.find((i) => i.id === where.id), data)),
      delete: jest.fn(async ({ where }: any) => { items.splice(items.findIndex((i) => i.id === where.id), 1); }),
    },
  };
  const anthropic: any = { extract: jest.fn(async () => opts.model ?? { isAConcreteIdea: true, idea: 'send the price list to every shop on Monday so they can reorder without calling me' }) };
  const prompts: any = { getActive: jest.fn(async () => ({ id: 'pv-idea-1', content: THE_IDEA_SPOTTING_PROMPT })) };
  const turn = (message: string) => afterTheirTurn({ prisma, anthropic, prompts }, { groundId: 'g-1', startedFrom: opts.startedFrom === undefined ? 'anchor' : opts.startedFrom, participantId: 'p-rukia', message });
  return { turn, items, anthropic, prompts };
}

describe('the offer, in the person\'s own check-in', () => {
  it('says the idea back in their own words, with the spec\'s question, and keeps nothing yet', async () => {
    const { turn, items, prompts } = world();
    const got = await turn(MESSAGE);
    expect(got.ideaOffer).toEqual({
      idea: 'send the price list to every shop on Monday so they can reorder without calling me',
      question: THE_IDEA_QUESTION,
      whoWillSeeIt: 'If you say yes, everyone in this check-in will see it, with your name.',
      yes: 'Yes, capture it', no: 'Not now',
    });
    expect(THE_IDEA_QUESTION).toBe('That sounds like a concrete idea. Want me to capture it for the team?');
    expect(items.map((i) => i.kind)).toEqual(['idea-offered']);
    expect(prompts.getActive).toHaveBeenCalledWith(IDEA_SPOTTING_KEY);
    expect(got.promptVersionId).toBe('pv-idea-1');
  });
  it('the yes captures it, and the reply says so first', async () => {
    const { turn, items } = world();
    await turn(MESSAGE);
    const got = await turn('Yes, capture it');
    expect(got.sayFirst).toBe(IT_IS_CAPTURED);
    expect(items.map((i) => i.kind)).toEqual(['idea']);
  });
  it('a free-text yes about something else keeps nothing: only the button\'s own answer captures', async () => {
    const { turn: t3, items: i3, anthropic } = world();
    await t3(MESSAGE);
    anthropic.extract.mockResolvedValueOnce({ isAConcreteIdea: false });
    expect((await t3('Yes, I sent the deck to Naivas')).sayFirst).toBeUndefined();
    expect(i3).toEqual([]);
  });
  it('"Not now", or carrying on, leaves nothing behind', async () => {
    const a = world(); await a.turn(MESSAGE); await a.turn('Not now');
    expect(a.items).toEqual([]);
    const b = world({ model: { isAConcreteIdea: false } }); await b.turn(MESSAGE.replace('Honestly', 'Also')); 
    const c = world(); await c.turn(MESSAGE);
    c.anthropic.extract.mockResolvedValueOnce({ isAConcreteIdea: false });
    await c.turn('The van broke down again on Tuesday.');
    expect(c.items).toEqual([]);
  });
  it('an idea the model rewrote is not offered: only the person\'s own words', async () => {
    const { turn, items } = world({ model: { isAConcreteIdea: true, idea: 'Distribute pricing documentation weekly to retail partners' } });
    expect((await turn(MESSAGE)).ideaOffer).toBeUndefined();
    expect(items).toEqual([]);
    expect(theirOwnIdea(MESSAGE, 'the price list')).toBeNull();
    expect(theirOwnIdea(MESSAGE, 'send the price list to the shops')).toBeNull();
  });
  it('nothing, and no model call, with the switch off or on any other check-in', async () => {
    for (const w of [world({ on: false }), world({ startedFrom: null })]) {
      expect(await w.turn(MESSAGE)).toEqual({});
      expect(w.anthropic.extract).not.toHaveBeenCalled();
    }
  });
  it('the check-in\'s reply carries the offer and says the capture first', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).toContain('...(idea.ideaOffer ? { ideaOffer: idea.ideaOffer } : {}),');
    expect(src).toContain('if (idea.sayFirst) answer.reply = [idea.sayFirst, answer.reply]');
  });
});

describe('"Ideas from your team" on the board, as each reader reads it', () => {
  const lead = { ...person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR), managingOnly: false };
  const PEOPLE = [lead, person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'), person('p-baraka', 'u-baraka', 'Baraka', 'Otieno')];
  const anchor = (on = true, startedFrom: string | null = 'anchor'): Setup => ({
    people: PEOPLE, checkIns: [answered('p-amina', 1), answered('p-rukia', 1), answered('p-baraka', 1)], commitments: [], dependencies: [],
    groundRow: { startedFrom, startsAt: new Date('2026-09-08') },
    prismaExtras: {
      platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : null)) },
      recommendation: { findMany: jest.fn(async () => []) },
      groundParticipant: {
        findMany: jest.fn(async (a: any) => (a?.where?.id?.in ? PEOPLE.filter((p) => a.where.id.in.includes(p.id)).map((p) => ({ id: p.id, lastNudgedAt: null })) : PEOPLE.map((p) => ({ ...p, checkIns: [{ status: 'COMPLETED' }] })))),
        findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({})),
      },
      workItem: { findMany: jest.fn(async (a: any) => [
        { id: 'i1', kind: 'idea', name: 'send the price list to every shop on Monday', ownerParticipantId: 'p-rukia' },
        { id: 'i2', kind: 'idea-offered', name: 'a thing not yet said yes to', ownerParticipantId: 'p-baraka' },
      ].filter((r) => !a?.where?.kind || r.kind === a.where.kind)) },
    },
  });
  it('the lead reads it with who raised it, and the month board counts it', async () => {
    const b = await boardAs(anchor(), ...AMINA);
    expect(b.ideasFromYourTeam.ideas).toEqual([{ id: 'i1', title: 'send the price list to every shop on Monday', raisedBy: 'Raised by Rukia.', similarNeedsSentence: null }]);
    expect(b.theMonthBoard.whatTheTeamIsContributing).toEqual(['One idea from your team has been captured.']);
  });
  it('Rukia reads her own as "Raised by you.", and Baraka reads it with her name', async () => {
    expect((await boardAs(anchor(), ...RUKIA)).ideasFromYourTeam.ideas[0].raisedBy).toBe('Raised by you.');
    const asBaraka = await boardAs(anchor(), ...BARAKA);
    expect(asBaraka.ideasFromYourTeam.ideas[0].raisedBy).toBe('Raised by Rukia.');
    expect(JSON.stringify(asBaraka)).not.toContain('a thing not yet said yes to');
  });
  it('an admin who only reads is served no ideas', async () => {
    const b = await boardAs(anchor(), ...JUMA);
    expect('ideasFromYourTeam' in b).toBe(false);
    expect(whatIsWrongForThisReader('an admin who only reads', b)).toEqual([]);
  });
  it('with the switch off, nobody is served them', async () => {
    expect('ideasFromYourTeam' in (await boardAs(anchor(false), ...RUKIA))).toBe(false);
  });
});
