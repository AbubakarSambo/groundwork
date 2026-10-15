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

const PAGES = path.join(__dirname, '../../../../marketing/src/pages');
const HOME = path.join(PAGES, 'index.astro');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
const copy = () => fs.readFileSync(HOME, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Prose only. A promise inside a source comment is a note, not a claim. */
function visibleCopy(): string {
  return copy().replace(/<!--[\s\S]*?-->/g, '');
}

/** Every page, because the first false sentence was removed from the home page and survived on two others. */
function everyPage(): { page: string; text: string }[] {
  return fs.readdirSync(PAGES).filter((f) => f.endsWith('.astro')).map((f) => ({ page: f, text: strip(fs.readFileSync(path.join(PAGES, f), 'utf8')) }));
}

/**
 * SENTENCES THE SITE STILL MAKES THAT THE PRODUCT DOES NOT KEEP, LEFT AS THEY ARE ON PURPOSE.
 *
 * The marketing copy is frozen (fix_plan.md, standing constraints), so a guard over every page
 * would go red on day one for sentences already known and accepted. Each is listed here with the
 * finding it leaves open, so the guard catches a NEW overclaim without failing on an old one - and
 * so that when the product catches up with a sentence, the entry comes off this list rather than
 * the sentence coming off the page.
 */
const ACCEPTED_OVERCLAIMS: { page: string; sentence: RegExp; leavesOpen: string }[] = [
  { page: 'how-it-works.astro', sentence: /Groundwork never shows anyone's raw answers/, leavesOpen: 'P6B-001: a lead can be shown a paraphrase of a party (fix plan A3); raw turns are not shown' },
  { page: 'pricing.astro', sentence: /no one sees anyone else's raw answers/, leavesOpen: 'P6B-001, the same sentence on the pricing page' },
  /* A noun the product abandoned. There is no object called a Ground in the UI; the copy is frozen. */
  { page: 'how-it-works.astro', sentence: /the rest of the Ground is measured against/, leavesOpen: 'P6B-005: "Ground" as a noun, which the product no longer uses (fix plan F10)' },
  { page: 'how-it-works.astro', sentence: /the complete history of the Ground/, leavesOpen: 'P6B-005, the same noun' },
  { page: 'how-it-works.astro', sentence: /The closed Ground stays on record/, leavesOpen: 'P6B-005, the same noun' },
];

/** "Ground" as a noun, not the product's name. The product says check-in. */
const A_NOUN_THE_PRODUCT_ABANDONED = /\bGrounds?\b(?!work)/;

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

describe('and the same two regressions on every other page', () => {
  it.each(everyPage().map((p) => [p.page, p.text]))('%s does not claim answers are never shared, or that everyone reads one picture', (_page, text) => {
    expect(text).not.toMatch(/never shares individual answers/i);
    expect(text).not.toMatch(/The same picture goes to everyone in it/i);
  });

  it('a raw-answers promise appears only where it is already accepted, and nowhere new', () => {
    for (const { page, text } of everyPage()) {
      const claims = text.match(/[^.]*raw answers[^.]*\./gi) ?? [];
      for (const claim of claims) {
        const accepted = ACCEPTED_OVERCLAIMS.find((a) => a.page === page && a.sentence.test(claim));
        if (!accepted) throw new Error(`${page} makes a raw-answers promise that is not on the accepted list: "${claim.trim()}"`);
      }
    }
  });

  it('"Ground" as a noun appears only where it is already accepted, and nowhere new', () => {
    for (const { page, text } of everyPage()) {
      const claims = text.match(/[^.]*\bGrounds?\b(?!work)[^.]*\./g) ?? [];
      for (const claim of claims.filter((c) => A_NOUN_THE_PRODUCT_ABANDONED.test(c))) {
        const accepted = ACCEPTED_OVERCLAIMS.find((a) => a.page === page && a.sentence.test(claim));
        if (!accepted) throw new Error(`${page} says "Ground" as a noun, which the product no longer does: "${claim.trim()}"`);
      }
    }
  });

  it('and every accepted overclaim is still on its page, or its entry is stale', () => {
    for (const a of ACCEPTED_OVERCLAIMS) {
      const page = everyPage().find((p) => p.page === a.page);
      expect(page && a.sentence.test(page.text)).toBe(true);
    }
  });
});

describe('what the page promises about who sees what', () => {
  it('does not claim everyone reads the same picture', () => {
    // THE REGRESSION. True enough on two people, wrong on a cohort.
    expect(visibleCopy()).not.toMatch(/The same picture goes to everyone in it/i);
  });

  it('says the part that is true: the people in it get the same report', () => {
    /**
     * WHAT CHANGED, AND WHY. This pinned "at the same moment", which Hafsah read on the live page
     * and said plainly is not true - the report does not reach everybody in one instant, and the
     * page should not say it does. The wording is now "this is your report too. The same one."
     *
     * The PROMISE is what must not disappear, and the promise is sameness, not simultaneity: a
     * page that describes a private check-in and never says the report is shared invites the
     * reader to assume it is not. Which sentence carries it is a copy decision; that it is carried
     * is not.
     */
    expect(visibleCopy()).toMatch(/this is your report too\. The same one/i);
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
