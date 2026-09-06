/**
 * A LIST OF OBLIGATIONS WITH NOTHING SHOWN AGAINST THEM IS READ AS A LIST OF
 * FAILURES WITHIN ABOUT A SECOND.
 *
 * Which is why the difference lives in the state machine rather than in the
 * wording — there is no state here that means breached, and no path to one.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  Obligation,
  ObligationState,
  whatThisIsEvidenceOf,
  whyThisCannotFollow,
  whyThisCannotBeAnObligation,
  asItStandsToday,
  NOTHING_SHOWN_IS_NOT_A_BREACH,
} from './an-obligation-is-not-evidence-of-itself';
import {
  Standing,
  whereItStands,
  howItStands,
  mayBeJudgedAgainst,
  whyThisCannotGovern,
  A_NOTE_IS_NOT_AN_AMENDMENT,
} from './an-amendment-is-not-a-conversation';

const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

const obligation = (over: Partial<Obligation> = {}): Obligation => ({
  says: 'Report revenue from the protected data each quarter',
  whose: 'B',
  fromTerm: 't1',
  dueOn: new Date('2026-10-01'),
  state: 'due, nobody has been asked',
  accounts: [],
  ...over,
});

const EVERY_STATE: ObligationState[] = [
  'not due yet',
  'due, nobody has been asked',
  'asked, no answer yet',
  'they say it was done',
  'both sides say it was done',
  'they say it was not done',
  'nothing has been shown either way',
];

describe('there is no state that means breached', () => {
  it('none of the seven says it', () => {
    for (const state of EVERY_STATE) {
      for (const word of ['breach', 'fail', 'missed', 'late', 'violat', 'default']) {
        expect(state.toLowerCase()).not.toContain(word);
      }
    }
  });

  it('and nothing any of them is evidence of says it either', () => {
    for (const state of EVERY_STATE) {
      const said = whatThisIsEvidenceOf(obligation({ state })).toLowerCase();
      for (const word of ['breach', 'failed', 'violat', 'owed', 'fraud']) {
        expect(said).not.toContain(word);
      }
    }
  });

  it('nothing shown says it is not a claim, and why', () => {
    const said = whatThisIsEvidenceOf(obligation({ state: 'nothing has been shown either way' }));
    expect(said).toContain('not a claim');
    expect(said).toContain('nobody was ever asked');
  });

  it('nobody asked is a gap in the asking, not in what they did', () => {
    expect(whatThisIsEvidenceOf(obligation({ state: 'due, nobody has been asked' })))
      .toContain('gap in the asking');
  });

  it('one side saying it was done is evidence of what they said', () => {
    expect(whatThisIsEvidenceOf(obligation({ state: 'they say it was done' })))
      .toContain('of nothing else');
  });

  it('and the strongest thing here is the responsible side’s own account', () => {
    expect(whatThisIsEvidenceOf(obligation({ state: 'they say it was not done' })))
      .toContain('Their own account');
  });

  it('the rule given to a synthesis forbids the words outright', () => {
    expect(NOTHING_SHOWN_IS_NOT_A_BREACH.toLowerCase()).toContain('never say an obligation was breached');
    expect(NOTHING_SHOWN_IS_NOT_A_BREACH.toLowerCase()).toContain('nobody may have been asked');
  });
});

describe('what may follow what', () => {
  it('nothing reaches “they say it was not done” without somebody being asked', () => {
    expect(whyThisCannotFollow('due, nobody has been asked', 'they say it was not done')).not.toBeNull();
    expect(whyThisCannotFollow('not due yet', 'they say it was not done')).not.toBeNull();
    expect(whyThisCannotFollow('asked, no answer yet', 'they say it was not done')).toBeNull();
  });

  it('nothing is owed before it is due', () => {
    expect(whyThisCannotFollow('not due yet', 'asked, no answer yet')).toContain('Nothing is owed');
  });

  it('and something both sides settled is not reopened silently', () => {
    expect(whyThisCannotFollow('both sides say it was done', 'nothing has been shown either way'))
      .toContain('takes somebody saying otherwise');
  });
});

describe('the calendar moves and the state moves with it', () => {
  /* Found by driving it: an obligation created before its due date sat in "not
     due yet" for good, and every attempt to ask about it afterwards was refused
     with "nothing is owed on this yet". The object was inert. */
  it('is not due before its day', () => {
    expect(asItStandsToday({ state: 'not due yet', dueOn: new Date('2026-10-01') }, new Date('2026-09-06')))
      .toBe('not due yet');
  });

  it('and is due on it, without anybody having touched anything', () => {
    expect(asItStandsToday({ state: 'not due yet', dueOn: new Date('2026-10-01') }, new Date('2026-10-01')))
      .toBe('due, nobody has been asked');
  });

  it('a continuous obligation with no date is due now', () => {
    expect(asItStandsToday({ state: 'not due yet', dueOn: null })).toBe('due, nobody has been asked');
  });

  it('but a state somebody put it in never moves because a day passed', () => {
    for (const state of EVERY_STATE.filter((s) => s !== 'not due yet')) {
      expect(asItStandsToday({ state, dueOn: new Date('2020-01-01') })).toBe(state);
    }
  });

  it('and the service reads today’s standing, never the column', () => {
    const service = withoutComments('obligations.service.ts');
    expect(service).toContain('asItStandsToday');
    const fn = service.slice(service.indexOf('async whereEverythingStands('));
    expect(fn).toContain('asItStandsToday');
  });
});

