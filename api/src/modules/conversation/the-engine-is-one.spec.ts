import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/*
 * ONE ENGINE, ONE PROBE (3 November 2026). Six modules each provided their own AnthropicService, so the five-minute
 * engine probe ran six times, each a call to the reports model. Read from the files every module is built from.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const modulesDir = join(__dirname, '..');
function moduleFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return moduleFiles(p);
    return f.endsWith('.module.ts') ? [p] : [];
  });
}

describe('the engine is provided once', () => {
  it('only the engine module lists AnthropicService among its providers', () => {
    const providing = moduleFiles(modulesDir).filter((f) => /providers:\s*\[[^\]]*\bAnthropicService\b/.test(strip(readFileSync(f, 'utf8'))));
    expect(providing.map((f) => f.slice(modulesDir.length + 1))).toEqual(['conversation/the-engine.module.ts']);
  });

  it('is global and is part of the app', () => {
    expect(readFileSync(join(__dirname, 'the-engine.module.ts'), 'utf8')).toMatch(/@Global\(\)/);
    expect(strip(readFileSync(join(modulesDir, '..', 'app.module.ts'), 'utf8'))).toMatch(/\bTheEngineModule,/);
  });
});

describe('the probe', () => {
  const src = strip(readFileSync(join(__dirname, 'anthropic.service.ts'), 'utf8'));
  const probe = src.slice(src.indexOf('private async healthCheck('), src.indexOf('async *respondStream('));
  it('asks the conversation model, with the conversation turn\'s own thinking', () => {
    expect(probe).toMatch(/model: this\.conversationModel,/);
    expect(probe).toMatch(/thinkingBudget: this\.conversationThinkingBudget\(\)/);
    expect(probe).not.toMatch(/model: this\.model,\s*contents/);
  });
  it('still reports the same fields to /health, the reports model among them', () => {
    expect(probe).toMatch(/return \{ ok, latencyMs: Date\.now\(\) - started, model: this\.model, models: this\.modelsInUse\(\), lastRebuildAt: this\.lastRebuildAt \}/);
  });
});
