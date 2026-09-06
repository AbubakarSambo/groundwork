/**
 * FOUR COLLISIONS IN ONE DAY, AND NOT ONE OF THEM FAILED ANYTHING.
 *
 *   "set up a check-in about our objectives" -> taken by the objective lane
 *   "how do I run a check-in"                -> taken by the check-in lane
 *   "how does the freeze work"               -> taken by nothing
 *   "how do the phases work"                 -> taken by nothing
 *
 * The wrong lane answered, plausibly, every time. Two were caught by an existing
 * guard that happened to pin two lanes next to each other; the other two were
 * caught by asking the question out loud and reading the reply.
 *
 * That does not scale, and it is the whole argument for a registry. Each
 * capability declares the phrasings it owns and the ones it must not take, and
 * they are all run through the real router here. A collision is now a failing
 * test.
 */
import { route, Lane } from './the-router-is-deterministic';
import {
  WHAT_THE_ASSISTANT_CAN_DO,
  CAPABILITY_BY_KEY,
  THE_ONES_THAT_WRITE,
} from './what-the-assistant-can-do';

describe('every capability owns what it says it owns', () => {
  for (const capability of WHAT_THE_ASSISTANT_CAN_DO) {
    for (const phrase of capability.owns) {
      it(`"${phrase}" -> ${capability.key}`, () => {
        expect(route(phrase).lane).toBe(capability.key);
      });
    }
  }
});

describe('and takes nothing it says it must not', () => {
  for (const capability of WHAT_THE_ASSISTANT_CAN_DO) {
    for (const phrase of capability.refuses) {
      it(`"${phrase}" does not go to ${capability.key}`, () => {
        expect(route(phrase).lane).not.toBe(capability.key);
      });
    }
  }
});

describe('and no two capabilities claim the same words', () => {
  it('at all', () => {
    /* The failure this file exists for. Two declarations owning one phrase is a
       collision written down rather than discovered. */
    const claimed = new Map<string, Lane>();
    const clashes: string[] = [];
    for (const c of WHAT_THE_ASSISTANT_CAN_DO) {
      for (const phrase of c.owns) {
        const already = claimed.get(phrase.toLowerCase());
        if (already && already !== c.key) clashes.push(`"${phrase}": ${already} and ${c.key}`);
        claimed.set(phrase.toLowerCase(), c.key);
      }
    }
    expect(clashes).toEqual([]);
  });
});

describe('the registry and the router agree about what exists', () => {
  it('every lane the router can pick is declared', () => {
    /**
     * A lane with no declaration is one nobody wrote down the purpose of, has no
     * owned phrasings, and is therefore untested by everything above. That is
     * exactly the state all fourteen were in this morning.
     */
    const declared = new Set(WHAT_THE_ASSISTANT_CAN_DO.map((c) => c.key));
    const routerSource = require('fs')
      .readFileSync(require('path').join(__dirname, 'the-router-is-deterministic.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    const lanes = [...routerSource.matchAll(/rule\('([a-z_]+)'/g)].map((m) => m[1]);
    expect(lanes.length).toBeGreaterThan(5);
    const undeclared = lanes.filter((l) => !declared.has(l as Lane));
    expect(undeclared).toEqual([]);
  });

  it('and every declaration says why it sits where it sits', () => {
    /* A position with no reason is one nobody can move safely, which is how an
       ordered list becomes untouchable. */
    const silent = WHAT_THE_ASSISTANT_CAN_DO.filter((c) => c.ordered.trim().length < 30);
    expect(silent.map((c) => c.key)).toEqual([]);
  });
});

describe('nothing writes on a sentence alone', () => {
  it('every capability that changes anything says how it is agreed', () => {
    /**
     * The rule the assistant already ran on — a model that could choose the lane
     * could be talked into choosing one — said once instead of re-earned in
     * fourteen places.
     */
    expect(THE_ONES_THAT_WRITE.length).toBeGreaterThan(0);
    for (const c of THE_ONES_THAT_WRITE) {
      expect(['after you confirm it', 'opens a draft nobody has agreed yet']).toContain(c.writes);
    }
  });

  it('and the ones that only answer say so', () => {
    expect(CAPABILITY_BY_KEY.get('what_am_i_on')!.writes).toBe('nothing');
    expect(CAPABILITY_BY_KEY.get('how_we_work')!.writes).toBe('nothing');
  });
});