describe('an obligation only comes from a term both sides agreed', () => {
  it('refuses one from an unchecked reading', () => {
    expect(whyThisCannotBeAnObligation('read from the document')).toContain("one side's reading");
  });

  it('refuses one from a term only one side checked', () => {
    expect(whyThisCannotBeAnObligation('checked by one side')).not.toBeNull();
  });

  it('refuses one from a term the two sides read differently', () => {
    expect(whyThisCannotBeAnObligation('read differently by each side')).not.toBeNull();
  });

  it('and allows one where both agreed', () => {
    expect(whyThisCannotBeAnObligation('agreed by both')).toBeNull();
  });

  it('the service asks before it creates', () => {
    const service = withoutComments('obligations.service.ts');
    const fn = service.slice(service.indexOf('async from('), service.indexOf('async asked('));
    expect(fn.indexOf('whyThisCannotBeAnObligation')).toBeLessThan(fn.indexOf('obligation.create'));
  });

  it('and every read carries what it is evidence of', () => {
    const service = withoutComments('obligations.service.ts');
    const fn = service.slice(service.indexOf('async whereEverythingStands('));
    expect(fn).toContain('whatThisIsEvidenceOf');
  });
});

describe('discussed, agreed, signed, in force', () => {
  const from = new Date('2026-07-01');

  it('a note that nobody agreed is discussed and nothing more', () => {
    expect(whereItStands({ agreedBy: [], signedAt: null, inForceFrom: from, inForceTo: null })).toBe('discussed');
  });

  it('both sides wanting it is not signing it', () => {
    const standing = whereItStands({ agreedBy: ['A', 'B'], signedAt: null, inForceFrom: from, inForceTo: null });
    expect(standing).toBe('agreed, not signed');
    expect(mayBeJudgedAgainst(standing)).toBe(false);
    expect(whyThisCannotGovern(standing)).toContain('still the one that was');
  });

  it('signed before its start date governs nothing yet', () => {
    const standing = whereItStands(
      { agreedBy: ['A', 'B'], signedAt: new Date('2026-05-01'), inForceFrom: from, inForceTo: null },
      new Date('2026-06-01'),
    );
    expect(standing).toBe('signed');
    expect(mayBeJudgedAgainst(standing)).toBe(false);
    expect(whyThisCannotGovern(standing)).toContain('start date has not arrived');
  });

  it('and governs from the day it starts', () => {
    const standing = whereItStands(
      { agreedBy: ['A', 'B'], signedAt: new Date('2026-05-01'), inForceFrom: from, inForceTo: null },
      new Date('2026-07-01'),
    );
    expect(standing).toBe('in force');
    expect(mayBeJudgedAgainst(standing)).toBe(true);
  });

  it('a replaced version still governs the period it covered', () => {
    const standing = whereItStands(
      { agreedBy: ['A', 'B'], signedAt: new Date('2026-01-01'), inForceFrom: new Date('2026-01-01'), inForceTo: new Date('2026-06-30') },
      new Date('2026-08-01'),
    );
    expect(standing).toBe('replaced');
    expect(mayBeJudgedAgainst(standing)).toBe(true);
  });

  it('standing is worked out from the facts, never read off a column', () => {
    /* A row saying "in force" while its start date is in December is a row
       somebody set by hand, and it will be believed. */
    const source = withoutComments('an-amendment-is-not-a-conversation.ts');
    const fn = source.slice(source.indexOf('export function whereItStands'));
    expect(fn.slice(0, fn.indexOf('\n}'))).toContain('signedAt');
    expect(fn.slice(0, fn.indexOf('\n}'))).toContain('inForceFrom');
  });

  it('and a meeting note may never change what the agreement permits', () => {
    expect(A_NOTE_IS_NOT_AN_AMENDMENT.toLowerCase()).toContain('a conversation is not a change');
    expect(A_NOTE_IS_NOT_AN_AMENDMENT.toLowerCase()).toContain('never write that the agreement now permits');
  });

  it('every standing reads as itself', () => {
    for (const s of ['discussed', 'agreed, not signed', 'signed', 'in force', 'replaced'] as Standing[]) {
      expect(howItStands(s, from).length).toBeGreaterThan(10);
    }
  });
});
