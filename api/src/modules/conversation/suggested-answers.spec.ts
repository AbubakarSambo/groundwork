import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
import { readFileSync } from 'fs';
import { join } from 'path';
import { suggestAnswers, suggestionsThatHold, endsWithAQuestion, theQuestionIn } from './suggested-answers';

/** Task 2.6, week 5: two to four suggested answers under each question (screens request 7a). */
describe('suggested answers under each question', () => {
  const Q = 'Last time you said Green Mart wanted a quote. What happened?';

  it('finds the question the person is answering', () => {
    expect(endsWithAQuestion(Q)).toBe(true);
    expect(theQuestionIn(Q)).toBe('What happened?');
    expect(endsWithAQuestion('Your report is ready now. Speak soon.')).toBe(false);
  });

  it('keeps two to four short answers and drops any that break a rule', () => {
    expect(suggestionsThatHold([
      'Sent it. They want to wait until after December.',
      'Not yet.',
      'I sold 40 units to them.',               // a number nobody gave
      'Grace at Fresh Foods liked it.',         // a name the question did not hold
      'Did they reply?',                        // a question
      'Not yet.',                               // said twice
      "I don't know yet.",
    ], 'What happened with the quote?')).toEqual(['Sent it. They want to wait until after December.', 'Not yet.', "I don't know yet."]);
  });

  it('keeps a name the question already held', () => {
    expect(suggestionsThatHold(['I sent Green Mart the quote.', 'Not yet.'], 'Did Green Mart get the quote?')).toEqual(['I sent Green Mart the quote.', 'Not yet.']);
  });

  it('gives nothing rather than one lonely suggestion', () => {
    expect(suggestionsThatHold(['Not yet.'], 'What happened?')).toEqual([]);
  });

  it('asks the model with the question and their own last answer only, and nothing for a turn that asks nothing', async () => {
    const seen: string[] = [];
    const llm = { extract: async (_s: string, history: any[]) => { seen.push(history[0].content); return { answers: ['It moved.', 'Not yet.'] } as any; } };
    expect(await suggestAnswers(llm as any, Q, 'We sent the quote on Monday.')).toEqual(['It moved.', 'Not yet.']);
    expect(seen[0]).toContain('What happened?');
    expect(seen[0]).toContain('We sent the quote on Monday.');
    expect(seen[0]).not.toContain('Green Mart wanted a quote');
    expect(await suggestAnswers(llm as any, 'Your report is ready now. Speak soon.')).toEqual([]);
    expect(seen.length).toBe(1);
  });

  it('never fails the turn', async () => {
    const llm = { extract: async () => { throw new Error('busy'); } };
    expect(await suggestAnswers(llm as any, Q)).toEqual([]);
  });

  it('is served on the opening, each reply, the stream, and stored for the transcript', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    expect((src.match(/this\.suggestedAnswersFor\(/g) ?? []).length).toBe(2);
    /* 3 November 2026: on the stream they follow the reply instead of holding it. */
    expect(src).toMatch(/yield \{ type: 'suggestions', suggestedAnswers \}/);
    expect(src).toMatch(/data: \{ suggestedAnswers: answers \}/);
    expect(src).toMatch(/suggestedAnswers: r\.suggestedAnswers/);
    expect(theStreamedRouteRunsThePlainRoute(src)).toBe(true);
  });
});
