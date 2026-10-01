import * as fs from 'fs';
import * as path from 'path';
import { APPLY_LEARNED_WEIGHTS, theWeightToApply } from './a-suggested-weight';

const SRC = path.join(__dirname, '..', '..');
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]));

describe('the suggested weights are stored and applied by nothing', () => {
  it('the switch is off, in one place', () => {
    expect(APPLY_LEARNED_WEIGHTS).toBe(false);
  });

  it('asking for a weight while it is off gives the neutral one and does not even look', async () => {
    const look = jest.fn().mockResolvedValue(0.5);
    expect(await theWeightToApply(look)).toBe(1);
    expect(look).not.toHaveBeenCalled();
  });

  it('no source file outside the learning folder reads the counts table or asks for a weight', () => {
    const offenders = walk(SRC)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.includes(`${path.sep}learning${path.sep}`))
      .filter((f) => /learningSignalCount|theWeightToApply|suggestedWeight|LearningService/.test(fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')))
      .map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it('inside the learning folder only the service, the plain reader and the switch touch them', () => {
    const dir = __dirname;
    const users = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts')).filter((f) => /theWeightToApply/.test(fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')));
    expect(users).toEqual(['a-suggested-weight.ts']);
  });
});
