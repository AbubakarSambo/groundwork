/**
 * FOUR KINDS OF NOTICE WERE DEFINED AND ONE WAS EVER SENT.
 *
 * `what-a-channel-may-be-told.ts` composes four, and only 'a report is ready' had a caller — so an
 * admin who connected Slack saw the test post and then near-silence for weeks, and reasonably
 * concluded the integration was broken. A notice type nothing sends is a promise in a type
 * definition.
 *
 * This is the guard for the class of fault rather than for the four instances: it reads the
 * composer's own union and requires every member to have a caller somewhere in the source.
 */
import * as fs from 'fs';
import * as path from 'path';
import { whatItSays, type WhatHappened } from './what-a-channel-may-be-told';

const srcRoot = path.join(__dirname, '..', '..');

function everySource(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) everySource(full, out);
    else if (e.name.endsWith('.ts') && !e.name.includes('.spec.')) out.push(full);
  }
  return out;
}

const kinds: WhatHappened[] = (() => {
  /* Comments stripped FIRST. The file's own doc comment quotes phrases, and the union sits after
     it — so a naive slice picked up sentences from the explanation and asserted that a paragraph
     had a caller. */
  const composer = fs
    .readFileSync(path.join(__dirname, 'what-a-channel-may-be-told.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const union = composer.slice(composer.indexOf('export type WhatHappened'), composer.indexOf('export interface Notice'));
  return [...union.matchAll(/'([^']+)'/g)].map((m) => m[1] as WhatHappened);
})();

const allSource = everySource(srcRoot)
  .filter((f) => !f.endsWith('what-a-channel-may-be-told.ts'))
  .map((f) => fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''))
  .join('\n');

describe('every kind of notice a channel may be told is actually sent', () => {
  it('read the union at all, so this cannot pass by finding nothing', () => {
    expect(kinds.length).toBeGreaterThanOrEqual(4);
  });

  it.each(kinds)('%s has a caller', (kind) => {
    expect(allSource).toContain(`what: '${kind}'`);
  });

  it('and every kind composes a sentence naming the check-in', () => {
    for (const kind of kinds) {
      const said = whatItSays({ what: kind, about: 'The Q3 handover', link: 'https://x.test' });
      expect(said.length).toBeGreaterThan(20);
      expect(said).toContain('The Q3 handover');
    }
  });

  it('and no notice can carry what somebody wrote, which is the point of the shape', () => {
    const composer = fs.readFileSync(path.join(__dirname, 'what-a-channel-may-be-told.ts'), 'utf8');
    const shape = composer.slice(composer.indexOf('export interface Notice'), composer.indexOf('const SAYS'));
    /* `about` is a label the lead chose and everybody in the check-in already sees; `howMany` is a
       count. There is deliberately nowhere to put a name or a sentence somebody typed. */
    expect(shape).not.toMatch(/\b(text|body|content|said|quote|name|who)\??:/);
  });
});
