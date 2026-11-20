import { theReadBackFrom } from './the-read-back';
import { theAssessmentIn } from './the-assessment';
// The assessment Groundwork stored for Chidi's WhatsApp check-in in the channel test of 20 November 2026 (ids as they were).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CHIDI = require('./__fixtures__/chidi-whatsapp-20-november.json');

/**
 * WhatsApp test, 20 November 2026, C26. Chidi wrote "closed kilele 450k on tues, still chasing naivas PO", then "english pls. buyer said
 * friday, im on it with mercy in procurement". The record joined the second message into the item for the Naivas order (due friday, with
 * Mercy). The same words were also read as a work update, which was kept, and the blocker was dropped with Mercy and Friday in it, so the read-back quoted only "still chasing naivas PO", so Friday and Mercy were left out of what he was asked to check.
 */
describe("Chidi's joined answer is in his read-back", () => {
  const said = theReadBackFrom(theAssessmentIn(CHIDI) as any)!.text;

  it('says Friday and Mercy with the line they were joined into, as Chidi reads it', () => {
    expect(said).toContain('You said “still chasing naivas PO”, which I recorded as naivas purchase order, at chasing, 1.2m, and waiting for the Naivas purchase order, with Mercy in procurement at Naivas, due friday.');
  });

  it('keeps every other line he gave, each a whole sentence, and opens and closes as before', () => {
    expect(said.split('\n')).toEqual([
      'Here’s what I recorded.',
      'You said “closed kilele 450k on tues”.',
      'You said “still chasing naivas PO”, which I recorded as naivas purchase order, at chasing, 1.2m, and waiting for the Naivas purchase order, with Mercy in procurement at Naivas, due friday.',
      'You answered “1.2m”, which I recorded as 1200000, for Naivas deal value.',
      'You answered “friday”, which I recorded as friday, Naivas purchase order expected date.',
      'You said “half my Q4 number”.',
      'Is anything wrong? Tell me and I will put it right.',
    ]);
    expect(said).not.toMatch(/Juma/);
  });
});
