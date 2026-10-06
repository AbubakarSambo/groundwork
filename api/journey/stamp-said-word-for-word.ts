/**
 * STAMP THE RECORD LINES ALREADY WRITTEN: WHICH ARE THE PERSON'S OWN WORDS.
 *
 * `RecordEntry.saidWordForWord` is stamped when a line is written (conversation.service,
 * extractRecordEntries). Lines written before the column existed are all false, so no report could
 * quote any of them. This stamps them the same way, from the same rule (saidWordForWord in
 * reports/a-quote-is-what-they-said): true only where the line is an unbroken passage of what that
 * person typed in that check-in. It reads the person's own turns, which is why it lives here and not
 * in a report read. A line with no check-in stays false. It changes no words, only the mark.
 *
 * ON A DATABASE ON THIS MACHINE (localhost, 127.0.0.1 or [::1]) it runs and writes, as it always has:
 *
 *   DATABASE_URL=postgresql://localhost/gw_pw9_1786222102 npx ts-node -T journey/stamp-said-word-for-word.ts
 *
 * Add --dry-run to only print what would change.
 *
 * ON A HOSTED DATABASE (decision 74, item 5), only whoever runs the release runs it, and only like this:
 *
 *   1. With --hosted-database, and nothing else, it is a dry run. It reads, prints how many record
 *      lines and commitments would change, and writes nothing.
 *   2. With --hosted-database --write, it prints the same, then asks for the database's host name to
 *      be typed back. Only when the typed name is exactly the host in DATABASE_URL does it write. A
 *      different name, an empty answer, or no keyboard to answer from (a pipe or a scheduled job)
 *      writes nothing.
 *   Without --hosted-database it refuses any database that is not on this machine.
 *
 * The engine work never runs it on anything but a local gw_ database.
 */
