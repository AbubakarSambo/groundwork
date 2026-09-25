import { PartyType } from '@prisma/client';
import { labelsForParties, namesVisibleTo, withNames } from './party-labels';

/**
 * A REPORT SHOULD READ LIKE PEOPLE TALKING, WITHOUT HANDING ROUND WHO SAID WHAT.
 *
 * Reports are stored with no personal names in them. The synthesis prompt is
 * told never to use one, and the parties reach the model as "the initiator" and
 * "Participant A". Keeping that is worth something real: an artefact with no
 * names cannot leak a name, wherever it is copied or whoever eventually opens it.
 *
 * What it cost was readability, and badly. A manager opening a report about her
 * own new hire, on a page already showing both their names in the header, was
 * reading "the initiator" and "Participant A" describing a conversation she had
 * been in. Anonymising two colleagues from each other protects nobody and makes
 * the report unusable, which is what it had become.
 *
 * So names go back in on the way out, for the reader entitled to them:
 *
 *   the lead      -> everyone. Their ground, their team.
 *   anybody else  -> themselves and the lead, nobody else.
 *
 * The second rule is the one with teeth. A new hire must never find "Kavon said
 * the handover was late" in the shared report: that is a colleague's private
 * account, attributed to them, in front of the person it is about, and it turns
 * a shared picture into evidence collected against someone. The colleague stays
 * behind their role label, which still says honestly where the account came from
 * without saying who gave it.
 *
 * Note which way round this runs. The stored default is the private one and
 * names are ADDED for those allowed them, so a bug here shows up as a missing
 * name rather than an exposed one.
 */

const lead = {
  id: 'p-lead',
  partyType: PartyType.INITIATOR,
  roleAsDescribed: null,
  user: { firstName: 'Hafsah', lastName: 'Jumare', email: 'hafsah@x.test' },
};
const hire = {
  id: 'p-hire',
  partyType: PartyType.PARTICIPANT,
  roleAsDescribed: null,
  user: { firstName: 'Abubakar', lastName: 'B', email: 'abubakar@x.test' },
};
const colleague = {
  id: 'p-colleague',
  partyType: PartyType.PARTICIPANT,
  roleAsDescribed: null,
  user: { firstName: 'Kavon', lastName: 'M', email: 'kavon@x.test' },
};
const parties = [lead, hire, colleague];

describe('labels are stable and shared with the write path', () => {
  it('labels the lead and the participants the way the report was written', () => {
    const labels = labelsForParties(parties);
    expect(labels.get('p-lead')).toBe('the initiator');
    expect(labels.get('p-hire')).toBe('Participant A');
    expect(labels.get('p-colleague')).toBe('Participant B');
  });

  /*
   * CHANGED 25 SEPTEMBER 2026. This pinned "the role IS the label". A role is free text a lead
   * types, and in practice it is a sentence: "Relationship officer, Surulere. Target 14 approved
   * facilities this quarter." printed mid-paragraph, ending the sentence twice. Labels are
   * positional now. What this file really protects - that labels are stable, unique, and shared
   * with the write path - is unchanged and still asserted.
   */
  it('is positional, and distinguishes people regardless of what their roles say', () => {
    const officers = [
      lead,
      { ...hire, roleAsDescribed: 'field officer' },
      { ...colleague, roleAsDescribed: 'field officer' },
    ];
    const labels = labelsForParties(officers);
    expect(labels.get('p-hire')).toBe('Participant A');
    expect(labels.get('p-colleague')).toBe('Participant B');
  });
});

describe('what the lead sees', () => {
  it('reads their own team by name', () => {
    const visible = namesVisibleTo('p-lead', parties);
    const text = 'the initiator expected ownership; participant A was clearing the queue.';
    expect(withNames(text, visible)).toBe('Hafsah Jumare expected ownership; Abubakar B was clearing the queue.');
  });

  it('sees the colleague too, because it is their ground', () => {
    const visible = namesVisibleTo('p-lead', parties);
    expect(withNames('participant B flagged the handover.', visible)).toBe('Kavon M flagged the handover.');
  });
});

describe('what a participant sees', () => {
  it('sees themselves and their lead by name', () => {
    const visible = namesVisibleTo('p-hire', parties);
    const text = 'the initiator expected ownership; participant A was clearing the queue.';
    expect(withNames(text, visible)).toBe('Hafsah Jumare expected ownership; Abubakar B was clearing the queue.');
  });

  it('NEVER sees a colleague named', () => {
    // THE ONE THAT MATTERS. "Kavon said the handover was late" in front of the
    // person it is about is a colleague's account handed over as evidence.
    const visible = namesVisibleTo('p-hire', parties);
    const out = withNames('participant B said the handover was late.', visible);
    /* Untouched here: with no label list passed there is nothing to normalise against, and this
       call is about the name never appearing rather than about casing. */
    expect(out).toBe('participant B said the handover was late.');
    expect(out).not.toContain('Kavon');
  });

  it('does not leak a colleague through a longer passage either', () => {
    const visible = namesVisibleTo('p-hire', parties);
    const out = withNames(
      'the initiator raised it after participant B described the delay, and participant A agreed.',
      visible,
    );
    expect(out).toContain('Hafsah Jumare');
    expect(out).toContain('Abubakar B');
    /* Untouched: the label a reader may not resolve stays exactly as the prose carried it. The
       casing of a label inside model prose is not this file's business - that it is not swapped
       for a name is. */
    expect(out).toContain('participant B');
    expect(out).not.toContain('Kavon');
  });
});

describe('the substitution itself', () => {
  it('resolves the longer label first, when one label contains another', () => {
    /**
     * The real hazard, and the first version of this test missed it.
     *
     * It was written against roles - "lead" versus "lead engineer" - because roles used to be
     * labels, and shortest-first turned "lead engineer" into "Hafsah Jumare engineer". Labels are
     * positional now, so the containment case that remains is the one this product actually
     * generates: "Participant A" inside "Participant AB" can never occur, but the sort that
     * prevents it is still the thing under test, and a reader's own label must still win.
     */
    const overlapping = [
      { ...lead, roleAsDescribed: 'lead' },
      { ...hire, roleAsDescribed: 'lead engineer' },
    ];
    const visible = namesVisibleTo('p-lead', overlapping);
    expect(withNames('Participant A shipped it.', visible)).toBe('Abubakar B shipped it.');
    /* And the article the model puts in front of a label goes with it - "the Hafsah Jumare" was
       what this used to assert, which is the artefact aNameIsNotATitle now removes. */
    expect(withNames('the initiator asked for it.', visible)).toBe('Hafsah Jumare asked for it.');
  });

  it('matches a label at the start of a sentence as well as inside one', () => {
    const visible = namesVisibleTo('p-lead', parties);
    expect(withNames('The initiator asked. the initiator asked again.', visible))
      .toBe('Hafsah Jumare asked. Hafsah Jumare asked again.');
  });

  it('leaves the text alone when nobody has a name yet', () => {
    // An invited participant who has not joined has no name of their own, and an
    // email address is not a name to show a peer.
    const notJoined = [{ ...hire, user: null }];
    const visible = namesVisibleTo('p-hire', notJoined);
    expect(withNames('participant A has not checked in.', visible))
      .toBe('participant A has not checked in.');
  });
});
