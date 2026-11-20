import { readFileSync } from 'fs';
import { join } from 'path';
import { understandTheMessage, UNDERSTAND_PROMPT, whatTheModelSaid } from '../assistant/ask-understands-with-the-model';
import { SESSION_CLOSE_MARKER } from './prompt-library';

/** Run 9: two rounds stayed open after a typed finish because the model kept asking. The model that reads what a message means is asked first, and the one close marker closes. */
describe('a typed finish', () => {
  it('is a kind the model reads, told apart from agreement and thanks', async () => {
    expect(UNDERSTAND_PROMPT).toContain('- finished:');
    expect(whatTheModelSaid({ kind: 'finished' })?.kind).toBe('finished');
    const asked: string[] = [];
    const engine = { extract: jest.fn(async (_p: string, h: { content: string }[]) => { asked.push(h[0].content); return { kind: 'finished' }; }) };
    const said = await understandTheMessage(engine, null, 'That is all from me', 'What else should I know?');
    expect(said?.kind).toBe('finished');
    expect(asked[0]).toContain('What else should I know?');
    expect(asked[0]).toContain('That is all from me');
  });
  it('closes the round through the one close marker, with no question, only when it is short and the person has already said something', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).toContain("understood?.kind === 'finished' ? `Understood. ${SESSION_CLOSE_MARKER}`");
    expect(src).toMatch(/\?\? \(await this\.aTypedFinish\(turns, message\)/);
    expect(SESSION_CLOSE_MARKER).toBeTruthy();
  });
});
