import { TheAnchorDoor } from './the-anchor-door';
import { THE_PEOPLE_STEP_RULES } from './the-anchor-people-step';
import { THE_SHAPES_KEYS } from './the-anchor-served-shapes';

/** Request 149: the people step's rules are served where the draft is started, and only with the switch on. */
const prismaWith = (on: boolean): any => ({ platformSetting: { findUnique: jest.fn(async () => (on ? { value: { on: true } } : { value: { on: false } })) } });

describe('the people step, as the lead reads it when she starts the anchor draft', () => {
  it('serves the rules and the words, with the pinned keys', async () => {
    const out = await new TheAnchorDoor(prismaWith(true)).start(undefined);
    expect(Object.keys(out.thePeopleStep).sort()).toEqual([...THE_SHAPES_KEYS.peopleStepRules].sort());
    expect(out.thePeopleStep).toEqual({
      limit: 20, theLeadCounts: false, mayAdd: 20,
      heading: 'Who needs to be part of this?',
      intro: 'Add up to 20 people. They don’t need to report directly to you. They simply need to be part of the work you’re trying to move.',
      contextLabel: 'What do they do, and why are they part of this?',
      button: 'Start my Groundwork.',
      limitSentence: 'This one-month Groundwork holds up to 20 people besides you.',
    });
  });

  it('serves nothing with the switch off: the door answers not found, as before', async () => {
    await expect(new TheAnchorDoor(prismaWith(false)).start(undefined)).rejects.toThrow('This way in is not open yet.');
  });

  /* Changed 8 October (decision 121, item 4): this said the lead is counted in the 20 and may add 19. The 20 are the team, and the lead is not one of them. */
  it('does not count the lead among the 20, so she may add 20', () => {
    expect(THE_PEOPLE_STEP_RULES.theLeadCounts).toBe(false);
    expect(THE_PEOPLE_STEP_RULES.limit).toBe(THE_PEOPLE_STEP_RULES.mayAdd);
  });
});
