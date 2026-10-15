import { AssistantService } from './assistant.service';
import { whatICanDoWith } from './the-router-is-deterministic';

/**
 * RELEASE CHECK, 7 OCTOBER 2026, READ ON THE SERVER. "Who is behind on Sales team, Q4?" goes to the "who is" lane, which does not
 * read "behind on Sales team, Q4" as a name and answers with the fixed sentence 'I cannot answer that one yet. Here is what I can do
 * with "behind on Sales team, Q4".' The composer then reworded it, and Wairimu, Amani, Neema (held for a seat) and Peter (a lead the
 * board refuses) were each told "You are behind on the Sales team's Q4 work." Every word was in the draft, so no check caught it.
 */
const whatTheModelWrote = "You are behind on the Sales team's Q4 work.";
const compose = (reply: any) =>
  (AssistantService.prototype as any).compose.call({ engine: { respond: jest.fn(async () => whatTheModelWrote) }, logger: { warn: () => undefined } }, reply);

describe('a question Ask cannot answer is said in its own fixed words', () => {
  it('the sentence goes out as written, never as a verdict about the reader', async () => {
    const { line, options } = whatICanDoWith('behind on Sales team, Q4');
    const reply = { lane: 'unplaced', composedBy: 'rules', blocks: [{ type: 'text', body: line }, { type: 'picker', options }] };
    const out = await compose(reply);
    expect(out.blocks[0].body).toBe(line);
    expect(out.blocks[0].body).not.toContain('You are behind');
    expect(out.composedBy).toBe('rules');
  });
  it('an answer from a lane is still worded by the model as before', async () => {
    const out = await compose({ lane: 'my_to_dos', composedBy: 'rules', blocks: [{ type: 'text', body: 'You are behind on the Sales team work for Q4.' }] });
    expect(out.composedBy).toBe('model');
  });
});
