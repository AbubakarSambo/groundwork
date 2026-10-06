/**
 * HOW STEADY PATTERNS ARE, AS A SHARE (6 October). Read-only.
 *
 * DEFINITION. Run the same scenario more than once. For one run A and another run B: of the patterns found in A
 * (a pattern is a code for one person, in the scenario's last session), the share that was also found in B for the
 * same person. Steadiness is the average of that share over every ordered pair of runs, A against B and B against A.
 * 100% means every pattern found once was found every time; 80% means four in five were.
 *
 * It is a different question from `pattern-steadiness.ts` (Jaccard, which counts a pattern found only in one run twice
 * over, once for each side of the union). This one is "if I was shown this, would I have been shown it on the other
 * day". People are matched by the part of their throwaway email before the first ".", the scenario's own key.
 *
 * Usage (from api/):  npx ts-node -T -P tsconfig.json journey/pattern-steadiness-share.ts <runFolder> <runFolder> [<runFolder> ...]
 * Every folder holds `<scenario>.json` files from journey/all-24/run.ts. Only scenarios in every folder are compared.
 */
import * as fs from 'fs';
import { personKeyFrom, finalPatternSet } from './pattern-steadiness';

export function theShareOfAFoundInB(a: Set<string>, b: Set<string>): number | null {
  if (a.size === 0) return null;
  let both = 0;
  for (const x of a) if (b.has(x)) both++;
  return both / a.size;
}

export interface AScenarioSteadiness { scenario: string; runs: number; steadiness: number | null; foundPerRun: number[]; flips: { pair: string; inRuns: number }[] }

export function steadinessOf(scenario: string, sets: Set<string>[]): AScenarioSteadiness {
  const shares: number[] = [];
  for (let i = 0; i < sets.length; i++) for (let j = 0; j < sets.length; j++) {
    if (i === j) continue;
    const s = theShareOfAFoundInB(sets[i], sets[j]);
    if (s !== null) shares.push(s);
  }
  const union = new Set<string>(); sets.forEach((s) => s.forEach((x) => union.add(x)));
  const flips = [...union].map((pair) => ({ pair, inRuns: sets.filter((s) => s.has(pair)).length })).filter((f) => f.inRuns < sets.length).sort((x, y) => x.inRuns - y.inRuns || x.pair.localeCompare(y.pair));
  return { scenario, runs: sets.length, steadiness: shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null, foundPerRun: sets.map((s) => s.size), flips };
}

if (require.main === module) {
  const folders = process.argv.slice(2);
  if (folders.length < 2) { console.error('Give at least two run folders.'); process.exit(1); }
  const files = folders.map((f) => new Set(fs.readdirSync(f).filter((x) => x.endsWith('.json'))));
  const common = [...files[0]].filter((x) => files.every((s) => s.has(x))).sort();
  const rows: AScenarioSteadiness[] = [];
  for (const file of common) {
    const sets = folders.map((f) => finalPatternSet(JSON.parse(fs.readFileSync(`${f}/${file}`, 'utf8'))));
    rows.push(steadinessOf(file.replace(/\.json$/, ''), sets));
  }
  const pct = (n: number | null) => (n === null ? 'nothing found' : `${Math.round(n * 100)}%`);
  for (const r of rows) {
    console.log(`${r.scenario}: ${pct(r.steadiness)} over ${r.runs} runs; found per run ${r.foundPerRun.join(', ')}.`);
    for (const f of r.flips) console.log(`    ${f.pair.replace('::', ' ')} in ${f.inRuns} of ${r.runs} runs`);
  }
  const counted = rows.filter((r) => r.steadiness !== null);
  /* Weighted by what was found, so a scenario with one pattern does not count as much as one with sixteen. */
  const weight = (r: AScenarioSteadiness) => r.foundPerRun.reduce((a, b) => a + b, 0);
  const weighted = counted.reduce((a, r) => a + (r.steadiness as number) * weight(r), 0) / Math.max(1, counted.reduce((a, r) => a + weight(r), 0));
  const plain = counted.reduce((a, r) => a + (r.steadiness as number), 0) / Math.max(1, counted.length);
  console.log(`\nOverall: ${pct(weighted)} weighted by patterns found, ${pct(plain)} as a plain average of the ${counted.length} scenarios.`);
}
