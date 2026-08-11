import {
  whatThisRestsOn,
  withoutWhatOnlyTheLeadSaid,
  whyItWasDropped,
  type LeadNote,
} from './a-lead-note-is-not-evidence';

/**
 * ONE PERSON'S OPINION, LAUNDERED INTO A FINDING.
 *
 * The lead attaches private context: "Abubakar has been slow to take ownership."
 * Genuinely useful, and usually why the ground exists. Also the most dangerous
 * input in the system, because of how easily it becomes what it predicted - the
 * engine is told to watch for slow ownership, so it probes ownership, so ownership
 * fills the record, so a pattern confirms, and one person's opinion has been
 * laundered into a finding by the machinery meant to test it.
 *
 * THE PROTECTION SHIPPED AS WORDING: a labelled prompt section saying "never state
 * it as an established fact". That is the exact shape of guardrail this codebase
 * watched leak twice in a single day, and a-hypothesis-is-not-a-finding.ts, which
 * states the rule properly, had never been called by anything.
 *
 * So it is arithmetic now, and the assertions below are mostly about NOT being
 * over-eager: dropping real findings would be its own harm, quieter and harder to
 * notice.
 */

const NOTES: LeadNote[] = [
  { participantId: 'p2', text: 'Abubakar has been slow to take ownership of client relationships.' },
];

const RECORD = [
  { text: 'I have been working through the ticket queue, about forty a week.' },
  { text: 'The Meridian handover is still with me and I have not been able to pass it on.' },
];

describe('what a finding rests on', () => {
  it('the record, when a party said it', () => {
    expect(whatThisRestsOn('The Meridian handover has not been passed on', NOTES, RECORD))
      .toBe('the record');
  });

  it('the lead alone, when only the note said it', () => {
    // THE REGRESSION. This sentence is the lead's opinion in the report's voice,
    // and by the time anybody notices it is in a document read as neutral.
    expect(whatThisRestsOn('Slow to take ownership of client relationships', NOTES, RECORD))
      .toBe('the lead alone');
  });

  it('and neither, which is most sentences and is fine', () => {
    // A synthesis line is a summary and often shares no distinctive words with any
    // single entry. Treating that as a leak would gut every report.
    expect(whatThisRestsOn('Both accounts describe the same first month', NOTES, RECORD))
      .toBe('neither, so nothing to check');
  });

  it('keeps a finding the lead ALSO raised, once the record shows it', () => {
    /**
     * THE ASSERTION THAT MATTERS MOST, and the one an over-eager version fails.
     * The lead is usually right. A note that turns out to be corroborated by
     * somebody's own account is exactly the ground working - and dropping it
     * because the lead mentioned it first would punish the lead for having said
     * anything, which is the opposite of the rule.
     */
    const corroborated = [...RECORD, { text: 'Nobody has handed me ownership of a client relationship yet.' }];
    expect(whatThisRestsOn('Ownership of client relationships has not been handed over', NOTES, corroborated))
      .toBe('the record');
  });
});

describe('stripping them from a report', () => {
  const divergences = [
    { topic: 'The handover', whatEachSaid: 'One says the Meridian handover is still with them.' },
    { topic: 'Ownership', whatEachSaid: 'Slow to take ownership of client relationships.' },
  ];
  const textOf = (d: any) => [d.topic, d.whatEachSaid].join(' ');

  it('drops the laundered one and keeps the real one', () => {
    const { kept, dropped } = withoutWhatOnlyTheLeadSaid(divergences, textOf, NOTES, RECORD);
    expect(kept.map((d) => d.topic)).toEqual(['The handover']);
    expect(dropped).toHaveLength(1);
  });

  it('changes nothing at all on a ground with no lead notes', () => {
    // Which is most grounds. An early return rather than a walk that happens to
    // find nothing, so the common case costs nothing.
    const { kept, dropped } = withoutWhatOnlyTheLeadSaid(divergences, textOf, [], RECORD);
    expect(kept).toHaveLength(2);
    expect(dropped).toHaveLength(0);
  });

  it('works on whatever shape the findings are, which is three different ones', () => {
    // Agreements are sometimes strings and sometimes objects, gaps are objects,
    // divergences are objects with different fields. A version that only knew
    // about divergences would be a wall with a door in it.
    const strings = ['Slow to take ownership of client relationships', 'The queue is about forty a week'];
    const { kept } = withoutWhatOnlyTheLeadSaid(strings, (x) => x, NOTES, RECORD);
    expect(kept).toEqual(['The queue is about forty a week']);
  });

  it('and copes with a finding that has no text at all', () => {
    const { kept } = withoutWhatOnlyTheLeadSaid([{ topic: null }] as any, (d: any) => d.topic, NOTES, RECORD);
    expect(kept).toHaveLength(1);
  });
});

describe('what the log tells the person reading it', () => {
  it('names the finding, and says the lead is not the one being doubted', () => {
    // Written for whoever reads it wondering why a report is thinner than they
    // expected. Most of the time the lead is right and nobody has asked yet.
    const line = whyItWasDropped('Slow to take ownership of client relationships');
    expect(line).toMatch(/rested on the lead's private note/);
    expect(line).toMatch(/not the lead being wrong/);
    expect(line).toMatch(/a question in the next check-in, not a sentence in this report/);
  });
});
