import { passagesOf, passagesThatMatter, PASSAGE_CHARS } from './passages-that-matter';

const para = (topic: string, n: number) => Array.from({ length: n }, (_, i) => `${topic} paragraph ${i + 1}. It says something about ${topic} and nothing else worth repeating.`).join('\n\n');

describe('a document that does not fit is cut at its own breaks', () => {
  it('splits on blank lines and keeps each passage under the size', () => {
    const doc = para('budget', 40);
    const ps = passagesOf(doc);
    expect(ps.length).toBeGreaterThan(1);
    for (const p of ps) expect(p.text.length).toBeLessThanOrEqual(PASSAGE_CHARS + 2);
    expect(ps[0].at).toBe(0);
  });

  it('splits a single very long paragraph on sentence ends, never mid-word', () => {
    const long = Array.from({ length: 60 }, (_, i) => `Sentence number ${i + 1} is here and it is about the rota.`).join(' ');
    const ps = passagesOf(long);
    expect(ps.length).toBeGreaterThan(1);
    for (const p of ps) expect(/\.$/.test(p.text)).toBe(true);
  });
});

describe('the passages that matter are the ones about what is being discussed', () => {
  const doc = [para('hiring', 8), para('the rota and shift cover', 6), para('procurement', 8)].join('\n\n');

  it('chooses the passages sharing words with the conversation, in document order', () => {
    const chosen = passagesThatMatter(doc, 'we are still short on shift cover for the rota', 1_500);
    expect(chosen.byMatch).toBe(true);
    expect(chosen.text).toContain('rota');
    expect(chosen.text).not.toContain('procurement paragraph');
    expect(chosen.kept).toBeLessThan(chosen.of);
  });

  it('falls back to the opening when nothing matches, and says so', () => {
    const chosen = passagesThatMatter(doc, 'zzz qqq', 1_500);
    expect(chosen.byMatch).toBe(false);
    expect(chosen.text.startsWith('hiring paragraph 1')).toBe(true);
  });

  it('never exceeds the room it was given', () => {
    const chosen = passagesThatMatter(doc, 'rota', 900);
    expect(chosen.text.length).toBeLessThanOrEqual(900);
  });
});
