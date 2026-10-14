import { answerFromTheDocuments, ANSWER_FROM_THE_DOCUMENTS_PROMPT } from './a-question-is-answered-from-the-documents';

/**
 * PILOTS AFTER FIXES, 14 OCTOBER (A6): "When is the Kamau defence due?" read "I could not find the answer to that in the
 * documents you can open", while the longer "What date is the Kamau v. Apex defence due, according to the matter list?"
 * was answered. The matter list was older than the other files, so it fell outside what was read.
 */
const MATTER_LIST = { fileName: 'matter-list.pdf', content: 'Kamau v. Apex Ltd. Defence due 22 October 2026. Kasarani land matter. Title search pending.', isConversation: false };
const BIG_NEWER = Array.from({ length: 4 }, (_x, i) => ({ fileName: `minutes-${i}.pdf`, content: 'Minutes of the meeting. '.repeat(600), isConversation: false }));

function world() {
  const sent: string[] = [];
  const prisma: any = {
    ground: { findMany: jest.fn(async () => [{ id: 'g1', initiatorId: 'u-njeri', participants: [] }]) },
    groundDocument: { findMany: jest.fn(async () => [...BIG_NEWER, MATTER_LIST]) },
  };
  const engine = {
    extract: jest.fn(async (_s: string, history: any[]) => {
      const content = history[0].content as string;
      sent.push(content);
      return content.includes('Defence due 22 October 2026')
        ? { found: true, answer: 'The defence in Kamau v. Apex Ltd is due on 22 October 2026, according to matter-list.pdf.' }
        : { found: false, answer: '' };
    }),
  };
  return { prisma, engine, sent };
}

describe('a short question is answered from the documents too', () => {
  it('the matter list is read first, so "When is the Kamau defence due?" is answered', async () => {
    const w = world();
    const said = await answerFromTheDocuments({ prisma: w.prisma, engine: w.engine }, { organizationId: 'o1', userId: 'u-njeri', question: 'When is the Kamau defence due?' });
    expect(said).toBe('The defence in Kamau v. Apex Ltd is due on 22 October 2026, according to matter-list.pdf.');
    expect(w.sent[0].indexOf('DOCUMENT "matter-list.pdf"')).toBeLessThan(w.sent[0].indexOf('DOCUMENT "minutes-0.pdf"'));
  });
  it('the model is told to match a short name to the fuller one', () => {
    expect(ANSWER_FROM_THE_DOCUMENTS_PROMPT).toContain('"The Kamau defence" is the defence in "Kamau v. Apex Ltd"');
  });
});
