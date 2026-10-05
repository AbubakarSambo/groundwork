import { aTitle, theIdeasFromYourTeam, afterTheirTurn, IDEA_SPOTTING_KEY, THE_IDEA_SPOTTING_PROMPT, YES_CAPTURE_IT } from './ideas-from-the-team';
import { SEED_PROMPTS } from './prompt-library';
import { ANCHOR_BASELINE_PROMPT, ANCHOR_BASELINE_PROMPT_KEY } from './the-anchor-baseline';

/**
 * IDEAS, AS A READER SEES THEM (anchor piece 19, 6 October). The words the person said are kept as they said them, and the
 * title on the board starts with a capital letter. The row records which stored version spotted it, and a clean install stores one.
 */
describe('"Ideas from your team", as the lead and a colleague read it', () => {
  const ideas = [{ id: 'i1', name: 'if the warehouse got a copy of the price list on Monday, shops could reorder without calling', ownerParticipantId: 'p-lucy' }];
  const nameOf = (p: string) => (p === 'p-lucy' ? 'Lucy' : null);

  it('starts the title with a capital letter and says who raised it', () => {
    const read = theIdeasFromYourTeam(ideas, 'p-rukia', nameOf);
    expect(read.heading).toBe('Ideas from your team');
    expect(read.ideas[0].title).toBe('If the warehouse got a copy of the price list on Monday, shops could reorder without calling');
    expect(read.ideas[0].raisedBy).toBe('Raised by Lucy.');
  });

  it('says "Raised by you." to the person who raised it, and keeps the same title', () => {
    const read = theIdeasFromYourTeam(ideas, 'p-lucy', nameOf);
    expect(read.ideas[0].raisedBy).toBe('Raised by you.');
    expect(read.ideas[0].title.startsWith('If ')).toBe(true);
  });

  it('never changes the words kept, only how the title is shown', () => {
    expect(ideas[0].name.startsWith('if ')).toBe(true);
    expect(aTitle('  send it on Monday')).toBe('Send it on Monday');
    expect(aTitle('')).toBe('');
  });
});

describe('which version of the idea reading ran', () => {
  const run = async (stored: { id: string; content: string } | null) => {
    const items: any[] = [];
    const prisma: any = {
      platformSetting: { findUnique: jest.fn(async () => ({ value: { on: true } })) },
      workItem: { findMany: jest.fn(async () => []), create: jest.fn(async ({ data }: any) => { items.push(data); return data; }) },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ isAConcreteIdea: true, idea: 'review every client one month before the project ends' })) };
    const prompts: any = { getActive: jest.fn(async () => { if (!stored) throw new Error('none'); return stored; }) };
    const got = await afterTheirTurn({ prisma, anthropic, prompts }, { groundId: 'g1', startedFrom: 'anchor', participantId: 'p1', message: 'Maybe we should review every client one month before the project ends.' });
    return { items, got };
  };

  it('is written on the idea row when a stored version ran', async () => {
    const { items, got } = await run({ id: 'pv-idea-9', content: THE_IDEA_SPOTTING_PROMPT });
    expect(items[0].fields.promptVersionId).toBe('pv-idea-9');
    expect(got.promptVersionId).toBe('pv-idea-9');
    expect(YES_CAPTURE_IT).toBe('Yes, capture it');
  });

  it('is stored on a clean install, so the row carries one there too', () => {
    const keys = SEED_PROMPTS.map((p) => p.key);
    expect(keys).toContain(IDEA_SPOTTING_KEY);
    expect(SEED_PROMPTS.find((p) => p.key === IDEA_SPOTTING_KEY)?.content).toBe(THE_IDEA_SPOTTING_PROMPT);
    expect(keys).toContain(ANCHOR_BASELINE_PROMPT_KEY);
    expect(SEED_PROMPTS.find((p) => p.key === ANCHOR_BASELINE_PROMPT_KEY)?.content).toBe(ANCHOR_BASELINE_PROMPT);
  });
});
