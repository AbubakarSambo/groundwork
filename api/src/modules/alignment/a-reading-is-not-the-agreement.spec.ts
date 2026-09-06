/**
 * TWO WAYS TO END UP ASSERTING A CONTRACT NOBODY SIGNED.
 *
 * By letting a model's reading become a term, and by letting a version be edited
 * so that what the agreement said in July depends on who last touched it. Both are
 * unrecoverable in the setting this is built for: two companies already in
 * disagreement, one of whom is paying.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  AgreementVersion,
  whatWasInForce,
  whyThisCannotStart,
  theDayBefore,
} from './an-agreement-is-versioned-never-edited';
import {
  Term,
  whatItMayBeUsedFor,
  mayBe,
  howItReads,
  whyItCannotBeUsedYet,
} from './a-term-is-not-true-because-a-model-read-it';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const version = (over: Partial<AgreementVersion> = {}): AgreementVersion => ({
  id: 'v1',
  number: 1,
  state: 'in force',
  inForceFrom: new Date('2026-01-01'),
  inForceTo: null,
  agreedBy: ['A', 'B'],
  ...over,
});

const term = (over: Partial<Term> = {}): Term => ({
  says: 'revenue share',
  reads: 'Twenty per cent of revenue from the protected data.',
  state: 'read from the document',
  clause: 'clause 4.2',
  checkedBy: [],
  readDifferently: null,
  ...over,
});

describe('what was in force on a day', () => {
  const v1 = version({ id: 'v1', number: 1, inForceFrom: new Date('2026-01-01'), inForceTo: new Date('2026-06-30'), state: 'replaced' });
  const v2 = version({ id: 'v2', number: 2, inForceFrom: new Date('2026-07-01') });

  it('answers with the version covering that day', () => {
    expect(whatWasInForce([v1, v2], new Date('2026-03-15'))).toEqual({ version: v1 });
    expect(whatWasInForce([v1, v2], new Date('2026-08-15'))).toEqual({ version: v2 });
  });

  it('the amended version still stands over the period it covered', () => {
    /* The whole reason a version is never edited: July is when the thing being
       argued about happened. */
    expect(whatWasInForce([v1, v2], new Date('2026-06-30'))).toEqual({ version: v1 });
  });

  it('says nothing was in force before it started, rather than guessing', () => {
    const out = whatWasInForce([v1, v2], new Date('2025-12-31')) as { none: string };
    expect(out.none).toContain('2026-01-01');
  });

  it('refuses to choose where two versions somehow cover the same day', () => {
    const overlapping = version({ id: 'v3', number: 3, inForceFrom: new Date('2026-01-01') });
    const out = whatWasInForce([v1, overlapping], new Date('2026-03-15')) as { none: string };
    expect(out.none).toContain('More than one version');
  });

  it('ignores a version nobody has finished putting together', () => {
    const draft = version({ id: 'v9', number: 9, state: 'being put together', inForceFrom: new Date('2026-01-01') });
    expect(whatWasInForce([v1, v2, draft], new Date('2026-03-15'))).toEqual({ version: v1 });
  });
});

describe('an amendment leaves no gap and no overlap', () => {
  it('refuses a version starting before the current one', () => {
    const why = whyThisCannotStart([version()], new Date('2025-06-01'));
    expect(why).toContain('starts after that');
  });

  it('refuses one starting the same day', () => {
    expect(whyThisCannotStart([version()], new Date('2026-01-01'))).not.toBeNull();
  });

  it('allows one starting later', () => {
    expect(whyThisCannotStart([version()], new Date('2026-07-01'))).toBeNull();
  });

  it('closes the old one the day before, so no day has two answers or none', () => {
    expect(theDayBefore(new Date('2026-07-01')).toISOString().slice(0, 10)).toBe('2026-06-30');
    expect(theDayBefore(new Date('2026-01-01')).toISOString().slice(0, 10)).toBe('2025-12-31');
  });
});