import * as readline from 'readline';
import { saidWordForWord } from '../src/modules/reports/a-quote-is-what-they-said';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** The host name in a Postgres address, or null when it is not one. */
export function hostOf(url: string): string | null {
  if (!/^postgres(ql)?:\/\//.test(url ?? '')) return null;
  try {
    const host = new URL(url).hostname;
    return host ? host.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isOnThisMachine(url: string): boolean {
  const host = hostOf(url);
  return !!host && LOCAL_HOSTS.has(host);
}

export type WhatMayHappen =
  | { refused: true; why: string }
  | { refused: false; host: string; hosted: boolean; writes: boolean; mustTypeTheHostBack: boolean };

/**
 * WHAT THIS RUN MAY DO, FROM THE ADDRESS AND THE FLAGS ALONE. Pure, so the guard is tested without a
 * database. Writing to a hosted database also needs the host typed back: see `theTypedHostMatches`.
 */
export function whatThisRunMayDo(url: string, args: readonly string[]): WhatMayHappen {
  const host = hostOf(url);
  if (!host) return { refused: true, why: 'DATABASE_URL is not a Postgres address, so nothing was read or written.' };
  const flag = (f: string) => args.includes(f);
  if (LOCAL_HOSTS.has(host)) {
    return { refused: false, host, hosted: false, writes: !flag('--dry-run'), mustTypeTheHostBack: false };
  }
  if (!flag('--hosted-database')) {
    return {
      refused: true,
      why: `DATABASE_URL points to ${host}, which is not on this machine. This script runs on a hosted database only when whoever runs the release adds --hosted-database. Nothing was read or written.`,
    };
  }
  const writes = flag('--write') && !flag('--dry-run');
  return { refused: false, host, hosted: true, writes, mustTypeTheHostBack: writes };
}

/** The typed answer must be the host itself, nothing more or less, ignoring case and spaces around it. */
export function theTypedHostMatches(typed: string | null | undefined, host: string): boolean {
  const t = (typed ?? '').trim().toLowerCase();
  return !!t && t === host.toLowerCase();
}

export interface WhatWouldChange {
  lines: { toTrue: string[]; toFalse: string[]; theirs: number; notTheirs: number };
  commitments: { id: string; saidWordForWord: boolean; whenSaidWordForWord: boolean; changes: boolean }[];
}

/** Reads only. Works out every mark, and which of them would change. */
export async function whatWouldChange(prisma: any): Promise<WhatWouldChange> {
  const out: WhatWouldChange = { lines: { toTrue: [], toFalse: [], theirs: 0, notTheirs: 0 }, commitments: [] };
  const checkIns = await prisma.recordEntry.findMany({ where: { checkInId: { not: null } }, distinct: ['checkInId'], select: { checkInId: true } });
  for (const { checkInId } of checkIns) {
    const typed = (await prisma.conversationTurn.findMany({ where: { checkInId: checkInId!, role: 'PERSON' }, select: { content: true } })).map((t: any) => t.content);
    const lines = await prisma.recordEntry.findMany({ where: { checkInId: checkInId! }, select: { id: true, text: true, saidWordForWord: true } });
    for (const l of lines) {
      const theirs = saidWordForWord(l.text, typed);
      if (theirs) out.lines.theirs += 1; else out.lines.notTheirs += 1;
      if (theirs && !l.saidWordForWord) out.lines.toTrue.push(l.id);
      if (!theirs && l.saidWordForWord) out.lines.toFalse.push(l.id);
    }
  }
  const promises = await prisma.groundCommitment.findMany({
    where: { source: 'CHECK_IN', statedInSession: { not: null }, participantId: { not: null } },
    select: { id: true, text: true, whenSaid: true, participantId: true, statedInSession: true, saidWordForWord: true, whenSaidWordForWord: true },
  });
  for (const c of promises) {
    const typed = (await prisma.conversationTurn.findMany({
      where: { role: 'PERSON', checkIn: { participantId: c.participantId!, sessionNumber: c.statedInSession! } },
      select: { content: true },
    })).map((t: any) => t.content);
    const theirs = saidWordForWord(c.text, typed);
    const when = c.whenSaid ? saidWordForWord(c.whenSaid, typed) : false;
    out.commitments.push({ id: c.id, saidWordForWord: theirs, whenSaidWordForWord: when, changes: theirs !== !!c.saidWordForWord || when !== !!c.whenSaidWordForWord });
  }
  return out;
}

/** Writes only the marks that change. */
export async function writeTheMarks(prisma: any, plan: WhatWouldChange): Promise<void> {
  if (plan.lines.toTrue.length) await prisma.recordEntry.updateMany({ where: { id: { in: plan.lines.toTrue } }, data: { saidWordForWord: true } });
  if (plan.lines.toFalse.length) await prisma.recordEntry.updateMany({ where: { id: { in: plan.lines.toFalse } }, data: { saidWordForWord: false } });
  for (const c of plan.commitments.filter((x) => x.changes)) {
    await prisma.groundCommitment.update({ where: { id: c.id }, data: { saidWordForWord: c.saidWordForWord, whenSaidWordForWord: c.whenSaidWordForWord } });
  }
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function whatWouldChangeSays(plan: WhatWouldChange): string[] {
  const read = plan.lines.theirs + plan.lines.notTheirs;
  const changing = plan.commitments.filter((c) => c.changes).length;
  return [
    `${count(read, 'record line was', 'record lines were')} read. ${count(plan.lines.theirs, 'is', 'are')} the person's own words, and ${count(plan.lines.notTheirs, 'is', 'are')} the record reader's version.`,
    `${count(plan.lines.toTrue.length, 'record line', 'record lines')} would be marked as the person's own words, and ${count(plan.lines.toFalse.length, 'record line', 'record lines')} would be marked as not their own words.`,
    `${count(plan.commitments.length, 'commitment was', 'commitments were')} read, and ${count(changing, 'of them would change', 'of them would change')}.`,
  ];
}

/**
 * THE WHOLE RUN, WITH THE DATABASE AND THE QUESTION HANDED IN, so a test can run it with neither.
 * Returns whether anything was written.
 */
export async function run(opts: {
  url: string;
  args: readonly string[];
  prismaFor: (url: string) => any;
  ask: (question: string) => Promise<string | null>;
  say: (line: string) => void;
}): Promise<{ wrote: boolean; refused: string | null }> {
  const may = whatThisRunMayDo(opts.url, opts.args);
  if (may.refused) {
    opts.say(may.why);
    return { wrote: false, refused: may.why };
  }
  const prisma = opts.prismaFor(opts.url);
  try {
    const plan = await whatWouldChange(prisma);
    for (const line of whatWouldChangeSays(plan)) opts.say(line);
    if (!may.writes) {
      opts.say('This was a dry run. Nothing was written.');
      return { wrote: false, refused: null };
    }
    if (may.mustTypeTheHostBack) {
      const typed = await opts.ask(`To write these marks to the database at ${may.host}, type its host name exactly: `);
      if (!theTypedHostMatches(typed, may.host)) {
        const why = 'The host name typed back did not match the database, so nothing was written.';
        opts.say(why);
        return { wrote: false, refused: why };
      }
    }
    await writeTheMarks(prisma, plan);
    opts.say('The marks were written.');
    return { wrote: true, refused: null };
  } finally {
    await prisma?.$disconnect?.();
  }
}

/** Asks on the keyboard. With no keyboard (a pipe or a scheduled job) the answer is nothing. */
function askOnTheKeyboard(question: string): Promise<string | null> {
  if (!process.stdin.isTTY) return Promise.resolve(null);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

if (require.main === module) {
  run({
    url: process.env.DATABASE_URL ?? '',
    args: process.argv.slice(2),
    prismaFor: (url) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient } = require('@prisma/client');
      return new PrismaClient({ datasources: { db: { url } } });
    },
    ask: askOnTheKeyboard,
    say: (line) => console.log(line),
  })
    .then((r) => process.exit(r.refused ? 1 : 0))
    .catch((err) => {
      console.error(err?.message ?? err);
      process.exit(2);
    });
}
