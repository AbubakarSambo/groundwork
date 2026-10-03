/**
 * "YOU CAN DO EVERYTHING THROUGH THE ASSISTANT" IS A CLAIM THAT DECAYS.
 *
 * A product grows. The week after somebody says it, it is less true, and nothing
 * anywhere notices. This is what makes it checkable: every area of the product is
 * either reachable by asking or written down as deliberately not, with a reason.
 *
 * The point is not the list. The point is that building a new area of the product
 * FAILS this test until somebody decides which it is — at the moment they are
 * building it, rather than a year later when a customer asks why they cannot do a
 * thing by asking for it.
 */
import * as fs from 'fs';
import * as path from 'path';
import { NOT_OFFERED_AREAS, NOT_OFFERED_IN_CHAT, REACHABLE_IN_CHAT } from './what-is-not-offered-in-chat';
import { CAPABILITY_BY_KEY } from './what-the-assistant-can-do';

/** The product's own areas, read from the modules that exist. */
const areasThatExist = (): string[] =>
  fs
    .readdirSync(path.join(__dirname, '..'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => {
      /* An area is a module with a controller — something a person or a machine
         can actually reach. A module of pure services is plumbing under one of
         these, not a thing anybody asks for. */
      const dir = path.join(__dirname, '..', name);
      return fs.readdirSync(dir).some((f) => f.endsWith('.controller.ts'));
    })
    /* Not itself, and not the plumbing every module sits on. */
    .filter((name) => !['assistant', 'prisma'].includes(name));

describe('every area of the product', () => {
  it('is either reachable by asking, or written down as deliberately not', () => {
    const unexplained = areasThatExist().filter(
      (area) => !NOT_OFFERED_AREAS.has(area) && !(area in REACHABLE_IN_CHAT),
    );
    expect(unexplained).toEqual([]);
  });

  it('and there are enough of them that this is not passing on an empty list', () => {
    expect(areasThatExist().length).toBeGreaterThan(15);
  });

  it('and nothing is on both lists', () => {
    /* An area that is both reachable and deliberately not is a decision nobody
       made twice. */
    const both = Object.keys(REACHABLE_IN_CHAT).filter((a) => NOT_OFFERED_AREAS.has(a));
    expect(both).toEqual([]);
  });
});

describe('what is reachable', () => {
  it('names a capability that actually exists', () => {
    const unknown = Object.entries(REACHABLE_IN_CHAT)
      .filter(([, key]) => !CAPABILITY_BY_KEY.has(key as never))
      .map(([area, key]) => `${area} -> ${key}`);
    expect(unknown).toEqual([]);
  });
});

describe('what is not offered', () => {
  it('says why, in a sentence somebody could argue with', () => {
    /* "Not applicable" is how a list like this becomes furniture. */
    const thin = NOT_OFFERED_IN_CHAT.filter((n) => n.because.trim().length < 40);
    expect(thin.map((n) => n.area)).toEqual([]);
  });

  it('and every reason is one of the three that are legitimate', () => {
    const REASONS = ['not a person’s question', 'the chat is the wrong shape', 'not yet'];
    for (const n of NOT_OFFERED_IN_CHAT) expect(REASONS).toContain(n.why);
  });

  it('and the honest backlog is visible rather than buried', () => {
    /* "Not yet" is the only reason allowed to sit here permanently, so it should
       be easy to count and awkward to ignore. */
    const notYet = NOT_OFFERED_IN_CHAT.filter((n) => n.why === 'not yet');
    expect(notYet.length).toBeGreaterThan(0);
    for (const n of notYet) expect(n.because.length).toBeGreaterThan(50);
  });
});

describe('the suites (decision 85)', () => {
  it('are reached by asking: an admin sets one up by describing it, and nothing is set before the yes', () => {
    /* Until 3 October the suites sat on the not-offered list as "the chat is the wrong shape".
       Decision 85 says an admin sets them up by talking to Groundwork, so that is now the truth. */
    expect(NOT_OFFERED_AREAS.has('suites')).toBe(false);
    expect(REACHABLE_IN_CHAT.suites).toBe('set_up_a_suite');
    expect(CAPABILITY_BY_KEY.get('set_up_a_suite')?.writes).toBe('after you confirm it');
  });
});
