/**
 * Green, amber and red are a scale in this product. Blue is a notice.
 *
 * The stylesheet also used the pale blue as a hover and selected fill, which
 * gave the same colour a second, unrelated job: sometimes it meant "read this",
 * sometimes it meant "your pointer is here". A reader learning the scale kept
 * meeting it where it meant nothing. Selection now uses --gw-slate, a neutral
 * surface the system already had, so nothing was invented to fix it.
 *
 * This asserts the separation holds: no interaction state — hover, focus, or
 * selected — is painted in a scale or notice colour.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/* UPDATED 24 October: the prototype's stylesheet and the product's small one are read too; most hover and selected rules now
   live there (the product's own copies of them were removed). */
const CSS = readFileSync(join(__dirname, '../../index.css'), 'utf8') + '\n' + readFileSync(join(__dirname, '../../styles/prototype.css'), 'utf8').replace(/\}/g, '}\n') + '\n' + readFileSync(join(__dirname, '../../styles/product.css'), 'utf8')
  /* Comments stripped before matching. This file explains its own colours at
     length, and a rule that only survives inside a comment is not a rule. */
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** The colours that carry meaning, so borrowing one for a mouse state is a lie. */
const MEANS_SOMETHING = ['--gw-green-bg', '--gw-amber-bg', '--gw-red-bg', '--gw-blue-bg'];

const rulesFor = (selectorFragment: string) =>
  CSS.split('}')
    .filter((block) => block.includes(selectorFragment))
    .map((block) => block + '}');

describe('the stylesheet', () => {
  it('is the real one, so an empty read cannot pass', () => {
    expect(CSS).toContain('--gw-slate');
    expect(CSS.length).toBeGreaterThan(5000);
  });

  it.each([':hover', ':focus-visible', '.selected'])(
    'never fills a %s state with a colour that carries meaning',
    (state) => {
      const offending = rulesFor(state).filter((rule) =>
        MEANS_SOMETHING.some((token) => rule.includes(`background: var(${token})`)),
      );
      expect(offending).toEqual([]);
    },
  );

  it('and there are interaction rules to check, so the search is not passing on nothing', () => {
    expect(rulesFor(':hover').length).toBeGreaterThan(5);
    /* 24 October: the prototype marks a chosen thing ".on" (.nav.on, .tab.on, .chip.on), not ".selected". */
    expect(rulesFor('.selected').length + rulesFor('.on').length).toBeGreaterThan(1);
  });
});

describe('hairlines', () => {
  /**
   * Eight rules asked for a 0.5px border. On a retina screen that is a crisp
   * hairline; anywhere else it rounds unpredictably — sometimes to nothing —
   * and sat directly beside 1px borders that did not. One width now.
   */
  it('are one width, not two', () => {
    expect(CSS).not.toMatch(/0\.5px solid/);
  });
});
