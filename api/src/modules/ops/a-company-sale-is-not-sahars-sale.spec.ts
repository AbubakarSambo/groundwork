/**
 * The rule this whole system exists to hold.
 *
 * Sahar owns Sales and Market Acquisition. If Hafsah originates a client and
 * Sahar then runs the entire sales process - follow-up, proposal, CRM,
 * onboarding - the client is still not Sahar's originated client and her
 * personal target receives nothing from it.
 *
 * That is not a judgement about her work. It is what origination means. And
 * there is deliberately no second category for the work she did instead,
 * because every "supported the sale" category exists so that somebody can claim
 * a piece of a deal for having been nearby, and each one makes the record less
 * true and the equity conversation it feeds less defensible.
 *
 * The worked example from the brief, as a test:
 *
 *   Nate creates strategic access. That relationship produces a qualified
 *   opportunity which Hafsah originates. Sahar handles the normal sales process.
 *
 *   Company revenue           YES
 *   Nate positioning          YES
 *   Hafsah origination        YES
 *   Sahar personal origination NO
 */
import {
  countsAsOriginationFor,
  countsAsPositioningFor,
  attributionIsOpen,
  isBothRolesOnOneDeal,
  whyNoCredit,
  isQualified,
} from './only-the-originator-gets-origination';

const NATE = 'nate';
const HAFSAH = 'hafsah';
const SAHAR = 'sahar';

/** The example, exactly. */
const theWorkedExample = {
  positioningSourceId: NATE,
  positioningState: 'APPROVED' as const,
  opportunityOriginatorId: HAFSAH,
  originatorState: 'APPROVED' as const,
  stage: 'PAYING' as const,
};

describe('the worked example from the brief', () => {
  it('credits Nate with the positioning', () => {
    expect(countsAsPositioningFor(theWorkedExample, NATE)).toBe(true);
  });

  it('credits Hafsah with the origination', () => {
    expect(countsAsOriginationFor(theWorkedExample, HAFSAH)).toBe(true);
  });

  it('and credits Sahar with NOTHING, however much of the process she ran', () => {
    expect(countsAsOriginationFor(theWorkedExample, SAHAR)).toBe(false);
    expect(countsAsPositioningFor(theWorkedExample, SAHAR)).toBe(false);
  });

  it('and Nate does not get origination for having opened the door', () => {
    expect(countsAsOriginationFor(theWorkedExample, NATE)).toBe(false);
  });

  it('and Hafsah does not get positioning for having generated the opportunity', () => {
    expect(countsAsPositioningFor(theWorkedExample, HAFSAH)).toBe(false);
  });
});

describe('what is deliberately not an input', () => {
  /**
   * None of these appears anywhere in the credit rule, and each is a way people
   * have historically ended up with credit for a deal somebody else created.
   */
  it('owning the sales function does not create attribution', () => {
    const source = readFileSync(join(__dirname, 'only-the-originator-gets-origination.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    for (const notAnInput of ['salesOwnerId', 'nextActionOwnerId', 'createdById', 'functionOwner']) {
      expect(source).not.toContain(notAnInput);
    }
  });

  it('and there is no third contribution role to claim', () => {
    const roles = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8');
    const block = roles.match(/enum OpsContributionRole \{([\s\S]*?)\}/)![1];
    const values = block.split('\n').map((l) => l.trim()).filter((l) => /^[A-Z_]+$/.test(l));
    expect(values).toEqual(['POSITIONING_SOURCE', 'OPPORTUNITY_ORIGINATOR']);
  });
});

describe('an unapproved claim is not evidence', () => {
  it.each(['NEEDS_REVIEW', 'CLAIMED', 'REJECTED'] as const)('credits nothing while %s', (state) => {
    expect(countsAsOriginationFor({ ...theWorkedExample, originatorState: state }, HAFSAH)).toBe(false);
  });

  it('and rejecting one role leaves the other role alone', () => {
    /**
     * THE BUG THIS SPLIT EXISTS FOR, found by running the worked example rather
     * than reading it.
     *
     * One shared attribution state meant that rejecting Sahar's claim to have
     * originated the deal - the correct decision - set the field back to
     * NEEDS_REVIEW and silently took away Nate's approved positioning AND
     * Hafsah's approved origination on the same opportunity. Every write was
     * correct on its own; only the sequence was wrong, and only the ledgers
     * showed it, as four rows of zeroes.
     */
    const sahasClaimRejected = { ...theWorkedExample, originatorState: 'NEEDS_REVIEW' as const };
    expect(countsAsPositioningFor(sahasClaimRejected, NATE)).toBe(true);
  });

  it('and says which of those it is, rather than leaving a blank', () => {
    /* "No credit" and "nobody has looked at this yet" are different facts, and
       a contributor reading their own ledger deserves to know which. */
    expect(whyNoCredit({ ...theWorkedExample, originatorState: 'NEEDS_REVIEW' })).toMatch(/confirm who created it/);
    expect(whyNoCredit({ ...theWorkedExample, originatorState: 'CLAIMED' })).toMatch(/not yet approved/);
    expect(whyNoCredit({ ...theWorkedExample, originatorState: 'REJECTED' })).toMatch(/not accepted/);
    expect(whyNoCredit(theWorkedExample)).toBeNull();
  });

  it('and an opportunity nobody has attributed says so plainly', () => {
    const orphan = { ...theWorkedExample, opportunityOriginatorId: null, originatorState: 'NEEDS_REVIEW' as const };
    expect(whyNoCredit(orphan)).toMatch(/not credited to anyone until somebody says who did/);
  });
});

describe('attribution locks when a deal becomes worth claiming', () => {
  it('is open while it is only a lead', () => {
    expect(attributionIsOpen({ stage: 'LEAD', originatorState: 'NEEDS_REVIEW', positioningState: 'NEEDS_REVIEW' })).toBe(true);
  });

  it('and closes at qualified, which is the point somebody would want to claim it', () => {
    expect(attributionIsOpen({ stage: 'QUALIFIED', originatorState: 'NEEDS_REVIEW', positioningState: 'NEEDS_REVIEW' })).toBe(false);
  });

  it('and stays closed all the way through paying and retention', () => {
    for (const stage of ['PROPOSAL', 'VERBAL_YES', 'PAYING', 'RETAINED_6_MONTH'] as const) {
      expect(isQualified(stage)).toBe(true);
      expect(attributionIsOpen({ stage, originatorState: 'CLAIMED', positioningState: 'CLAIMED' })).toBe(false);
    }
  });

  it('and an approved attribution is closed even on a lead', () => {
    expect(
      attributionIsOpen({ stage: 'LEAD', originatorState: 'APPROVED', positioningState: 'APPROVED' }),
    ).toBe(false);
  });
});

describe('one person doing both things', () => {
  it('is recorded, because both are true', () => {
    const both = { ...theWorkedExample, positioningSourceId: HAFSAH };
    expect(isBothRolesOnOneDeal(both)).toBe(true);
    expect(countsAsOriginationFor(both, HAFSAH)).toBe(true);
    expect(countsAsPositioningFor(both, HAFSAH)).toBe(true);
  });

  it('but the two are reported apart, so the deal is never counted twice in one total', () => {
    /**
     * Somebody who opened the door and generated the opportunity did two
     * things. Adding both into one origination figure would overstate exactly
     * what this system exists to measure honestly, so positioning is reported
     * separately everywhere and this flag is what lets a reader see the overlap.
     */
    expect(isBothRolesOnOneDeal(theWorkedExample)).toBe(false);
  });
});

import { readFileSync } from 'fs';
import { join } from 'path';
