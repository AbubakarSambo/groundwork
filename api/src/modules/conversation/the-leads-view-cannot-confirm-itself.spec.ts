import {
  readStatus,
  mayBeSurfaced,
  mayShapeProbing,
  standsWithoutTheLead,
} from './a-hypothesis-is-not-a-finding';

/**
 * A MANAGER'S OPINION MUST NOT BE ABLE TO BECOME A FINDING ABOUT SOMEBODY.
 *
 * A lead can attach context on a participant: "Abubakar has been slow to take
 * ownership." That is useful, and it is usually why the ground exists at all.
 *
 * It is also the input most likely to come true by being written down. The
 * engine is told to watch for slow ownership, so it probes ownership, so
 * ownership fills the record, so a pattern "confirms". What actually happened is
 * that one person's opinion was laundered into a finding by the machinery meant
 * to test it, and the person is now coached against a label their manager wrote
 * before they had said a word.
 *
 * The rule, and the reason it is arithmetic rather than a sentence in a prompt:
 * the lead's context may RAISE a hypothesis, and only the person's own account
 * over three periods can CONFIRM one. Two prompt-only guardrails on this product
 * leaked in a single day. A rule that lives in wording holds until the model is
 * tired.
 */

describe('what the lead alone can produce', () => {
  it('raises something to watch, and nothing more', () => {
    const status = readStatus({ ownAccountPeriods: 0, raisedByLead: true });
    expect(status).toBe('hypothesis');
  });

  it('can NEVER reach confirmed on its own, however sure the lead is', () => {
    // THE REGRESSION. There is no number of leads, no strength of wording, and
    // no amount of time that turns somebody's opinion into a finding.
    expect(readStatus({ ownAccountPeriods: 0, raisedByLead: true })).not.toBe('confirmed');
    expect(readStatus({ ownAccountPeriods: 2, raisedByLead: true })).not.toBe('confirmed');
  });

  it('is never shown to anybody as a read', () => {
    const status = readStatus({ ownAccountPeriods: 0, raisedByLead: true });
    expect(mayBeSurfaced(status)).toBe(false);
  });

  it('is allowed to shape what gets ASKED, which is the whole point of it', () => {
    // The probe it produces is still neutral and still about the work. What must
    // never happen is the person learning their manager said something about
    // them, or the accusation riding inside the question.
    const status = readStatus({ ownAccountPeriods: 0, raisedByLead: true });
    expect(mayShapeProbing(status)).toBe(true);
  });
});

describe('what the person’s own account produces', () => {
  it('confirms once it has repeated across the three periods', () => {
    expect(readStatus({ ownAccountPeriods: 3, raisedByLead: false })).toBe('confirmed');
  });

  it('confirms on their own account whether or not the lead ever mentioned it', () => {
    // The lead raising it changes nothing about whether it is true. It only
    // changed where the engine looked.
    expect(readStatus({ ownAccountPeriods: 3, raisedByLead: true })).toBe('confirmed');
    expect(readStatus({ ownAccountPeriods: 3, raisedByLead: false })).toBe('confirmed');
  });

  it('does not confirm on one or two sightings', () => {
    // One vague answer is one answer, not a vague person.
    expect(readStatus({ ownAccountPeriods: 1, raisedByLead: false })).toBe('hypothesis');
    expect(readStatus({ ownAccountPeriods: 2, raisedByLead: false })).toBe('hypothesis');
  });

  it('says nothing at all when there is nothing', () => {
    // The honest state for most people most of the time.
    expect(readStatus({ ownAccountPeriods: 0, raisedByLead: false })).toBe('nothing_yet');
  });
});

describe('the self-fulfilling-label test, asked directly', () => {
  it('a confirmed read stands with the lead removed from the picture', () => {
    // If it only holds because the manager raised it, it was the manager's read
    // and not the record's.
    expect(standsWithoutTheLead({ ownAccountPeriods: 3, raisedByLead: true })).toBe(true);
  });

  it('a lead-only read does not stand, and is caught saying so', () => {
    expect(standsWithoutTheLead({ ownAccountPeriods: 0, raisedByLead: true })).toBe(false);
  });

  it('a two-period read stands on its own, and still cannot be shown', () => {
    /**
     * The near miss, and I had this backwards first time.
     *
     * Two sightings in the person's OWN account raise a hypothesis on their own
     * merit, so removing the lead changes nothing: it stands. What it is not is
     * confirmed, and the protection at this point is not standsWithoutTheLead,
     * it is that a hypothesis is never surfaced to anybody.
     *
     * Worth keeping both assertions together, because "stands without the lead"
     * is easy to misread as "safe to show", and it is not the same question.
     */
    const nearMiss = { ownAccountPeriods: 2, raisedByLead: true };
    expect(standsWithoutTheLead(nearMiss)).toBe(true);
    expect(mayBeSurfaced(readStatus(nearMiss))).toBe(false);
  });
});

describe('only a confirmed read is ever shown', () => {
  it.each([
    ['nothing_yet', false],
    ['hypothesis', false],
    ['confirmed', true],
  ] as const)('%s -> surfaced: %s', (status, expected) => {
    expect(mayBeSurfaced(status)).toBe(expected);
  });
});
