import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { namesTheyMayRead, withoutWhoSaidIt, nothingIdentifyingIn, isHowItWasShared } from './what-the-respondents-get';

/**
 * Hafsah, 23 September 2026: "Groundwork does not automatically decide to anonymise. You decide."
 */
describe('who gets names put back', () => {
  it('the lead always, whatever they chose for everybody else', () => {
    expect(namesTheyMayRead({ viewerIsLead: true, sharedAs: 'ANONYMOUS', peersAreNamed: false })).toBe(true);
  });

  it('a respondent, when the organiser sent it named', () => {
    expect(namesTheyMayRead({ viewerIsLead: false, sharedAs: 'NAMED', peersAreNamed: false })).toBe(true);
  });

  it('and not when they sent it anonymised, even where the check-in names peers', () => {
    expect(namesTheyMayRead({ viewerIsLead: false, sharedAs: 'ANONYMOUS', peersAreNamed: true })).toBe(false);
  });

  /* Nothing sent yet is not a decision, so it must behave exactly as it did before the choice
     existed. A silent switch to anonymised would be the product deciding by the back door. */
  it('and falls back to the check-in\'s own setting before anything is sent', () => {
    expect(namesTheyMayRead({ viewerIsLead: false, sharedAs: null, peersAreNamed: true })).toBe(true);
    expect(namesTheyMayRead({ viewerIsLead: false, sharedAs: null, peersAreNamed: false })).toBe(false);
  });
});

describe('taking the names out of the words themselves', () => {
  const them = [
    { name: 'Adaeze Nwosu', organisation: 'Harvestline Foods' },
    { name: 'Musa Garba', organisation: 'Jigawa Rice Farmers Co' },
  ];

  /* THE HALF THAT ACTUALLY LEAKS. Label substitution never touches a name inside a sentence. */
  it('takes a name out of a quote', () => {
    expect(withoutWhoSaidIt('Adaeze Nwosu told us to prepay.', them)).toBe('Somebody in this check-in told us to prepay.');
  });

  it('and a first name on its own, which is just as identifying inside a network', () => {
    expect(withoutWhoSaidIt('Adaeze said it twice.', them)).toBe('Somebody in this check-in said it twice.');
  });

  it('and the organisation', () => {
    expect(withoutWhoSaidIt('Harvestline Foods buys in November.', them)).toBe('One organisation buys in November.');
  });

  /* Longest first, or "Harvestline Foods" leaves "one organisation Foods" behind. */
  it('and never leaves a stump behind a longer name', () => {
    expect(withoutWhoSaidIt('Harvestline Foods', them)).not.toMatch(/Foods/);
  });

  it('and does not cut a name out of the middle of another word', () => {
    expect(withoutWhoSaidIt('The musagarba variety is unrelated.', them)).toContain('musagarba');
  });

  /* A first word that names half the sector is not an identifier. Scrubbing it would turn every
     sentence about research into a sentence about "one organisation". */
  it('and leaves a generic first word alone', () => {
    const generic = [{ name: null, organisation: 'National Cereals Research Institute' }];
    expect(withoutWhoSaidIt('National policy changed in 2026.', generic)).toContain('National policy');
  });

  it('and reaches every string in a report however deep it sits', () => {
    const report = { a: 'Adaeze Nwosu', b: { c: ['Harvestline Foods', 7, null] } };
    expect(nothingIdentifyingIn(report, them)).toEqual({
      a: 'Somebody in this check-in',
      b: { c: ['One organisation', 7, null] },
    });
  });
});

describe('the choice itself', () => {
  it('is one of two things and nothing else', () => {
    expect(isHowItWasShared('NAMED')).toBe(true);
    expect(isHowItWasShared('ANONYMOUS')).toBe(true);
    expect(isHowItWasShared('anonymous')).toBe(false);
    expect(isHowItWasShared(undefined)).toBe(false);
  });
});

describe('and the send writes it before a single mail goes out', () => {
  const SRC = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const SEND = SRC.slice(SRC.indexOf('async sendToEveryone('), SRC.indexOf('async getReport('));

  /* The mail carries a link to a page that reads this column. Writing it afterwards races the
     email, and the first person to click would read the version nobody chose. */
  it('stores the choice before it tells anybody', () => {
    expect(SEND.indexOf("data: { sharedAs }")).toBeGreaterThan(-1);
    expect(SEND.indexOf("data: { sharedAs }")).toBeLessThan(SEND.indexOf('tellThemTheReportIsReady'));
  });

  it('and defaults to named, because anything else would be the product deciding', () => {
    expect(SEND).toMatch(/isHowItWasShared\(as\) \? as : 'NAMED'/);
  });
});
