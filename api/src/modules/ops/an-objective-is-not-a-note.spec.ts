/**
 * "OBJECTIVE SETTING DOESN'T SEEM TO ALIGN SALES AND PRODUCT, DOES NOT HAVE A
 * TIME PERIOD, AND DOES NOT HAVE WHO WE TIE IT TO. AN OBJECTIVE HAS TO HAVE AN
 * OWNER."
 *
 * The form asked for a title, an area and a sentence. That is a note.
 *
 * The owner is the sharpest of the four, because it was not missing from the
 * schema — `OpsObjective.ownerId` and `OpsKeyResult.ownerId` both existed and
 * neither was asked for, so both silently took whoever opened the form. An
 * objective owned by the person who happened to type it is owned by nobody, and
 * nothing on any board would have shown that.
 */
import {
  doesThePipelineAgree,
  howMuchIsAimedAtScale,
  whatItClaims,
  whyThisIsNotAnObjective,
} from './an-objective-is-not-a-note';

const COMPLETE = {
  title: 'Ten companies running a check-in a fortnight',
  ownerKey: 'sahar',
  serves: 'SALES' as const,
  justification: 'Nothing else proves the product before we ask anybody to pay for it.',
  instead: 'the partner channel',
};

describe('what an objective has to say', () => {
  it('is complete when all of it is there', () => {
    expect(whyThisIsNotAnObjective(COMPLETE)).toBeNull();
  });

  it('needs an owner, chosen rather than inherited', () => {
    expect(whyThisIsNotAnObjective({ ...COMPLETE, ownerKey: '' })).toMatch(/owned by nobody/);
  });

  it('needs to say what it buys', () => {
    expect(whyThisIsNotAnObjective({ ...COMPLETE, serves: null })).toMatch(/sales, the moat/);
  });

  it('needs a justification, not a word', () => {
    expect(whyThisIsNotAnObjective({ ...COMPLETE, justification: 'Growth' })).toMatch(/argue with in November/);
  });

  it('needs what it is instead of, which is the whole conveyor belt', () => {
    /* "Why is this the best use of time" cannot be answered in the abstract —
       only against the thing not being done. Nobody writes it unless asked. */
    expect(whyThisIsNotAnObjective({ ...COMPLETE, instead: '' })).toMatch(/cannot be answered in the abstract/);
  });

  it('takes both halves of the sales arithmetic or neither', () => {
    expect(whyThisIsNotAnObjective({ ...COMPLETE, companiesExpected: 8 })).toMatch(/or neither/);
    expect(whyThisIsNotAnObjective({ ...COMPLETE, valuePerCompanyCents: 1500000 })).toMatch(/or neither/);
    expect(
      whyThisIsNotAnObjective({ ...COMPLETE, companiesExpected: 8, valuePerCompanyCents: 1500000 }),
    ).toBeNull();
  });
});

describe('what it claims, in money', () => {
  it('is the two numbers multiplied', () => {
    expect(whatItClaims({ companiesExpected: 8, valuePerCompanyCents: 1500000 })).toBe(12000000);
  });

  it('is nothing when no claim was made', () => {
    expect(whatItClaims(COMPLETE)).toBeNull();
  });
});

describe('whether the pipeline agrees', () => {
  it('says nothing when it does', () => {
    expect(
      doesThePipelineAgree({ claimedCents: 500000, claimedCompanies: 2, pipelineCents: 900000, pipelineCompanies: 5 }),
    ).toBeNull();
  });

  it('names both gaps when the claim outruns it', () => {
    const said = doesThePipelineAgree({
      claimedCents: 12000000,
      claimedCompanies: 8,
      pipelineCents: 2000000,
      pipelineCompanies: 3,
    })!;
    expect(said).toMatch(/8 companies against 3 in the pipeline/);
    expect(said).toMatch(/\$120,000 against \$20,000/);
  });

  it('says it may be the target rather than a mistake, because it might be', () => {
    /* Which one it is belongs to the person who set it. It should not be
       possible to hold both quietly. */
    const said = doesThePipelineAgree({
      claimedCents: 12000000,
      claimedCompanies: 8,
      pipelineCents: 0,
      pipelineCompanies: 0,
    })!;
    expect(said).toMatch(/may be the target rather than a mistake/);
  });

  it('says nothing about an objective that made no claim', () => {
    expect(
      doesThePipelineAgree({ claimedCents: null, claimedCompanies: null, pipelineCents: 0, pipelineCompanies: 0 }),
    ).toBeNull();
  });
});

describe('how much of a quarter is aimed at scale', () => {
  it('is a split, never a score', () => {
    const aim = howMuchIsAimedAtScale([
      { serves: 'SALES' },
      { serves: 'MOAT' },
      { serves: 'KEEPING_IT_UP' },
      { serves: null },
    ]);
    expect(aim).toMatchObject({ atScale: 2, somethingElse: 1, saidNothing: 1, of: 4 });
    expect(aim.says).toBe('2 of 4 aimed at revenue or the moat. 1 said nothing.');
  });

  it('does not mention the silent ones when there are none', () => {
    expect(howMuchIsAimedAtScale([{ serves: 'MOAT' }]).says).toBe('1 of 1 aimed at revenue or the moat.');
  });

  it('says so plainly when nothing is set', () => {
    expect(howMuchIsAimedAtScale([]).says).toMatch(/Nothing is set/);
  });
});
