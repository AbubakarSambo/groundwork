import { buildContribution } from './reads';
import { CheckInStatus } from '@prisma/client';

/**
 * A SENTENCE THAT CONTAINS "NOT" IS NOT A SENTENCE ABOUT NOTHING.
 *
 * From the first end-to-end run, 11 September. A manager gave four dates, three names and a
 * document, and both people on the check-in were told, about themselves and about each other:
 * "Nothing named so far could be checked by anyone else - no named people, organisations, numbers
 * or dates."
 *
 * The cause was one regex. `ADMITS_ABSENCE` matched a bare `not`, `no` or `none` anywhere in the
 * text and demoted the entry to LOW, and almost every sentence anybody writes contains one of them.
 * With every entry demoted, the checkable count fell to zero for everyone.
 *
 * These are the exact lines from that run. The first two are the ones that were wrongly demoted;
 * the third is the one the rule was written for and still catches.
 */
const nameOf = (id: string) => (id === 'a' ? 'Runa' : id);

function reasonFor(text: string): string {
  return buildContribution(
    {
      participants: [{ id: 'a', roleAsDescribed: 'Manager', managingOnly: false, detectedFunction: null, detectedFunctionConfidence: null }],
      checkIns: [{ participantId: 'a', sessionNumber: 1, status: CheckInStatus.COMPLETED }],
      entries: [{ participantId: 'a', sessionNumber: 1, text }],
      mentions: [],
      dependencies: [],
    } as any,
    nameOf,
  )[0].reason ?? "";
}

const NOTHING_CHECKABLE = /Nothing named so far could be checked/;

describe('a negation inside a sentence is not an admission of absence', () => {
  it('keeps a dated instruction that happens to contain "not"', () => {
    const reason = reasonFor(
      '[VERIFIABILITY:MEDIUM] Daniel should be taking escalations to Amara, not to me, from the first week of September.',
    );
    expect(reason).not.toMatch(NOTHING_CHECKABLE);
  });

  it('keeps a record of a document that happens to contain "none"', () => {
    const reason = reasonFor(
      '[VERIFIABILITY:HIGH] The escalation log shows Amara as the approver on every escalation raised after 1 September, and my name on none of them.',
    );
    expect(reason).not.toMatch(NOTHING_CHECKABLE);
  });

  it('still catches somebody saying plainly that they did not do the thing', () => {
    const reason = reasonFor('[VERIFIABILITY:MEDIUM] I have not closed anything since Loop, if I am honest.');
    expect(reason).toMatch(NOTHING_CHECKABLE);
  });

  it('and still catches a sentence that is nothing but an absence', () => {
    const reason = reasonFor('[VERIFIABILITY:MEDIUM] Nothing to report this week.');
    expect(reason).toMatch(NOTHING_CHECKABLE);
  });
});
