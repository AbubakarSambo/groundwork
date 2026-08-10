import * as fs from 'fs';
import * as path from 'path';
import { namesVisibleTo } from './party-labels';
import { PartyType } from '@prisma/client';

/**
 * THE MARKETING PAGE MAKES PRIVACY PROMISES. THIS CHECKS THE PRODUCT KEEPS THEM.
 *
 * Two claims were live on the home page and both were false, and I wrote both:
 *
 *   "Groundwork never shares individual answers."
 *      It does. A real eight-session report's divergences carry direct quotes
 *      with the session they came from. What it never shares is anybody's
 *      account of somebody ELSE - which is the promise that actually matters,
 *      and which the weaker false one was standing in front of.
 *
 *   "The same picture goes to everyone in it."
 *      Not on a cohort. Fourteen people in fourteen districts who have never met
 *      do not read each other, and the product already knew that. The page was
 *      overclaiming past correct behaviour, which is the worst way to be wrong:
 *      it invites somebody to discover a limit that was a considered decision.
 *
 * NEITHER WAS FINDABLE BY ANY TEST THAT EXISTED. The API cannot see the site and
 * the site cannot see the API, so a sentence on one could contradict the other
 * indefinitely. This reads the shipped copy and checks it against the behaviour
 * it describes - the only place the two are ever compared.
 */

const HOME = path.join(__dirname, '../../../../marketing/src/pages/index.astro');
const copy = () => fs.readFileSync(HOME, 'utf8');

/** Prose only. A promise inside a source comment is a note, not a claim. */
function visibleCopy(): string {
  return copy().replace(/<!--[\s\S]*?-->/g, '');
}

describe('what the page promises about individual answers', () => {
  it('does not claim answers are never shared, because they are', () => {
    // THE REGRESSION. The exact sentence that shipped.
    expect(visibleCopy()).not.toMatch(/never shares individual answers/i);
  });

  it('makes the promise the product actually keeps', () => {
    const text = visibleCopy();
    expect(text).toMatch(/never says who said what about whom/i);
  });
});

describe('what the page promises about who sees what', () => {
  it('does not claim everyone reads the same picture', () => {
    // THE REGRESSION. True enough on two people, wrong on a cohort.
    expect(visibleCopy()).not.toMatch(/The same picture goes to everyone in it/i);
  });

  it('says the part that is true: everyone gets it at the same moment', () => {
    expect(visibleCopy()).toMatch(/Everyone gets the report, at the same moment/i);
  });
});

describe('and the behaviour those sentences describe', () => {
  const parties = [
    { id: 'lead', partyType: PartyType.INITIATOR, user: { firstName: 'Helen', lastName: 'Ward' }, email: 'helen@x.test' },
    { id: 'a', partyType: PartyType.PARTICIPANT, user: { firstName: 'Nomsa', lastName: 'Dube' }, email: 'nomsa@x.test' },
    { id: 'b', partyType: PartyType.PARTICIPANT, user: { firstName: 'Kwame', lastName: 'Osei' }, email: 'kwame@x.test' },
    { id: 'c', partyType: PartyType.PARTICIPANT, user: { firstName: 'Sarah', lastName: 'Bell' }, email: 'sarah@x.test' },
  ] as any[];

  it('a participant sees themselves and the lead, and nobody else', () => {
    // displayName resolves to the full name, which is what a reader sees.
    const visible = [...namesVisibleTo('a', parties).values()];
    expect(visible).toContain('Nomsa Dube');
    expect(visible).toContain('Helen Ward');
    expect(visible).not.toContain('Kwame Osei');
    expect(visible).not.toContain('Sarah Bell');
    expect(visible).toHaveLength(2);
  });

  it('the lead sees everyone, which is what carrying the ground requires', () => {
    const visible = [...namesVisibleTo('lead', parties).values()];
    for (const name of ['Helen Ward', 'Nomsa Dube', 'Kwame Osei', 'Sarah Bell']) expect(visible).toContain(name);
  });

  it('so on a cohort, thirteen strangers stay strangers', () => {
    // The case the old sentence got wrong. Everybody gets a report; almost
    // nobody in it is named to them, and that is the design rather than a gap.
    const cohort = Array.from({ length: 14 }, (_, i) => ({
      id: `p${i}`,
      partyType: i === 0 ? PartyType.INITIATOR : PartyType.PARTICIPANT,
      user: { firstName: `Officer${i}`, lastName: 'X' },
      email: `p${i}@x.test`,
    })) as any[];

    const asOne = [...namesVisibleTo('p7', cohort).values()];
    expect(asOne).toEqual(expect.arrayContaining(['Officer7 X', 'Officer0 X']));
    expect(asOne).toHaveLength(2);
  });
});
