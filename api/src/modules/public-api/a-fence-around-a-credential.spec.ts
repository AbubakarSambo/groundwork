import { isFenced, mayTouch, mayReadGround, OUTSIDE_THE_FENCE } from './a-fence-around-a-credential';

const open = { boundToPersonExternalIds: [] };
const sales = { boundToPersonExternalIds: ['lv-sahar', 'lv-onboarder'] };

describe('an empty fence means the whole organisation', () => {
  it('because every credential issued before fences existed means that', () => {
    /*
     * The only safe default. Treating empty as "nothing" would lock every working integration out on
     * the day this deployed - an outage for every existing user, to add an opt-in feature.
     */
    expect(isFenced(open)).toBe(false);
    expect(mayTouch(open, 'anybody')).toBe(true);
    expect(mayReadGround(open, ['a', 'b'])).toBe(true);
    expect(mayTouch(null, 'anybody')).toBe(true);
  });
});

describe('a fenced credential', () => {
  it('reaches the people it names and nobody else', () => {
    expect(mayTouch(sales, 'lv-sahar')).toBe(true);
    expect(mayTouch(sales, 'lv-abu')).toBe(false);
  });

  it('and refuses when there is no name to check', () => {
    /* No partial answers. A fence that sometimes lets an unnamed thing through is worse than none,
       because nobody can reason about it. */
    expect(mayTouch(sales, null)).toBe(false);
    expect(mayTouch(sales, undefined)).toBe(false);
  });
});

describe('a check-in needs EVERY party inside the fence', () => {
  it('not any', () => {
    /*
     * A report is the synthesis of what several people independently said. Reading one about a
     * check-in containing somebody outside the fence hands over their account through a credential
     * never allowed near them.
     */
    expect(mayReadGround(sales, ['lv-sahar', 'lv-onboarder'])).toBe(true);
    expect(mayReadGround(sales, ['lv-sahar', 'lv-abu'])).toBe(false);
  });

  it('and a check-in with nobody identifiable is refused, not allowed', () => {
    /* Unmatchable participants are a data problem. Failing open on one would make the fence
       bypassable by anybody whose directory record is incomplete. */
    expect(mayReadGround(sales, [])).toBe(false);
    expect(mayReadGround(sales, ['lv-sahar', null])).toBe(false);
  });
});

describe('what a developer is told', () => {
  it('that the boundary is deliberate, not that their credential is broken', () => {
    expect(OUTSIDE_THE_FENCE).toMatch(/Nothing is wrong with the credential/);
    expect(OUTSIDE_THE_FENCE).toMatch(/issued with a boundary on purpose/);
  });
});
