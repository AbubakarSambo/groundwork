import { draftThePicture } from './the-picture-is-drafted-from-the-reads';

/**
 * NOBODY IN THE SENTENCE WAITS ON THEMSELVES (night run 2, 20 October 2026). Drop Access's team report, as Kevin Omondi and Mercy Wairimu
 * read it, said "Grace Achieng and Peter Njoroge are waiting on Grace Achieng for 4 things", and as Grace read it, "You and Peter Njoroge
 * are waiting on you for 4 things". Grace was waiting on her reps, and Peter on her. For everybody, switch or no switch: it was untrue.
 */
const base = { answered: 4, ofPeople: 5, confidence: { saying: 'There is enough here to talk about.' }, patterns: [], coverage: [], contribution: [], settled: [], open: [] };
const waits = [
  { who: 'Sales lead', on: null, onIsPerson: false, what: 'updates from the reps on their deals', kind: null, escalated: false },
  { who: 'Sales lead', on: null, onIsPerson: false, what: 'what was sold with proof', kind: null, escalated: false },
  { who: 'Sales rep D', on: 'Sales lead', onIsPerson: true, what: 'a decision on the discount', kind: null, escalated: false },
  { who: 'Sales rep D', on: 'Sales lead', onIsPerson: true, what: 'the price list', kind: null, escalated: false },
];

describe('a wait, as every reader of the team report reads it', () => {
  it('never says the people waiting are waiting on one of themselves', () => {
    const line = draftThePicture({ ...base, blockers: waits } as any).find((d) => d.key.startsWith('block-'))!.text;
    expect(line).toBe('Sales lead and Sales rep D are waiting for 4 things, starting with updates from the reps on their deals, with no escalation on record.');
  });

  it('still says who they are waiting on where that person is not one of them', () => {
    const line = draftThePicture({ ...base, blockers: waits.slice(2) } as any).find((d) => d.key.startsWith('block-'))!.text;
    expect(line).toBe('Sales rep D is waiting on Sales lead for a decision on the discount and the price list, with no escalation on record.');
  });
});
