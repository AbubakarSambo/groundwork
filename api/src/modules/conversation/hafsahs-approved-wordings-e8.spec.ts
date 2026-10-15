import { readFileSync } from 'fs';
import { join } from 'path';
import { SEED_PROMPTS } from './prompt-library';

/**
 * HAFSAH'S APPROVED WORDINGS, 14 OCTOBER (E8). Three questions people read are said her way, in every prompt the start
 * stores (so the version that runs is the new one), and in the role maps.
 */
const OLD = [
  /what was agreed between you that was never actually said out loud/i,
  /what held or ran this period that nobody would have noticed/i,
  /is that still the period you want this measured against/i,
];
const NEW = ['Is there anything you two agreed without ever saying it?', 'What did you keep running since last time that nobody else saw?', 'Is that still the right time span for this'];
const ROLE_MAPS = readFileSync(join(__dirname, '..', 'board', 'role-maps.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const ALL = SEED_PROMPTS.map((p) => p.content).join('\n') + ROLE_MAPS;

describe('the three approved wordings', () => {
  it('the old sentences are in no stored prompt and no role map', () => {
    for (const o of OLD) expect(ALL).not.toMatch(o);
  });
  it('the new ones are', () => {
    for (const n of NEW) expect(ALL).toContain(n);
  });
  /* That the start makes these new words the running version, and never overwrites one activated by hand, is
     a-start-never-overwrites-a-prompt-activated-by-hand.spec.ts; it is proved live from a run's promptVersionId. */
});
