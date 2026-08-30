import { theReadFor, REFUSAL, NOTHING_ON_RECORD, Material } from './what-a-lead-should-read-first';

/**
 * THE READ BEFORE A CONVERSATION ABOUT SOMEBODY.
 *
 * Asked directly: "does this give comments to their leads before a performance evaluation?" Every
 * part existed and nothing assembled them, so a lead prepared from memory - which is the failure
 * this product exists to end, happening inside the product.
 *
 * The tests that matter here are the refusals. This is the one surface where the product hands a
 * manager material about a named person shortly before a decision, and everything that makes that
 * safe has to be provable rather than intended.
 */
const NOW = new Date('2026-06-01T09:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const material = (over: Partial<Material> = {}): Material => ({
  personLabel: 'Priya',
  commitments: [],
  waitingOnOthers: [],
  othersWaiting: [],
  findings: [],
  carrying: [],
  now: NOW,
  ...over,
});

describe('a lead walks in with questions, not a verdict', () => {
  it('never scores, ranks, or recommends anything about the person', () => {
    const read = theReadFor(material({
      commitments: [{ text: 'Send the migration plan', state: 'OPEN', dueAt: daysAgo(9), statedAt: daysAgo(30) }],
      othersWaiting: [{ what: 'the schema sign-off', status: 'BLOCKING', waitingDays: 12 }],
      findings: [{ key: 'not_shipping', says: 'Nothing has been marked done on Atlas since April.', subjectExternalId: 'OKR-1', firstSeenAt: daysAgo(20) }],
    }));
    /*
     * The CONTENT, not the refusal. The refusal has to be allowed to name what it refuses - it says
     * "nothing here has been weighed, scored or ranked", and a check that reads it too fails on the
     * one sentence doing the work. The first version of this did exactly that.
     */
    const all = JSON.stringify({ sections: read.sections, notInHere: read.notInHere }).toLowerCase();

    /* The words that would turn this into the thing every other guard here prevents. */
    for (const forbidden of ['score', 'rating', 'rank', 'underperform', 'should be promoted', 'not meeting', 'below expectation', 'top performer']) {
      expect(all).not.toContain(forbidden);
    }
    expect(read.refusal).toBe(REFUSAL);
  });

  it('shows both sides of a handoff, because one side is a charge sheet', () => {
    /*
     * Somebody blocked for three weeks on a thing they cannot start looks identical to somebody who
     * has not started it. The only way to tell them apart is to show what they are waiting on.
     */
    const read = theReadFor(material({
      othersWaiting: [{ what: 'the schema sign-off', status: 'BLOCKING', waitingDays: 12 }],
      waitingOnOthers: [{ what: 'the vendor contract', status: 'BLOCKING', waitingDays: 21 }],
    }));
    const headings = read.sections.map(s => s.heading);
    expect(headings).toContain('What other people are waiting on them for');
    expect(headings).toContain('What they are waiting on other people for');
  });

  it('never calls an undated promise late', () => {
    /* Calling it late invents a deadline nobody agreed to, and the invented one is what gets used. */
    const read = theReadFor(material({
      commitments: [{ text: 'Look at the billing edge cases', state: 'OPEN', dueAt: null, statedAt: daysAgo(40) }],
    }));
    const said = read.sections.find(s => s.heading === 'What they said they would do')!;
    expect(said.lines[0]).toContain('no date given');
    expect(said.lines[0]).not.toMatch(/late|overdue|missed/i);
  });

  it('says an objective with no measure has nothing to be judged against', () => {
    const read = theReadFor(material({
      carrying: [{ externalId: 'OKR-1', title: 'Ship the billing rewrite', measure: null, lastSeenAt: daysAgo(3) }],
    }));
    const carrying = read.sections.find(s => s.heading === 'What they are carrying')!;
    expect(carrying.lines.join(' ')).toContain('nothing to be doing well or badly against')
  });

  it('attaches a source to every section, so none of it has to be taken on trust', () => {
    const read = theReadFor(material({
      commitments: [{ text: 'x', state: 'OPEN', dueAt: daysAgo(1), statedAt: daysAgo(9) }],
      findings: [{ key: 'gone_quiet', says: null, subjectExternalId: null, firstSeenAt: daysAgo(5) }],
      carrying: [{ externalId: 'S1', title: 'A thing', measure: 'revenue', lastSeenAt: daysAgo(2) }],
    }));
    expect(read.sections.length).toBeGreaterThan(0);
    for (const s of read.sections) expect(s.source.length).toBeGreaterThan(20);
  });

  it('states what it does not know every time, not only when the record is thin', () => {
    /*
     * A read that lists four findings and stops implies those four are the whole picture. A lead
     * who walks in believing that is worse off than one who brought nothing.
     */
    const rich = theReadFor(material({
      commitments: [{ text: 'a', state: 'OPEN', dueAt: daysAgo(2), statedAt: daysAgo(9) }],
      othersWaiting: [{ what: 'b', status: 'WAITING', waitingDays: 4 }],
      findings: [{ key: 'not_shipping', says: 'c', subjectExternalId: null, firstSeenAt: daysAgo(6) }],
      carrying: [{ externalId: 'S1', title: 'd', measure: 'x', lastSeenAt: daysAgo(1) }],
    }));
    expect(rich.notInHere.length).toBeGreaterThanOrEqual(4);
    expect(rich.notInHere.join(' ')).toContain('Most of what somebody does is not in here');
    expect(rich.notInHere.join(' ')).toContain('Why any of it happened');
  });

  it('has a plain answer for an empty record rather than padding one', () => {
    const read = theReadFor(material());
    expect(read.sections).toEqual([]);
    expect(NOTHING_ON_RECORD).toContain('That is not a finding about them');
    expect(NOTHING_ON_RECORD).toContain('Go in and ask');
  });
});
