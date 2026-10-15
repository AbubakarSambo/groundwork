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
/*
 * THE LABELS IN THESE FIXTURES CHANGED ON 25 SEPTEMBER 2026, and the text with them.
 *
 * A label used to be the person's role, so the stored prose said "Participant A described...". A
 * role is free text a lead types and turned out to be a whole sentence in practice, which ended the
 * surrounding sentence twice and could never be matched for substitution. Labels are positional
 * now, so stored prose says "Participant A" and "the initiator" - and the substitution this file
 * tests is the same substitution, on the strings the product actually writes today.
 */
const parties = [
  { id: 'lead', partyType: PartyType.INITIATOR, roleAsDescribed: 'programme lead', user: { firstName: 'Amara', lastName: 'Obi' } },
  { id: 'me', partyType: PartyType.PARTICIPANT, roleAsDescribed: 'sales lead', user: { firstName: 'Hafsah', lastName: 'Jumare' } },
] as any[];

const render = (text: string, viewerId: string) =>
  withNames(text, namesVisibleTo(viewerId, parties), undefined, { viewerLabel: viewerLabelOf(viewerId, parties) });

describe('the reader is addressed, not described', () => {
  it('the exact line from the live report', () => {
    const out = render('Participant A described their role as building a new MVP.', 'me');
    expect(out).toBe('You described your role as building a new MVP.');
    expect(out).not.toContain('Hafsah');
  });

  it('a possessive becomes "your", never "you-apostrophe-s"', () => {
    expect(render("Participant A's account is on record.", 'me')).toBe('Your account is on record.');
  });

  it('and the bare label becomes "you"', () => {
    /* "You has" was what this asserted, which is the bug rather than the behaviour: a label
       swapped for "you" left the third-person conjugation behind, and a live report read "You is
       concerned this sign-off will drift". The verb agrees now. */
    expect(render('Participant A has not checked in.', 'me')).toBe('You have not checked in.');
  });

  it('OTHER people keep their names, so the report is still about somebody', () => {
    /** The control. Turning every label into "you" would make the report unreadable. */
    const out = render('The initiator disagreed with Participant A.', 'me');
    expect(out).toContain('Amara Obi');
    expect(out).toContain('you');
  });

  it('and a reader who is NOT this party still sees the name', () => {
    /** The same sentence, read by the lead, must name her. */
    const out = render('Participant A described their role as building a new MVP.', 'lead');
    expect(out).toContain('Hafsah Jumare');
    expect(out).not.toMatch(/\byou\b/i);
  });
});

describe('the pronoun rule is narrow on purpose', () => {
  it('rewrites "their" only after a reporting verb', () => {
    expect(render('Participant A said their target was 400k.', 'me')).toBe('You said your target was 400k.');
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
    const out = render('Participant A emailed their manager.', 'me');
    expect(out).toContain('their manager');
    expect(out).not.toContain('your manager');
  });

  it('a viewer with no label changes nothing', () => {
    /** A reader who is not a party at all must not have the text rewritten around them. */
    const text = 'Participant A described their role.';
    expect(withNames(text, namesVisibleTo(null, parties), undefined, { viewerLabel: null })).toContain('their role');
  });
});

/**
 * AND THE VERB AGREES.
 *
 * One report is generated in labels and rendered per reader, so the model writes about everybody in
 * the third person and the substitution leaves the conjugation behind. Found in a live report a
 * moment after the document work was driven: "You is concerned this sign-off will drift" and "You
 * referenced an offer letter" in the same paragraph. The first reads as broken software, on the one
 * screen whose whole claim is that it holds what people said carefully.
 */
describe('the verb agrees with "you"', () => {
  it('fixes the four irregulars', () => {
    expect(render('Participant A is concerned about sign-off.', 'me')).toBe('You are concerned about sign-off.');
    expect(render('Participant A was clear about the date.', 'me')).toBe('You were clear about the date.');
    expect(render('Participant A has the plan.', 'me')).toBe('You have the plan.');
    expect(render('Participant A does the weekly review.', 'me')).toBe('You do the weekly review.');
  });

  it('and the reporting verbs a record of this kind uses', () => {
    expect(render('Participant A describes the handover as unfinished.', 'me'))
      .toBe('You describe the handover as unfinished.');
    expect(render('Participant A expects the board by week four.', 'me'))
      .toBe('You expect the board by week four.');
    expect(render('Participant A seems unsure who signs off.', 'me'))
      .toBe('You seem unsure who signs off.');
  });

  it('mid-sentence as well as at the start', () => {
    expect(render('On the timeline, Participant A is clear.', 'me')).toBe('On the timeline, you are clear.');
  });

  it('leaves another party\'s verb alone, because it is correct', () => {
    /* Only the READER becomes "you". Everybody else stays in the third person and their
       conjugation was never wrong. */
    const out = render('The engineer is concerned and Participant A is not.', 'me');
    expect(out).toContain('The engineer is concerned');
    expect(out).toContain('you are not');
  });

  it('and does not touch a possessive, which the rule above already handled', () => {
    expect(render("Participant A's account is thin.", 'me')).toBe('Your account is thin.');
  });
});
