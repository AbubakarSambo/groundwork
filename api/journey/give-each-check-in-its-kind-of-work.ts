/**
 * GIVE EACH EXISTING CHECK-IN ITS KIND OF WORK (decision 91, item 1).
 *
 * A check-in made before the kinds of work existed has none, so it would be drawn from its situation's family
 * alone. Decision 91 says existing check-ins move to the new boards: each one is given the kind of work that fits it.
 *
 * It uses the one reading a new check-in gets at setup, never a second one: the same prompt
 * (THE_KIND_OF_WORK_PROMPT), the same words (theSetupWords: what the lead called it, said about it, and is working
 * toward), the same check on the answer (oneOfTheKinds: exactly one of the eleven, or nothing). The setup reading
 * runs from the file's prompt, not from a PromptVersion, so this does too. The model is asked with no randomness
 * (temperature 0 and a fixed seed), and every answer is kept in a cache file keyed by the prompt and the words, so
 * running it again costs nothing and gives the same answer.
 *
 * What it writes: only `kindOfWork`, and `kindOfWorkSetBy` = "read" beside it (so a lead can still change it, and a
 * later read may still update it, exactly as for a kind read at setup). It never touches people's words, schedules,
 * sessions, status, reports or boards, and it never reopens, restarts, stalls or emails anything (decision 54).
 *
 * Which check-ins it looks at: those with no kind that the lead did not choose. One that already has a kind keeps
 * it. One it cannot place confidently gets no kind, keeps the board its situation's family gives it, and is listed.
 *
 * Kinds that are hidden at release (release.boardKindsOffered) may still be given here: decision 91 says existing
 * check-ins move to the new boards, whatever is offered to new ones. docs/deploy.md, "Hidden at release", says so.
 *
 * ON A DATABASE ON THIS MACHINE (localhost, 127.0.0.1 or [::1]), a dry run by default:
 *
 *   DATABASE_URL=postgresql://localhost/gw_... npx ts-node -T journey/give-each-check-in-its-kind-of-work.ts
 *   DATABASE_URL=postgresql://localhost/gw_... npx ts-node -T journey/give-each-check-in-its-kind-of-work.ts --write
 *
 * Add --check-in <id> to read one check-in only, --list-all to print every check-in left without a kind, and
 * --cache <file> to keep the answers somewhere else (the default is journey/.kind-of-work-answers.json).
 *
 * ON A HOSTED DATABASE, only whoever runs the release, with their explicit confirmation, as for the other release
 * scripts: --hosted-database alone is a dry run; --hosted-database --write prints the same, then asks for the
 * database's host name to be typed back and writes only when it matches exactly. No keyboard writes nothing.
 * Without --hosted-database it refuses any database that is not on this machine.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { hostOf, isOnThisMachine, theTypedHostMatches } from './stamp-said-word-for-word';
import { THE_KIND_OF_WORK_PROMPT, THE_KIND_OF_WORK_SCHEMA, oneOfTheKinds, theSetupWords, type KindOfWork } from '../src/modules/board/the-kind-of-work';

export type WhatMayHappen =
  | { refused: true; why: string }
  | { refused: false; host: string; hosted: boolean; writes: boolean; mustTypeTheHostBack: boolean };

/** From the address and the flags alone. A dry run unless --write is given, here and on a hosted database. */
export function whatThisRunMayDo(url: string, args: readonly string[]): WhatMayHappen {
  const host = hostOf(url);
  if (!host) return { refused: true, why: 'DATABASE_URL is not a Postgres address, so nothing was read or written.' };
  const flag = (f: string) => args.includes(f);
  const writes = flag('--write') && !flag('--dry-run');
  if (isOnThisMachine(url)) return { refused: false, host, hosted: false, writes, mustTypeTheHostBack: false };
  if (!flag('--hosted-database')) {
    return { refused: true, why: `DATABASE_URL points to ${host}, which is not on this machine. This script runs on a hosted database only when whoever runs the release adds --hosted-database. Nothing was read or written.` };
  }
  return { refused: false, host, hosted: true, writes, mustTypeTheHostBack: writes };
}

export interface AKindToGive { groundId: string; label: string; kind: KindOfWork }
export interface ALeftWithoutOne { groundId: string; label: string; why: string }
export interface WhatWouldChange {
  checkIns: number;
  /** Check-ins that already had a kind, or whose kind the lead chose. Not touched. */
  alreadyHad: number;
  toGive: AKindToGive[];
  left: ALeftWithoutOne[];
}

/** Asks the one reading. Returns the model's raw answer for the words, or throws when the model cannot be reached. */
export type ReadTheKind = (words: string) => Promise<string | null | undefined>;

export const NO_WORDS = 'The lead wrote nothing at setup to read a kind of work from.';
export const NOT_CLEAR = 'What the lead said at setup does not clearly say one of the eleven kinds of work.';
export const NO_DESCRIPTION = 'The lead gave only a name, and no description of the work, which is too little to read a kind of work from.';
export const THE_SITUATION_DECIDES = 'It is about somebody starting a role, and that board comes from the situation, not from a kind of work.';
export const COULD_NOT_READ = 'The model could not be reached for this one, so it was not read. Run the script again to read it.';

