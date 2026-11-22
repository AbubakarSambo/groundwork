import { theReadBackFrom } from './the-read-back';
import { theAssessmentIn } from './the-assessment';
// The assessment Groundwork stored for Chidi's WhatsApp check-in in the channel test of 20 November 2026 (ids as they were).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CHIDI = require('./__fixtures__/chidi-whatsapp-20-november.json');

/**
 * WhatsApp test, 20 November 2026, C26. Chidi wrote "closed kilele 450k on tues, still chasing naivas PO", then "english pls. buyer said
 * friday, im on it with mercy in procurement". The record joined the second message into the item for the Naivas order (due friday, with
 * Mercy). The same words were also read as a work update, which was kept, and the blocker was dropped with Mercy and Friday in it, so the read-back quoted only "still chasing naivas PO", so Friday and Mercy were left out of what he was asked to check.
 *
 * Since 22 November the read-back is the assessment's own whole sentence for each item (`saidBack`, d4faab877 and 9381bdff2), not his
 * quoted words stitched to "which I recorded as" and the item's fields. The stored assessment of 20 November was read before that sentence
 * existed, so the sentences the assessment now writes for it are given here, put on every item with those words as the assessment puts them, and Friday and Mercy must be in the line he checks.
 */
const withTheSentences = (a: any) => {
  const said: Record<string, string> = {
    'closed kilele 450k on tues': 'You closed the Kilele deal for 450,000 on Tuesday.',
    'still chasing naivas PO': 'You are still chasing the Naivas purchase order, and Mercy in procurement at Naivas said it should come on Friday.',
    'half my Q4 number': 'You are aiming for a Q4 number of 2.4 million.',
  };
  const out: any = { ...a };
  for (const [k, v] of Object.entries(a)) {
    if (Array.isArray(v)) out[k] = v.map((i: any) => (i && said[i.words] ? { ...i, saidBack: said[i.words] } : i));
  }
  return out;
};

describe("Chidi's joined answer is in his read-back", () => {
  const said = theReadBackFrom(theAssessmentIn(withTheSentences(CHIDI)) as any)!.text;

  it('says Friday and Mercy with the line they were joined into, as Chidi reads it', () => {
    expect(said).toContain('You are still chasing the Naivas purchase order, and Mercy in procurement at Naivas said it should come on Friday.');
  });

  it('keeps every other line he gave, each a whole sentence, opens and closes as before, and quotes no fragment beside them', () => {
    expect(said.split('\n')).toEqual([
      'Here’s what I recorded.',
      'You closed the Kilele deal for 450,000 on Tuesday.',
      'You are still chasing the Naivas purchase order, and Mercy in procurement at Naivas said it should come on Friday.',
      'You are aiming for a Q4 number of 2.4 million.',
      'Is anything wrong? Tell me and I will put it right.',
    ]);
    expect(said).not.toMatch(/Juma|which I recorded as|You said “(?:1\.2m|friday)”/);
  });

  it('an assessment stored before the sentences existed is still read back, each item in his own words, a whole sentence', () => {
    const old = theReadBackFrom(theAssessmentIn(CHIDI) as any)!.text.split('\n');
    expect(old[0]).toBe('Here’s what I recorded.');
    expect(old).toContain('You said “still chasing naivas PO”.');
    expect(old[old.length - 1]).toBe('Is anything wrong? Tell me and I will put it right.');
  });
});
