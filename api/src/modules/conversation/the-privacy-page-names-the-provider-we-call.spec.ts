import { readFileSync } from 'fs';
import { join } from 'path';
import { geminiConfig } from '../../config/configuration';

/**
 * THE PRIVACY PAGE NAMES THE PROVIDER WE CALL.
 *
 * The page says Groundwork "may use" OpenAI, Anthropic and Google; only Google, through Vertex, is
 * ever called. The page is frozen, so its wording stays; what this guards is the dangerous drift -
 * calling a provider the page does not name (fix plan G2, as the audit reshaped it). The provider
 * set is derived from the two configured models, not from a hardcoded name, and the assertion is
 * scoped to the processor sentence, because the page also names providers in a NEGATIVE sentence
 * about training that must never trip this.
 */
const PROVIDER_OF: [RegExp, string][] = [
  [/^gemini-/, 'Google'],
  [/^gpt-|^o[1-9]-/, 'OpenAI'],
  [/^claude-/, 'Anthropic'],
];
const providerOf = (model: string): string | null => PROVIDER_OF.find(([p]) => p.test(model))?.[1] ?? null;

describe('the processors the page names', () => {
  const cfg = geminiConfig() as { model: string; conversationModel: string };
  const called = new Set([cfg.model, cfg.conversationModel].map(providerOf));

  it('every configured model maps to a provider we can name', () => {
    expect([...called]).not.toContain(null);
    expect(called.size).toBeGreaterThan(0);
  });

  it('are a superset of the providers the code calls, in the processor sentence alone', () => {
    const page = readFileSync(join(__dirname, '..', '..', '..', '..', 'marketing', 'src', 'pages', 'privacy-and-ai.astro'), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const sentence = page.match(/Groundwork may use leading AI providers[^.]*\./)?.[0] ?? '';
    expect(sentence).not.toBe('');
    const named = new Set(['Google', 'OpenAI', 'Anthropic'].filter((p) => sentence.includes(p)));
    for (const p of called) expect(named.has(p as string)).toBe(true);
  });
});
