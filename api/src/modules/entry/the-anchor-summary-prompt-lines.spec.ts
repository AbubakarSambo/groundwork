import * as fs from 'fs';
import * as path from 'path';
import { THE_EXTRACTION_SYSTEM } from './the-anchor-setup';

/* Decision 121, item 1: the three approved lines for the anchor's set-up summary. */
describe('the anchor’s set-up summary prompt (decision 121, item 1)', () => {
  it('turns "we", "us" and "our" about the business into "the business" or "your team", never "you"', () => {
    expect(THE_EXTRACTION_SYSTEM).toContain('Where the lead wrote "we", "us" or "our" about the business or the team, write "the business" or "your team", never "you"');
    expect(THE_EXTRACTION_SYSTEM).toContain('"keep us profitable" becomes "keeping the business profitable"');
  });

  it('never writes what the team does as if the lead did it', () => {
    expect(THE_EXTRACTION_SYSTEM).toContain('Never write what the team does as if the lead did it');
    expect(THE_EXTRACTION_SYSTEM).toContain('You would notice people checking orders and following up payments');
  });

  it('makes each item sensible on its own', () => {
    expect(THE_EXTRACTION_SYSTEM).toContain('Each item must make sense when read on its own, so never begin one with "By then", "Then", "So" or "Because"');
  });

  it('is code only: nothing stores it as a PromptVersion, and the read is handed this exact text on both calls', () => {
    const src = (f: string) => fs.readFileSync(path.join(__dirname, f), 'utf8');
    const service = src('entry.service.ts');
    expect(service.match(/\.extract<[^>]*(?:<[^>]*>)?[^>]*>\(THE_EXTRACTION_SYSTEM,/g)?.length ?? service.split('(THE_EXTRACTION_SYSTEM,').length - 1).toBeGreaterThanOrEqual(2);
    const everywhere = fs.readdirSync(path.join(__dirname, '..', '..'), { recursive: true } as any) as string[];
    const readers = everywhere.filter((f) => /\.ts$/.test(f) && !/spec\.ts$/.test(f)).filter((f) => /PromptVersion|promptVersion/.test(fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8')) && /THE_EXTRACTION_SYSTEM/.test(fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8')));
    expect(readers.map((f) => f.replace(/\\/g, '/'))).toEqual(['modules/entry/entry.service.ts']);
    /* In that file the constant is used only as the first argument of extract, never looked up by key. */
    expect(service).not.toMatch(/prompts\.[a-zA-Z]+\([^)]*THE_EXTRACTION_SYSTEM/);
  });
});
