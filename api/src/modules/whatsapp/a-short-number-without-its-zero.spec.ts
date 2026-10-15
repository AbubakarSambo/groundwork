import { tidyANumber, WRITE_THE_FULL_NUMBER } from './a-number-whatsapp-can-reach';

/** Found on the test bed, 10 October 2026: "722000114" was kept as "+722000114", a number no phone has. */
describe('a short number with no plus and no leading 0', () => {
  it('is a local number written without its 0 when the organisation\'s country is known', () => {
    expect(tidyANumber('722000114', '254')).toEqual({ number: '+254722000114' });
  });
  it('is not taken twice when it already starts with the country code', () => {
    expect(tidyANumber('254722000114', '254')).toEqual({ number: '+254722000114' });
  });
  it('is refused with a plain sentence when no country is known', () => {
    expect(tidyANumber('722000114')).toEqual({ refused: WRITE_THE_FULL_NUMBER });
  });
  it('WhatsApp\'s own long form is untouched', () => {
    expect(tidyANumber('2348012345678')).toEqual({ number: '+2348012345678' });
  });
});
