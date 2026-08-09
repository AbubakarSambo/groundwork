import { PartyType } from '@prisma/client';
import { labelsForParties, namesVisibleTo, withNames } from './party-labels';

/**
 * A REPORT SHOULD READ LIKE PEOPLE TALKING, WITHOUT HANDING ROUND WHO SAID WHAT.
 *
 * Reports are stored with no personal names in them. The synthesis prompt is
 * told never to use one, and the parties reach the model as "the initiator" and
 * "participant A". Keeping that is worth something real: an artefact with no
 * names cannot leak a name, wherever it is copied or whoever eventually opens it.
 *
 * What it cost was readability, and badly. A manager opening a report about her
 * own new hire, on a page already showing both their names in the header, was
 * reading "the initiator" and "participant A" describing a conversation she had
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
    expect(labels.get('p-hire')).toBe('participant A');
    expect(labels.get('p-colleague')).toBe('participant B');
  });

  it('uses the role when people have one, and distinguishes people who share it', () => {
    const officers = [
      lead,
      { ...hire, roleAsDescribed: 'field officer' },
      { ...colleague, roleAsDescribed: 'field officer' },
    ];
    const labels = labelsForParties(officers);
    expect(labels.get('p-hire')).toBe('field officer A');
    expect(labels.get('p-colleague')).toBe('field officer B');
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
    expect(out).toContain('participant B');
    expect(out).not.toContain('Kavon');
  });
});

describe('the substitution itself', () => {
  it('resolves the longer label first, when one role name contains another', () => {
    /**
     * The real hazard, and the first version of this test missed it.
     *
     * I wrote it against "field officer" versus "field officer A", which cannot
     * happen: the letter is only appended when two people share a role, so the
     * bare label and the lettered one never coexist. Reversing the sort left the
     * test green, which meant it was pinning nothing.
     *
     * Two DIFFERENT roles where one contains the other is the case that occurs,
     * and shortest-first turns "lead engineer" into "Hafsah Jumare engineer".
     */
    const overlapping = [
      { ...lead, roleAsDescribed: 'lead' },
      { ...hire, roleAsDescribed: 'lead engineer' },
    ];
    const visible = namesVisibleTo('p-lead', overlapping);
    expect(withNames('the lead engineer shipped it.', visible)).toBe('the Abubakar B shipped it.');
    expect(withNames('the lead asked for it.', visible)).toBe('the Hafsah Jumare asked for it.');
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
