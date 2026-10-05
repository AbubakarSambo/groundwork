import { whatWasSaid, inPlainList } from './what-was-said-is-what-is-kept';
import { whatICanDoWith } from './the-router-is-deterministic';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE HISTORY KEPT A SENTENCE THAT INTRODUCED SOMETHING AND THEN NOTHING (request 154, item 2).
 *
 * Only the first text block of a reply was kept, so where the substance of an answer is in its
 * choices the record held an unfinished thought - the screens read saved turns ending at
 * 'I cannot answer that one yet. Here is what I can do with "It should run for 13 weeks."' with
 * nothing after it. The person saw four choices under that line.
 */
describe('what is kept is what the person read', () => {
  it('keeps the choices that carried the answer', () => {
    const { line, options } = whatICanDoWith('It should run for 13 weeks.');
    const kept = whatWasSaid({ blocks: [{ type: 'text', body: line }, { type: 'picker', options }] });
    expect(kept).toContain('Here is what I can do with');
    expect(kept).toContain('You could Tell me what you can see, What am I on?, What is on my list? or Hold this against my next check-in.');
  });

  it('does not end on a sentence that introduces nothing', () => {
    const { line, options } = whatICanDoWith('anything at all');
    const kept = whatWasSaid({ blocks: [{ type: 'text', body: line }, { type: 'picker', options }] });
    expect(kept.endsWith('"anything at all."')).toBe(false);
  });

  it('keeps every text block, not only the first', () => {
    const kept = whatWasSaid({ blocks: [{ type: 'text', body: 'First.' }, { type: 'text', body: 'Second.' }] });
    expect(kept).toBe('First. Second.');
  });

  it('counts a next step as something offered, because it was', () => {
    const kept = whatWasSaid({ blocks: [{ type: 'text', body: 'Nothing is set up yet.' }, { type: 'next_step', label: 'Set up a check-in', href: '/x', kind: 'set_up_a_check_in' }] });
    expect(kept).toBe('Nothing is set up yet. You could Set up a check-in.');
  });

  it('adds nothing when there was nothing to choose', () => {
    expect(whatWasSaid({ blocks: [{ type: 'text', body: 'You have three open commitments.' }] })).toBe('You have three open commitments.');
  });

  it('says nothing at all for an empty reply, rather than a stray sentence', () => {
    expect(whatWasSaid({ blocks: [] })).toBe('');
    expect(whatWasSaid(null)).toBe('');
  });

  it('lists in the way a person says it out loud', () => {
    expect(inPlainList(['one'])).toBe('one');
    expect(inPlainList(['one', 'two'])).toBe('one or two');
    expect(inPlainList(['one', 'two', 'three'])).toBe('one, two or three');
  });

  /* No save site may go back to keeping only the first text block. */
  it('every place a turn is saved keeps what was read', () => {
    const files = ['../ask/ask.service.ts', 'assistant.service.ts'];
    for (const f of files) {
      const src = readFileSync(join(__dirname, f), 'utf8');
      for (const m of src.matchAll(/role: 'assistant',\s*content: ([^,]+),/g)) {
        expect(m[1].trim()).toContain('whatWasSaid');
      }
    }
  });
});
