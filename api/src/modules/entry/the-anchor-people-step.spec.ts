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
      limit: 20, theLeadCounts: true, mayAdd: 19,
      heading: 'Who needs to be part of this?',
      intro: 'Add up to 20 people. They don’t need to report directly to you. They simply need to be part of the work you’re trying to move.',
      contextLabel: 'What do they do / why are they part of this?',
      button: 'Start my Groundwork.',
      limitSentence: 'This one-month Groundwork holds 20 people, and you are one of them, so you can add 19 more.',
    });
  });

  it('serves nothing with the switch off: the door answers not found, as before', async () => {
    await expect(new TheAnchorDoor(prismaWith(false)).start(undefined)).rejects.toThrow('This way in is not open yet.');
  });

  it('counts the lead in the 20, so she may add 19', () => {
    expect(THE_PEOPLE_STEP_RULES.limit - 1).toBe(THE_PEOPLE_STEP_RULES.mayAdd);
  });
});
