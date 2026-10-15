import { theAdminReadsSaid } from './a-review-appeal';

/**
 * Release check, 9 October: Peter decided Fatuma's appeal and then read, about himself, "Peter, an admin, read the appeal and changed
 * the decision." The reader is "you".
 */
describe('the admin who decided an appeal reads it as "you"', () => {
  it('says "You read the appeal" to the admin who decided it', () => {
    expect(theAdminReadsSaid('decided', 'Fatuma', 'Grace', '8 October', 'Peter', 'changed', true))
      .toBe('Fatuma appealed the decision on 8 October. You read the appeal and changed the decision.');
    expect(theAdminReadsSaid('decided', 'Fatuma', 'Grace', '8 October', 'Peter', 'stands', true))
      .toBe('Fatuma appealed the decision on 8 October. You read the appeal, and the decision stands.');
  });
  it('names the admin who decided it to every other admin', () => {
    expect(theAdminReadsSaid('decided', 'Fatuma', 'Grace', '8 October', 'Peter', 'changed'))
      .toBe('Fatuma appealed the decision on 8 October. Peter, an admin, read the appeal and changed the decision.');
  });
});
