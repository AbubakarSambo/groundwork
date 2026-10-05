import { aJudgementThatReadsRight } from './the-judgement-reads-right';

/**
 * TWO LINES FROM THE RE-RUN OF 5 OCTOBER (api/journey/all-24/run-oct5c), as the lead read them, put right at the read.
 */
describe('the project board: a question only the lead can answer', () => {
  const LINE = {
    why: 'The record only says Rita Adeleke sent them and is waiting for confirmation.',
    about: "This check-in cannot tell you whether you ever saw or responded to Rita Adeleke's requirements from July.",
    toKnow: 'Your own account of this is not in this check-in.',
  };
  it('the lead reads "Only you can answer this."', () => {
    expect((aJudgementThatReadsRight({ whatThisCannotTellYou: [LINE] }) as any).whatThisCannotTellYou[0].toKnow).toBe('Only you can answer this.');
  });
  it('an admin, who reads the lead\'s name there, keeps the sentence', () => {
    const asAdmin = { ...LINE, about: "This check-in cannot tell you whether Amina Wanjiru ever saw or responded to Rita Adeleke's requirements from July." };
    expect((aJudgementThatReadsRight({ whatThisCannotTellYou: [asAdmin] }) as any).whatThisCannotTellYou[0].toKnow).toBe('Your own account of this is not in this check-in.');
  });
  it.each([
    'This check-in cannot tell you whether you will get the budget from finance.',
    'This check-in cannot tell you when you will be given the new rota.',
    'This check-in cannot tell you whether you will be told before Friday.',
    'This check-in cannot tell you whether you will receive the stock.',
    'This check-in cannot tell you why you are given the late shift.',
  ])('something done to the lead is not the lead\'s to answer: "%s"', (about) => {
    expect((aJudgementThatReadsRight({ whatThisCannotTellYou: [{ ...LINE, about }] }) as any).whatThisCannotTellYou[0].toKnow).toBe('Your own account of this is not in this check-in.');
  });
  it('a heading that only opens "This check-in cannot tell you" is not taken for a question about the reader', () => {
    const plain = { ...LINE, about: 'This check-in cannot tell you why the sandbox credentials have not arrived.' };
    expect((aJudgementThatReadsRight({ whatThisCannotTellYou: [plain] }) as any).whatThisCannotTellYou[0].toKnow).toBe('Your own account of this is not in this check-in.');
  });
});

