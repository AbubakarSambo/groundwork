/**
 * ONE CYCLE OF PROMPT SELF-LEARNING, BY HAND, ON A LOCAL DATABASE (6 October 2026).
 * The switch in src/modules/learning/a-prompt-proposal.ts stays off; this tool is the only caller besides the spec, and it
 * is for a person to run.
 *
 *   1. propose  Reads a run's judgements, finds the faults a machine can find, asks the model for up to three rules to ADD,
 *               and stores the result as a DRAFT version (never active) with the evidence in its summary.
 *        MODE=propose RUN=all-24/run-oct6a KEY=the_judgement_room [FAULTS_FILE=extra.json] DATABASE_URL=<local> \
 *          GEMINI_LOCATION=global npx ts-node -T -P tsconfig.json journey/self-learning-one-cycle.ts
 *   2. (by hand) Make the draft active in the LOCAL database only, run the same scenarios again into a new folder.
 *   3. decide   Scores the two folders with the scorer, counts the faults again with the same finder, and keeps or
 *               discards the draft by the numbers (theNumbersDecide). The verdict is written into the draft's summary.
 *               A kept draft is still a draft.
 *        MODE=decide BEFORE=all-24/run-oct6a AFTER=all-24/run-oct6b DRAFT=<version id> DATABASE_URL=<local> \
 *          npx ts-node -T -P tsconfig.json journey/self-learning-one-cycle.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { AnthropicService } from '../src/modules/conversation';
import { theProposalToMake, THE_PROPOSAL_TOOL, theNumbersDecide, AFault, TheNumbers } from '../src/modules/learning/a-prompt-proposal';
import { theFaultsInAJudgement } from '../src/modules/learning/the-faults-in-a-judgement';

const here = (p: string) => (fs.existsSync(p) ? p : path.join(__dirname, p));

function judgementsOf(folder: string): { scenario: string; judgement: any }[] {
  const dir = here(folder);
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const last = d.sessions?.[d.sessions.length - 1];
    return { scenario: f.replace(/\.json$/, ''), judgement: last?.leadReport?.theJudgement ?? null };
  });
}

export function faultsInARun(folder: string): AFault[] {
  return judgementsOf(folder).flatMap((r) => theFaultsInAJudgement(r.judgement, r.scenario));
}

function scoreOf(folder: string): { problems: Record<string, number>; engine_value: Record<string, number> } {
  const out = path.join(process.env.TMPDIR ?? '/tmp', `score-${path.basename(folder)}-${Date.now()}.json`);
  const root = path.join(__dirname, '..', '..');
  try { execFileSync('python3', [path.join(root, 'tools', 'score_run.py'), here(folder), '--save', out], { stdio: ['ignore', 'ignore', 'inherit'] }); } catch { /* it exits 0 without the comparison */ }
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

async function propose() {
  const key = process.env.KEY!; const run = process.env.RUN!;
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService); const model = app.get(AnthropicService);
  const active = await prisma.promptVersion.findFirst({ where: { key, isActive: true } });
  if (!active) throw new Error(`No active version of ${key}.`);
  const faults = [...faultsInARun(run), ...(process.env.FAULTS_FILE ? JSON.parse(fs.readFileSync(process.env.FAULTS_FILE, 'utf8')) : [])] as AFault[];
  console.log(`${faults.length} fault(s) found in ${run}; the active version of ${key} is ${active.version} (${active.id}).`);
  const out = await theProposalToMake(true, {
    askForRules: (instruction) => model.extract(instruction, [{ role: 'user', content: 'Propose the rules to add.' }], THE_PROPOSAL_TOOL as any, { patient: true }),
  }, { key, current: active.content, faults, evidenceFrom: run });
  if (!out.made) { console.log('No proposal made:', out.why); await app.close(); return; }
  const latest = await prisma.promptVersion.findFirst({ where: { key }, orderBy: { version: 'desc' } });
  const draft = await prisma.promptVersion.create({ data: { key, version: (latest?.version ?? 0) + 1, content: out.proposal.newContent, summary: out.proposal.summary, isActive: false, isDraft: true } });
  console.log(`Draft stored: ${key} version ${draft.version}, id ${draft.id}. Not active.`);
  out.proposal.rules.forEach((r, i) => console.log(`\nRule ${i + 1} (meant to stop fault(s) ${r.stops.join(', ') || 'none named'}):\n${r.text}`));
  out.refused.forEach((r) => console.log(`\nRefused: ${r.text}\n  because ${r.why}`));
  await app.close();
}

async function decide() {
  const before = scoreOf(process.env.BEFORE!); const after = scoreOf(process.env.AFTER!);
  const asNumbers = (s: typeof before, run: string): TheNumbers => ({ problems: s.problems, value: s.engine_value, theFaultsItWasFor: faultsInARun(run).length });
  const b = asNumbers(before, process.env.BEFORE!); const a = asNumbers(after, process.env.AFTER!);
  const verdict = theNumbersDecide(b, a);
  console.log(JSON.stringify({ before: b, after: a, verdict }, null, 1));
  if (process.env.DRAFT) {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
    const prisma = app.get(PrismaService);
    const d = await prisma.promptVersion.findUnique({ where: { id: process.env.DRAFT } });
    if (!d) throw new Error('No such draft.');
    const line = `${verdict.kept ? 'KEPT BY THE NUMBERS' : 'DISCARDED BY THE NUMBERS'} (${process.env.BEFORE} against ${process.env.AFTER}): ${verdict.reasons.join(' ')} Still a draft: only a person activates it.`;
    await prisma.promptVersion.update({ where: { id: d.id }, data: { summary: `${d.summary ?? ''} ${line}`.trim(), isActive: false, isDraft: true } });
    await app.close();
  }
}

if (require.main === module) {
  (process.env.MODE === 'decide' ? decide() : propose()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
