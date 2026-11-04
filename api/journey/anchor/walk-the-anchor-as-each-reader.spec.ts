import { theBody, theToken, stopOnARefusal } from './walk-the-anchor-as-each-reader';
import { whatIsWrongForThisReader } from '../../src/modules/board/the-anchor-readers';

/** The walker reads what the API really answers: everything inside `{ success, data }`. */
describe('the anchor walker reads the API as it answers', () => {
  it('takes the token from inside data, as the API sends it', () => {
    expect(theToken({ success: true, data: { accessToken: 'tok', user: {} } })).toBe('tok');
  });

  it('stops when there is no token, rather than reading every board as nobody', () => {
    expect(() => theToken({ success: true, data: {} })).toThrow('The sign-in answer has no access token');
  });

  it('reads the board from inside data, so its rules see the board and not the wrapper', () => {
    const wrapped = { success: true, data: { theMonthBoard: {} } };
    expect(whatIsWrongForThisReader('a person in it', wrapped)).toEqual([]);
    expect(whatIsWrongForThisReader('a person in it', theBody(wrapped))).not.toEqual([]);
  });

  it('stops loudly on a 401 or a 429, and lets anything else be counted', () => {
    expect(() => stopOnARefusal(401, 'Rukia reading the live board')).toThrow('Rukia reading the live board was refused as not signed in (401)');
    expect(() => stopOnARefusal(429, 'Amani signing in')).toThrow('Amani signing in was refused for too many requests (429)');
    expect(() => stopOnARefusal(403, 'Grace reading the live board')).not.toThrow();
    expect(() => stopOnARefusal(200, 'Rukia reading the live board')).not.toThrow();
  });
});
