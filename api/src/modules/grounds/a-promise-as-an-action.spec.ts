import { asAnAction } from './a-promise-as-an-action';

/** What My work read in polish round 1 (Aisha and Mercy, 15 October 2026), and what it reads now. */
describe('a promise read back as a to-do', () => {
  it('"I\'ll be calling" is their own sentence, never "Be calling"', () => {
    expect(asAnAction("I'll be calling the HR manager tomorrow to follow up.")).toBe('You will be calling the HR manager tomorrow to follow up.');
    expect(asAnAction("I'll be arranging that call myself tomorrow morning")).toBe('You will be arranging that call yourself tomorrow morning');
  });
  it('"I need to" is cut like "I will"', () => {
    expect(asAnAction('I need to call Mrs. Achola')).toBe('Call Mrs. Achola');
  });
  it('an ordinary promise reads as an action, as before', () => {
    expect(asAnAction('I will file the bundle')).toBe('File the bundle');
    expect(asAnAction("I'll call her back")).toBe('Call her back');
  });
});
