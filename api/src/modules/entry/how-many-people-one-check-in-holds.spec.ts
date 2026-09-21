import { HOW_MANY_PEOPLE_ONE_CHECK_IN_HOLDS, tooManyPeopleFor } from './how-many-people-one-check-in-holds';
import * as fs from 'fs';
import * as path from 'path';

/**
 * A DISCOVERY SESSION WITH TWENTY-FOUR PEOPLE WAS REFUSED BY A LITERAL.
 *
 * "Contributor count exceeds the limit of 20 per check-in." Meanwhile the labelling rule is written
 * for forty and the request body already took forty names. Splitting twenty-four people into two
 * check-ins does not split the work; it splits the cross-reference, which was the whole point.
 */
describe('how many people one check-in holds', () => {
  it('holds the number the labels and the body were already built for', () => {
    /* A pulse check is a whole organisation: a hundred and fifty people is a hundred and fifty. */
    expect(HOW_MANY_PEOPLE_ONE_CHECK_IN_HOLDS).toBe(200);
    expect(tooManyPeopleFor(24)).toBeNull();
    expect(tooManyPeopleFor(150)).toBeNull();
  });

  it('and says what to do when there really are too many', () => {
    expect(tooManyPeopleFor(201)).toContain('One check-in holds 200 people');
    expect(tooManyPeopleFor(201)).toContain('Run it as two check-ins');
  });

  /* Two copies of a limit is how a body accepts what a gate refuses. */
  it('is the only number either side reads', () => {
    const src = (p: string) => fs.readFileSync(path.join(__dirname, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src('entry.service.ts')).toContain('tooManyPeopleFor(dto.contributors.length)');
    expect(src('entry.service.ts')).not.toContain('contributors.length > 20');
    expect(src('entry.controller.ts')).toContain('@ArrayMaxSize(HOW_MANY_PEOPLE_ONE_CHECK_IN_HOLDS)');
  });
});