/** The situations whose board is chosen by the situation itself (docs/deploy.md, "Hidden at release", item 1). */
export const ONBOARDING_SITUATIONS = ['NEW_HIRE', 'NEW_MANAGER', 'NEW_ADVISOR', 'NEW_COFOUNDER'];

/** Reads only. What the one reading says for every check-in that has no kind (or the one asked for). */
export async function whatWouldChange(prisma: any, read: ReadTheKind, onlyCheckIn: string | null = null, concurrency = 1): Promise<WhatWouldChange> {
  const grounds = await prisma.ground.findMany({
    where: onlyCheckIn ? { id: onlyCheckIn } : {},
    select: { id: true, label: true, scenario: true, brief: true, endState: true, resolutionState: true, kindOfWork: true, kindOfWorkSetBy: true },
    orderBy: { id: 'asc' },
  });
  const out: WhatWouldChange = { checkIns: grounds.length, alreadyHad: 0, toGive: [], left: [] };
  const toRead: { g: any; label: string; words: string }[] = [];
  const answers = new Map<string, { answer?: string | null; failed?: boolean }>();
  for (const g of grounds as any[]) {
    const label = (g.label ?? '').trim() || 'A check-in';
    if (g.kindOfWorkSetBy === 'lead' || oneOfTheKinds(g.kindOfWork)) { out.alreadyHad++; continue; }
    if (ONBOARDING_SITUATIONS.includes(g.scenario)) continue;
    if (!((g.brief ?? '').trim() || (g.endState ?? '').trim())) continue;
    const words = theSetupWords(g);
    if (words.trim()) toRead.push({ g, label, words });
  }
  /* Asked a few at a time; the answers are put back in the check-ins' own order, so the result does not depend on it. */
  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (next < toRead.length) {
      const item = toRead[next++];
      try { answers.set(item.g.id, { answer: await read(item.words) }); } catch { answers.set(item.g.id, { failed: true }); }
    }
  }));
  for (const g of grounds as any[]) {
    const label = (g.label ?? '').trim() || 'A check-in';
    if (g.kindOfWorkSetBy === 'lead' || oneOfTheKinds(g.kindOfWork)) continue;
    const got = answers.get(g.id);
    if (ONBOARDING_SITUATIONS.includes(g.scenario)) { out.left.push({ groundId: g.id, label, why: THE_SITUATION_DECIDES }); continue; }
    if (!got) { out.left.push({ groundId: g.id, label, why: ((g.label ?? '').trim() || (g.brief ?? '').trim() || (g.endState ?? '').trim()) ? NO_DESCRIPTION : NO_WORDS }); continue; }
    if (got.failed) { out.left.push({ groundId: g.id, label, why: COULD_NOT_READ }); continue; }
    const kind = oneOfTheKinds(got.answer);
    if (kind) out.toGive.push({ groundId: g.id, label, kind });
    else out.left.push({ groundId: g.id, label, why: NOT_CLEAR });
  }
  return out;
}

/** Writes the kind field and nothing else. A check-in that has gained a kind since the read is left alone. */
export async function writeTheKinds(prisma: any, plan: WhatWouldChange): Promise<number> {
  let n = 0;
  for (const c of plan.toGive) {
    const r = await prisma.ground.updateMany({
      /* Not `NOT: { kindOfWorkSetBy: 'lead' }`: in SQL that leaves out every row where it is empty. */
      where: { id: c.groundId, kindOfWork: null, OR: [{ kindOfWorkSetBy: null }, { kindOfWorkSetBy: { not: 'lead' } }] },
      data: { kindOfWork: c.kind, kindOfWorkSetBy: 'read' },
    });
    n += r?.count ?? 0;
  }
  return n;
}

/** The answer kept for these words under this prompt, so a rerun asks nobody and gets the same answer. */
export function theCacheKey(words: string): string {
  return crypto.createHash('sha256').update(THE_KIND_OF_WORK_PROMPT).update('\n--\n').update(words).digest('hex');
}

/** Wraps a reading so an answer is asked for once. `store` is the cache's contents; `save` is called after a new answer. */
export function remembered(read: ReadTheKind, store: Record<string, string>, save: () => void): ReadTheKind {
  return async (words) => {
    const key = theCacheKey(words);
    if (key in store) return store[key];
    const answer = await read(words);
    store[key] = typeof answer === 'string' ? answer : 'none';
    save();
    return store[key];
  };
}

