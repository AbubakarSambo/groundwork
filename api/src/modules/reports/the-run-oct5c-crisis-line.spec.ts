import { aJudgementThatReadsRight } from './the-judgement-reads-right';
import { notTheWordParty } from './not-the-word-party';

/**
 * TWO LINES FROM THE RE-RUN OF 5 OCTOBER (api/journey/all-24/run-oct5c), as the lead read them, put right at the read.
 */
describe('the crisis board: somebody outside the check-in', () => {
  it('"a party to this check-in" is "in this check-in", never "a person to this check-in"', () => {
    expect(notTheWordParty("Sarah is not a party to this check-in, and the record does not state Sarah's source of information."))
      .toBe("Sarah is not in this check-in, and the record does not state Sarah's source of information.");
    expect(notTheWordParty('Every party agreed.')).toBe('Everyone agreed.');
  });
  it('the account missing is Sarah\'s, said with her name again, never the reader\'s', () => {
    const line = {
      why: "Sarah is not in this check-in, and the record does not state Sarah's source of information.",
      about: 'This check-in cannot tell you how Sarah knew about the service outage at 7:15 AM.',
      toKnow: 'Your own account of this is not in this check-in.',
    };
    expect((aJudgementThatReadsRight({ whatThisCannotTellYou: [line] }) as any).whatThisCannotTellYou[0].toKnow).toBe("Sarah's own account is not in this check-in.");
  });
});