describe('what a term may be used for', () => {
  it('a model’s reading may not even shape a question', () => {
    expect(whatItMayBeUsedFor('read from the document')).toEqual([]);
  });

  it('one side’s check lets it be shown and asked about, never judged against', () => {
    const t = term({ state: 'checked by one side', checkedBy: ['B'] });
    expect(mayBe(t, 'shown as a reading')).toBe(true);
    expect(mayBe(t, 'used to ask a question')).toBe(true);
    expect(mayBe(t, 'used to judge what happened')).toBe(false);
  });

  it('only both sides agreeing lets anything be judged against it', () => {
    expect(mayBe(term({ state: 'agreed by both', checkedBy: ['A', 'B'] }), 'used to judge what happened')).toBe(true);
  });

  it('and a term the two sides read differently never judges anybody', () => {
    const t = term({ state: 'read differently by each side', readDifferently: [{ by: 'A', reads: 'gross' }, { by: 'B', reads: 'net' }] });
    expect(mayBe(t, 'used to judge what happened')).toBe(false);
    expect(mayBe(t, 'used to ask a question')).toBe(true);
  });
});

describe('how a term reads, which is never as a fact', () => {
  it('an unchecked reading says so', () => {
    expect(howItReads(term())).toContain('not checked by anybody yet');
  });

  it('one side’s reading is attributed to them', () => {
    const said = howItReads(term({ state: 'checked by one side', checkedBy: ['B'] }));
    expect(said).toContain('as B reads it');
    expect(said).toContain('The other side has not said');
  });

  it('a disagreement is said as both readings', () => {
    const said = howItReads(term({
      state: 'read differently by each side',
      readDifferently: [{ by: 'A', reads: 'gross revenue' }, { by: 'B', reads: 'net of costs' }],
    }));
    expect(said).toContain('A: “gross revenue”');
    expect(said).toContain('B: “net of costs”');
    expect(said).toContain('worth settling');
  });
});

describe('a refusal that says what would fix it', () => {
  it('an unchecked reading names the fix', () => {
    const why = whyItCannotBeUsedYet(term(), 'used to ask a question')!;
    expect(why).toContain('nobody has checked it');
    expect(why).toContain('reads the clause');
  });

  it('one side’s reading is that side’s case, and says so', () => {
    const why = whyItCannotBeUsedYet(term({ state: 'checked by one side', checkedBy: ['B'] }), 'used to judge what happened')!;
    expect(why).toContain("One side's reading");
  });

  it('and where it is allowed, there is no refusal', () => {
    expect(whyItCannotBeUsedYet(term({ state: 'agreed by both', checkedBy: ['A', 'B'] }), 'used to judge what happened')).toBeNull();
  });
});

describe('a version is never edited', () => {
  const service = withoutComments('agreements.service.ts');

  it('nothing changes what a version says', () => {
    /* Only two updates exist: closing one on amendment, and recording who agreed.
       Neither touches the dates it applied from or the terms it carries. */
    const updates = service.match(/agreementVersion\.update\(/g) ?? [];
    expect(updates.length).toBe(3);
    expect(service).not.toMatch(/agreementVersion\.update[\s\S]{0,200}inForceFrom:/);
  });

  it('an amendment is the next number, not a change to the last', () => {
    const amend = service.slice(service.indexOf('async amend('), service.indexOf('async agreed('));
    expect(amend).toContain('number: highest.number + 1');
    expect(amend).toContain('theDayBefore');
  });

  it('and both sides are needed before a version is in force', () => {
    const agreed = service.slice(service.indexOf('async agreed('), service.indexOf('async signed('));
    expect(agreed).toContain('agreedBy.length >= 2');
  });

  it('agreeing is not signing, and neither method does the other', () => {
    /* People collapse these two constantly, and the difference is the whole
       argument six months later. */
    const agreed = service.slice(service.indexOf('async agreed('), service.indexOf('async signed('));
    /* It READS signedAt to decide whether both facts are in; it never writes one. */
    expect(agreed).not.toMatch(/signedAt:\s*(new Date|on)/);
    const signed = service.slice(service.indexOf('async signed('), service.indexOf('async standing('));
    expect(signed).toContain('agreedBy.length < 2');
    expect(signed).toContain('BadRequestException');
  });

  it('nothing is in force on agreement alone', () => {
    const agreed = service.slice(service.indexOf('async agreed('), service.indexOf('async signed('));
    expect(agreed).toContain('version.signedAt');
  });

  it('a term read by a model arrives checked by nobody', () => {
    const read = service.slice(service.indexOf('async readTerm('), service.indexOf('async checked('));
    expect(read).toContain('checkedBy: []');
    expect(read).not.toContain("state: 'agreed");
  });

  it('and a third reading cannot be piled onto a disagreement', () => {
    const checked = service.slice(service.indexOf('async checked('), service.indexOf('async readsItDifferently('));
    expect(checked).toContain("'read differently by each side'");
    expect(checked).toContain('BadRequestException');
  });
});
