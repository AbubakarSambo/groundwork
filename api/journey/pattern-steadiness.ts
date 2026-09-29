/**
 * HOW STEADY PATTERNS ARE ACROSS RUNS (decision 57, item 4: "The scenario runs check that the same
 * scenario gives the same patterns each time, and report how steady they are.")
 *
 * Read-only. Takes two or more run folders that each hold the SAME set of scenarios - for example
 * `journey/all-24/goals-1` and `journey/all-24/goals-2`, two separate runs of the four goals
 * scenarios - and, for every scenario the runs have in common, compares the set of (person, code)
 * patterns each run ended with. A pattern is "the same" across runs when it is the same code, about
 * the same person, in the same scenario; nothing about wording or observation text is compared,
 * because those can vary in phrasing between two calls to the model while still being the same
 * finding.
 *
 * WHY THE LAST SESSION. `sessions[].patterns` in a scenario's JSON is written cumulatively - each
 * session's list is every pattern seen so far, not just what that session added - so the last
 * session in the file is the scenario's final state, which is what "the same scenario gives the
 * same patterns" means.
 *
 * WHY PERSON, NOT EMAIL. Every run's people get a fresh throwaway email
 * (`mgr.<timestamp>@pip.test`), so raw emails never match between two runs of the same scenario.
 * The leading token before the first "." is the person's stable key in the scenario definition
 * itself (`mgr`, `nathan`, `femi`, ...), and that is what is compared.
 *
 * Usage (from api/):  npx ts-node -T journey/pattern-steadiness.ts all-24/goals-1 all-24/goals-2
 *                     npx ts-node -T journey/pattern-steadiness.ts all-24/card3-1 all-24/card3-2
 * Run folders may be given as paths relative to api/journey/, or as absolute/relative paths.
 */
import * as fs from 'fs';
import * as path from 'path';

interface APatternRow {
  code: string;
  status?: string;
  participant?: { email?: string | null } | null;
}
interface ASession {
  session: number;
  patterns?: APatternRow[];
}
interface AScenarioRun {
  scenario?: string;
  sessions: ASession[];
}

/** The scenario's stable person key: the leading token of the throwaway email, before the run's timestamp. */
export function personKeyFrom(email: string | null | undefined): string {
  const local = (email ?? '').split('@')[0];
  return local.split('.')[0] || local || 'unknown';
}

/** The final, cumulative set of (person, code) this run ended the scenario with. */
export function finalPatternSet(run: AScenarioRun): Set<string> {
  const sessions = run.sessions ?? [];
  const last = sessions[sessions.length - 1];
  const rows = last?.patterns ?? [];
  return new Set(rows.map((r) => `${personKeyFrom(r.participant?.email)}::${r.code}`));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

function resolveRunFolder(arg: string): string {
  if (fs.existsSync(arg)) return arg;
  const underJourney = path.join(__dirname, arg);
  if (fs.existsSync(underJourney)) return underJourney;
  throw new Error(`Cannot find run folder "${arg}" (looked at it directly, and under ${__dirname}).`);
}

function scenarioFilesIn(folder: string): string[] {
  return fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

function asPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: ts-node -T journey/pattern-steadiness.ts <run-folder> <run-folder> [more run folders...]');
    process.exit(1);
  }
  const folders = args.map(resolveRunFolder);
  const names = args;

  // Only scenarios present in every run folder given.
  const fileSets = folders.map((f) => new Set(scenarioFilesIn(f)));
  const common = [...fileSets[0]].filter((f) => fileSets.every((s) => s.has(f))).sort();

  if (common.length === 0) {
    console.log('These run folders have no scenario in common; nothing to compare.');
    return;
  }

  console.log(`Comparing ${folders.length} runs (${names.join(', ')}) on ${common.length} shared scenario${common.length === 1 ? '' : 's'}: ${common.map((f) => f.replace(/\.json$/, '')).join(', ')}.\n`);

  const perScenarioScores: number[] = [];
  const allUnionCoded = new Set<string>();
  const allIntersectionAcrossRuns = new Set<string>();

  for (const file of common) {
    const scenarioName = file.replace(/\.json$/, '');
    const runs: AScenarioRun[] = folders.map((f) => JSON.parse(fs.readFileSync(path.join(f, file), 'utf8')));
    const sets = runs.map(finalPatternSet);

    // Pairwise Jaccard between every pair of runs for this scenario, then averaged - the plain
    // "how often does the same code for the same person show up in every run" reading.
    const pairScores: number[] = [];
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        pairScores.push(jaccard(sets[i], sets[j]));
      }
    }
    const avg = pairScores.reduce((a, b) => a + b, 0) / Math.max(1, pairScores.length);
    perScenarioScores.push(avg);

    const union = new Set<string>();
    sets.forEach((s) => s.forEach((x) => union.add(x)));
    const inEveryRun = new Set([...union].filter((x) => sets.every((s) => s.has(x))));
    union.forEach((x) => allUnionCoded.add(`${scenarioName}::${x}`));
    inEveryRun.forEach((x) => allIntersectionAcrossRuns.add(`${scenarioName}::${x}`));

    const total = sets.reduce((s, set) => s + set.size, 0) / sets.length;
    console.log(
      `${scenarioName}: found ${avg === 1 ? 'exactly the same patterns' : `the same patterns ${asPercent(avg)} of the time`} across the ${sets.length} runs ` +
      `(on average ${total.toFixed(1)} patterns a run; ${inEveryRun.size} of the codes found showed up in every single run, out of ${union.size} distinct code-and-person findings across all runs).`,
    );
    if (avg < 1) {
      const onlySome = [...union].filter((x) => !inEveryRun.has(x));
      console.log(`  Not steady: ${onlySome.map((x) => x.replace('::', ' ')).join('; ')}.`);
    }
  }

  const overall = perScenarioScores.reduce((a, b) => a + b, 0) / perScenarioScores.length;
  console.log(
    `\nOverall: the same scenario gave the same patterns ${asPercent(overall)} of the time on average across ${common.length} scenario${common.length === 1 ? '' : 's'} ` +
    `and ${folders.length} runs. ${allIntersectionAcrossRuns.size} of ${allUnionCoded.size} distinct code-and-person findings, across every scenario, were seen in every run.`,
  );
}

if (require.main === module) main();
