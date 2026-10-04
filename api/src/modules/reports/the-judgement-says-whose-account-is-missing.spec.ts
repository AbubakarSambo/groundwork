import { theBoardsJudgementFor } from './the-judgement-is-the-leads';

/** Request 133 item 2: under "Who the other trader with the broken freezer is." the lead read "Your own account of this is not in this check-in." */
const judgement = { theGap: 'x', whatThisCannotTellYou: [
  { about: 'Who the other trader with the broken freezer is.', why: 'Nobody named them.', toKnow: 'Your own account of this is not in this check-in.' },
  { about: 'Whether the repayment was made.', why: 'Nobody said.', toKnow: 'Your own account of this is not in this check-in.' },
] };
describe('what this cannot tell the lead', () => {
  it('names whose account is missing when the lead is not the one', () => {
    const served: any = theBoardsJudgementFor({ theJudgement: judgement }, { isLead: true }).theJudgement;
    expect(served.whatThisCannotTellYou[0].toKnow).toBe("That trader's own account is not in this check-in.");
  });
  it('leaves the lead\'s own account where it is the lead\'s', () => {
    const served: any = theBoardsJudgementFor({ theJudgement: judgement }, { isLead: true }).theJudgement;
    expect(served.whatThisCannotTellYou[1].toKnow).toBe('Your own account of this is not in this check-in.');
  });
  it('is never served to a participant', () => {
    expect(theBoardsJudgementFor({ theJudgement: judgement }, { isLead: false }).theJudgement).toBeNull();
  });
});

describe('what this cannot tell the lead, as headings (request 131 item 5)', () => {
  const j = { whatThisCannotTellYou: ['the work in Kisumu', 'the printed workbooks', 'what is blocking the work', 'Nobody has said who arranged the visits.', 'Who the other trader with the broken freezer is.'].map((about) => ({ about, why: 'x' })) };
  const served: any = theBoardsJudgementFor({ theJudgement: j }, { isLead: true }).theJudgement;
  it('are sentences', () => {
    expect(served.whatThisCannotTellYou.map((x: any) => x.about)).toEqual([
      'This check-in cannot tell you about the work in Kisumu.',
      'This check-in cannot tell you about the printed workbooks.',
      'This check-in cannot tell you what is blocking the work.',
      'Nobody has said who arranged the visits.',
      'This check-in cannot tell you who the other trader with the broken freezer is.',
    ]);
  });
});
