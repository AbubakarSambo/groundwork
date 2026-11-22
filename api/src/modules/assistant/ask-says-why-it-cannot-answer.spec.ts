import { answerFromTheDocuments, ANSWER_FROM_THE_DOCUMENTS_PROMPT } from './a-question-is-answered-from-the-documents';

/**
 * ASK SAYS WHY IT CANNOT ANSWER, AND WHAT IT CAN DO (fix plan 16 November, group 9; end-to-end check I-15).
 *
 * The lead asked about one person and a performance plan and read "I could not find the answer to that in the documents you can open",
 * which does not say what was looked at or why there is no answer, and talks about documents when she asked about a person. The model
 * says why in its own words; the product adds what Ask can do. Read here as the lead reads it.
 */
const people = [{ id: 'p-lead', userId: 'u-lead', email: 'lucy@x.test', nameGiven: 'Lucy' }];
const prisma: any = {
  ground: { findMany: jest.fn(async () => [{ id: 'g1', label: 'Sales updates', initiatorId: 'u-lead', participants: [{ id: 'p-lead' }] }]) },
  groundParticipant: { findMany: jest.fn(async () => people) },
  groundDocument: { findMany: jest.fn(async () => []) },
};
const ask = (reply: any, question: string) => answerFromTheDocuments({ prisma, engine: { extract: jest.fn(async () => reply) } }, { organizationId: 'o', userId: 'u-lead', groundId: 'g1', question });

describe('when Ask cannot answer, the lead is told why and what Ask can do', () => {
  it('says the model\'s own reason, then what it can do, and never "documents you can open"', async () => {
    const said = await ask(
      { found: false, answer: '', whyNot: 'You asked what Joseph needs to do to avoid a performance plan. I do not give a view on how well one person is doing, and nothing on record says it either.' },
      'What does Joseph need to do to avoid a performance plan?',
    );
    expect(said).toBe([
      'You asked what Joseph needs to do to avoid a performance plan. I do not give a view on how well one person is doing, and nothing on record says it either.',
      'I can tell you what each person said, what is proven and what is still open.',
    ].join(' '));
    expect(said).not.toMatch(/documents you can open|The document/);
  });

  it('with no reason from the model, still says what was looked at and what Ask can do', async () => {
    const said = await ask({ found: false, answer: '' }, 'What is the weather?');
    expect(said).toBe('I looked at what the team has said and at the files you can open, and the answer is not in them. I can tell you what each person said, what is proven and what is still open.');
  });

  it('the model is asked for the reason, and told never to start with "the document does not state"', () => {
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toMatch(/whyNot/);
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toMatch(/never begin with "The document/i);
  });
});
