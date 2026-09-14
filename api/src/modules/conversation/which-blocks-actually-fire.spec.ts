import { readFileSync } from 'fs';
import { join } from 'path';
import { whatFiredThisTurn, oneLine } from './which-blocks-actually-fire';

/**
 * YOU CANNOT TUNE WHAT ALWAYS FIRES.
 *
 * The prompt is thirty blocks joined at run time and one of them is 116,527 characters, forty-eight
 * per cent of every prompt this product sends. Twenty-nine of the thirty earn their place by firing
 * only when they apply. Making the thirtieth behave like the others is the plan, and this is what
 * turns that from a judgement call into a decision with evidence.
 */
describe('which blocks actually fire', () => {
  const turn = [
    { name: 'systemPrompt', text: 'x'.repeat(116527) },
    { name: 'coachingBlock', text: '' },
    { name: 'theOneThingBack', text: 'Sixty of the hundred and fifty.' },
    { name: 'patternProbeBlock', text: null },
  ];

  it('separates what fired from what was quiet', () => {
    const what = whatFiredThisTurn(turn);
    expect(what.fired.map((f) => f.name)).toEqual(['systemPrompt', 'theOneThingBack']);
    expect(what.quiet).toEqual(['coachingBlock', 'patternProbeBlock']);
  });

  it('puts the biggest first, which is the one the plan is about', () => {
    expect(whatFiredThisTurn(turn).fired[0].name).toBe('systemPrompt');
    expect(whatFiredThisTurn(turn).fired[0].chars).toBe(116527);
  });

  it('counts whitespace-only as quiet, because a block of spaces reaches nobody', () => {
    const what = whatFiredThisTurn([{ name: 'a', text: '   \n  ' }]);
    expect(what.fired).toEqual([]);
    expect(what.quiet).toEqual(['a']);
  });

  it('is one line, because this runs on every turn of every conversation', () => {
    const line = oneLine(whatFiredThisTurn(turn));
    expect(line.split('\n')).toHaveLength(1);
    expect(line).toContain('2 quiet');
    expect(line).toContain('systemPrompt:116527');
  });

  it('logs names and sizes and nothing anybody said', () => {
    const line = oneLine(whatFiredThisTurn(turn));
    /* Not a word of the content reaches the log, which is what makes this safe to leave on. */
    expect(line).not.toContain('Sixty of the hundred');
  });

  it('and it changes nothing about the prompt', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const at = src.indexOf('const inThisTurn');
    const block = src.slice(at, src.indexOf('return [systemPrompt', at));
    expect(block).toMatch(/this\.logger\.log\(oneLine\(whatFiredThisTurn\(inThisTurn\)\)\)/);
    /* Nothing in the measuring block assigns to anything the prompt is built from. */
    expect(block).not.toMatch(/systemPrompt\s*=/);
    expect(block).not.toMatch(/theOneThingBack\s*=/);
  });
});
