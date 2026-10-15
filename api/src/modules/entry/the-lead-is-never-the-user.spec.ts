import { withoutTheUserLabel } from './the-lead-is-never-the-user';

describe('B-013: the setup card never calls the lead "the user"', () => {
  it('Baraka, after "Her manager is me"', () => {
    expect(withoutTheUserLabel({ whoInvolved: 'The user (her manager)', mode: 'NEW_HIRE' })).toEqual({ whoInvolved: 'You (her manager)', mode: 'NEW_HIRE' });
  });
  it('the verb agrees', () => {
    expect(withoutTheUserLabel('The user is her manager, and the user\'s team starts Monday.')).toBe('You are her manager, and your team starts Monday.');
  });
  it('a word that only contains it is left alone', () => {
    expect(withoutTheUserLabel('The users of the system')).toBe('The users of the system');
  });
});
