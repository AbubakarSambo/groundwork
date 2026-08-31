import { PartyType } from '@prisma/client';
import { namesVisibleTo, viewerLabelOf, withNames } from './party-labels';

/**
 * "I FIND IT REFERS TO ME AS HAFSAH JUMARE, INSTEAD OF 'YOU'." Hafsah, reading her own report.
 *
 * The observed line, from a live participant report:
 *
 *   "Hafsah Jumare described their role as building a new MVP for the amana market product"
 *
 * About herself. In the third person. With a pronoun that is not hers.
 *
 * `namesVisibleTo` already computed `isSelf` and then discarded it, mapping the reader's own label
 * to their own name exactly like everybody else's. The reader was never distinguished from the
 * people being described to them.
 *
 * WHY THE PROMPT CANNOT FIX THIS. One report is generated in labels and then rendered per reader,
 * each with their own name substitutions. At generation time there is no reader to address, so
 * "write in second person" has nobody to write to. The substitution layer is the only place that
 * knows who is reading.
 */
const parties = [
  { id: 'lead', partyType: PartyType.INITIATOR, roleAsDescribed: 'programme lead', user: { firstName: 'Amara', lastName: 'Obi' } },
  { id: 'me', partyType: PartyType.PARTICIPANT, roleAsDescribed: 'sales lead', user: { firstName: 'Hafsah', lastName: 'Jumare' } },
] as any[];

const render = (text: string, viewerId: string) =>
  withNames(text, namesVisibleTo(viewerId, parties), undefined, { viewerLabel: viewerLabelOf(viewerId, parties) });

describe('the reader is addressed, not described', () => {
  it('the exact line from the live report', () => {
    const out = render('The sales lead described their role as building a new MVP.', 'me');
    expect(out).toBe('You described your role as building a new MVP.');
    expect(out).not.toContain('Hafsah');
  });

  it('a possessive becomes "your", never "you-apostrophe-s"', () => {
    expect(render("The sales lead's account is on record.", 'me')).toBe('Your account is on record.');
  });

  it('and the bare label becomes "you"', () => {
    expect(render('The sales lead has not checked in.', 'me')).toBe('You has not checked in.');
  });

  it('OTHER people keep their names, so the report is still about somebody', () => {
    /** The control. Turning every label into "you" would make the report unreadable. */
    const out = render('The programme lead disagreed with the sales lead.', 'me');
    expect(out).toContain('Amara Obi');
    expect(out).toContain('you');
  });

  it('and a reader who is NOT this party still sees the name', () => {
    /** The same sentence, read by the lead, must name her. */
    const out = render('The sales lead described their role as building a new MVP.', 'lead');
    expect(out).toContain('Hafsah Jumare');
    expect(out).not.toMatch(/\byou\b/i);
  });
});

describe('the pronoun rule is narrow on purpose', () => {
  it('rewrites "their" only after a reporting verb', () => {
    expect(render('The sales lead said their target was 400k.', 'me')).toBe('You said your target was 400k.');
  });

  it('and leaves a third party pronoun alone', () => {
    /**
     * THE OVER-REACH THIS AVOIDS, and my first version of this test did not catch it.
     *
     * It used "escalated", which ends in -ed and so matched the original `\w+ed` pattern either
     * way - so broadening the rule changed nothing and the test passed on both. "Emailed" is the
     * real case: the manager is somebody else's, the sentence is already correct, and only an
     * explicit list of accounting verbs leaves it alone.
     */
    const out = render('The sales lead emailed their manager.', 'me');
    expect(out).toContain('their manager');
    expect(out).not.toContain('your manager');
  });

  it('a viewer with no label changes nothing', () => {
    /** A reader who is not a party at all must not have the text rewritten around them. */
    const text = 'The sales lead described their role.';
    expect(withNames(text, namesVisibleTo(null, parties), undefined, { viewerLabel: null })).toContain('their role');
  });
});