export function whatWouldChangeSays(plan: WhatWouldChange, listAll = false): string[] {
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const byKind = new Map<string, number>();
  for (const c of plan.toGive) byKind.set(c.kind, (byKind.get(c.kind) ?? 0) + 1);
  const lines = [
    `${count(plan.checkIns, 'check-in was', 'check-ins were')} read. ${count(plan.alreadyHad, 'already has', 'already have')} a kind of work and ${plan.alreadyHad === 1 ? 'is' : 'are'} left as ${plan.alreadyHad === 1 ? 'it is' : 'they are'}.`,
    plan.toGive.length === 0 ? 'No check-in would be given a kind of work.' : `${count(plan.toGive.length, 'check-in would be', 'check-ins would be')} given a kind of work:`,
    ...[...byKind.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${k}: ${n}`),
  ];
  if (plan.left.length) {
    lines.push(`${count(plan.left.length, 'check-in', 'check-ins')} cannot be placed confidently, so ${plan.left.length === 1 ? 'it gets' : 'they get'} no kind and keep${plan.left.length === 1 ? 's' : ''} the board the situation gives.`);
    const reasons = new Map<string, number>();
    for (const l of plan.left) reasons.set(l.why, (reasons.get(l.why) ?? 0) + 1);
    for (const [why, n] of reasons) lines.push(`  ${n}: ${why}`);
    for (const l of listAll ? plan.left : plan.left.slice(0, 40)) lines.push(`  ${l.groundId}  ${l.label}`);
    if (!listAll && plan.left.length > 40) lines.push(`  ... and ${plan.left.length - 40} more. Add --list-all to print them all.`);
  }
  return lines;
}

/** How many are asked at once: --concurrency <n>, six by default. */
export function theConcurrency(args: readonly string[]): number {
  const at = args.indexOf('--concurrency');
  const n = at >= 0 ? parseInt(args[at + 1] ?? '', 10) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= 32 ? n : 6;
}

/** The whole run, with the database, the reading and the question handed in, so a test can run it with none of them. */
export async function run(opts: {
  url: string;
  args: readonly string[];
  prismaFor: (url: string) => any;
  readFor: () => ReadTheKind;
  ask: (question: string) => Promise<string | null>;
  say: (line: string) => void;
}): Promise<{ wrote: boolean; refused: string | null; written: number }> {
  const may = whatThisRunMayDo(opts.url, opts.args);
  if (may.refused) { opts.say(may.why); return { wrote: false, refused: may.why, written: 0 }; }
  const at = opts.args.indexOf('--check-in');
  const only = at >= 0 ? (opts.args[at + 1] ?? null) : null;
  const prisma = opts.prismaFor(opts.url);
  try {
    const plan = await whatWouldChange(prisma, opts.readFor(), only, theConcurrency(opts.args));
    for (const line of whatWouldChangeSays(plan, opts.args.includes('--list-all'))) opts.say(line);
    if (!may.writes) { opts.say('This was a dry run. Nothing was written.'); return { wrote: false, refused: null, written: 0 }; }
    if (may.mustTypeTheHostBack) {
      const typed = await opts.ask(`To write these kinds of work to the database at ${may.host}, type its host name exactly: `);
      if (!theTypedHostMatches(typed, may.host)) {
        const why = 'The host name typed back did not match the database, so nothing was written.';
        opts.say(why);
        return { wrote: false, refused: why, written: 0 };
      }
    }
    const written = await writeTheKinds(prisma, plan);
    opts.say(`${written} ${written === 1 ? 'kind of work was' : 'kinds of work were'} written.`);
    return { wrote: true, refused: null, written };
  } finally {
    await prisma?.$disconnect?.();
  }
}

function askOnTheKeyboard(question: string): Promise<string | null> {
  if (!process.stdin.isTTY) return Promise.resolve(null);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const cacheAt = args.indexOf('--cache');
  const cacheFile = path.resolve(cacheAt >= 0 && args[cacheAt + 1] ? args[cacheAt + 1] : path.join(__dirname, '.kind-of-work-answers.json'));
  run({
    url: process.env.DATABASE_URL ?? '',
    args,
    prismaFor: (url) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient } = require('@prisma/client');
      return new PrismaClient({ datasources: { db: { url } } });
    },
    readFor: () => {
      const store: Record<string, string> = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ConfigService } = require('@nestjs/config');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AnthropicService } = require('../src/modules/conversation/anthropic.service');
      const model = new AnthropicService(new ConfigService({ gemini: {
        projectId: process.env.GEMINI_PROJECT_ID, location: process.env.GEMINI_LOCATION, model: process.env.GEMINI_MODEL,
        conversationModel: process.env.GEMINI_CONVERSATION_MODEL, maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192', 10),
      } }));
      return remembered(async (words) => {
        const answer = await model.extract(THE_KIND_OF_WORK_PROMPT, [{ role: 'user', content: words }], THE_KIND_OF_WORK_SCHEMA, { temperature: 0, seed: 7 });
        return (answer as { kind?: string } | null)?.kind ?? 'none';
      }, store, () => fs.writeFileSync(cacheFile, JSON.stringify(store, null, 1)));
    },
    ask: askOnTheKeyboard,
    say: (line) => console.log(line),
  })
    .then((r) => process.exit(r.refused ? 1 : 0))
    .catch((err) => { console.error(err?.message ?? err); process.exit(2); });
}
