import { theJudgementInstruction, theJudgementOverARoom } from './the-judgement-over-the-answers';

/*
 * "TELL YOU WHAT BLESSING OKAFOR'S RECORD SAYS ABOUT THE HANDOVER TIME CHANGING."
 *
 * What the lead read as a move in runs 5 and 6: "Ask you to decide what Zainab Suleiman should work
 * on now", "Show you and Amara Diallo both of their accounts". The judgement is written about
 * labels, so the model wrote "Tell the initiator ..." as if the lead were somebody else, and the
 * serve step turned the label into "you". Both judgements are built from code (reports.service.ts
 * passes them straight to the model, no PromptVersion row), so the instruction is where it is fixed.
 */
describe('a move in the judgement is something the reader does, never something told to them', () => {
  const THE_SENTENCE =
    'Every move is something the reader does themselves, written as an instruction to them: "Speak with Ngozi Eze about the 11 applications." Never write a move that tells, asks or shows the reader something, such as "Tell the initiator..." or "Ask the initiator to...". Where the reader is the one who must act, write what they do.';

  const whatToDoIn = (instruction: string) => instruction.split('\n').find((l) => l.startsWith('3. WHAT TO DO')) ?? '';

  it('the judgement over a population says it, inside WHAT TO DO', () => {
    const instruction = theJudgementInstruction('whoever called this check-in', 'what to do next');
    expect(whatToDoIn(instruction)).toContain(THE_SENTENCE);
  });

  it('and the judgement over a room says it, inside WHAT TO DO, with or without a lead named', () => {
    for (const lead of ['Hafsah Jumare', null]) {
      const instruction = theJudgementOverARoom('whoever called this check-in', 'what to do next', lead);
      expect(whatToDoIn(instruction)).toContain(THE_SENTENCE);
    }
  });
});
